// The workout running right now, shared between a profile's devices (fork feature).
//
// The profile document (PUT /api/data) leaves `active` out on purpose: a running session was
// meant to belong to the device running it. Here it gets a store of its own, so a workout started
// on the phone shows up on the laptop and can be carried on there.
//
// One small file per profile, `live-<uid>.json`: { active, unit, at }. `at` is the writer's stamp.
// A device always stamps above the last copy it saw (frontend lib/live-session.js stampAfter), so
// a clock that runs behind still wins with the edit made last. The newest stamp wins: a write
// with a stamp no newer than the stored one is refused with 409 and the stored copy, which the
// device then takes. `active: null` is a finished or discarded workout, and is kept like any other
// copy so the other devices close theirs.
import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from './durable.ts';

// A stamp far in the future would win every write until that time, so anything past a day ahead
// of the server's clock is refused.
const MAX_AHEAD_MS = 24 * 60 * 60 * 1000;

const isMap = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export function liveStore(dataDir) {
  const file = uid => path.join(dataDir, 'live-' + String(uid).replace(/[^a-zA-Z0-9_-]/g, '') + '.json');
  const read = uid => {
    try {
      const doc = JSON.parse(fs.readFileSync(file(uid), 'utf8'));
      if (isMap(doc)) return { active: isMap(doc.active) ? doc.active : null, unit: doc.unit === 'lb' ? 'lb' : 'kg', at: Number(doc.at) || 0 };
    } catch { /* none yet, or unreadable: as if none */ }
    return { active: null, unit: 'kg', at: 0 };
  };
  // { status, body } for a PUT. Synchronous from read to rename, so two writes cannot interleave.
  const write = (uid, body, now = Date.now()) => {
    const at = Number(body?.at);
    if (!Number.isFinite(at) || at <= 0) return { status: 400, body: { error: 'at must be a positive number' } };
    if (at > now + MAX_AHEAD_MS) return { status: 400, body: { error: 'at is too far in the future' } };
    const active = body.active === null ? null : body.active;
    if (active !== null && !(isMap(active) && Array.isArray(active.entries))) {
      return { status: 400, body: { error: 'active must be a workout with entries, or null' } };
    }
    const cur = read(uid);
    if (at <= cur.at) return { status: 409, body: cur };
    const next = { active, unit: body.unit === 'lb' ? 'lb' : 'kg', at };
    atomicWrite(file(uid), JSON.stringify(next), 0o600);
    return { status: 200, body: { at } };
  };
  const removeUser = uid => { try { fs.unlinkSync(file(uid)); } catch { /* none */ } };
  return { read, write, removeUser, file };
}

// The two routes, wired to server.js's own session and body helpers.
export function liveSessionRoutes(store, { readSession, json, readBody }: { readSession?: any; json?: any; readBody?: any; [key: string]: any }) {
  return {
    'GET /api/live': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      json(res, 200, store.read(user.id));
    },
    'PUT /api/live': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const body = await readBody(req);
      const { status, body: out } = store.write(user.id, body);
      json(res, status, out);
    },
  };
}
