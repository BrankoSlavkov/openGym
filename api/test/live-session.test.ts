import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { liveStore } from '../live-session.ts';

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'live-test-'));
const W = { id: 'w1', name: 'Push', start: 1, entries: [{ id: 'bench', sets: [] }] };

test('nothing stored reads as no running workout', () => {
  assert.deepEqual(liveStore(dir()).read('u1'), { active: null, unit: 'kg', at: 0 });
});

test('a newer stamp replaces, an older or equal one gets the stored copy back', () => {
  const s = liveStore(dir());
  assert.deepEqual(s.write('u1', { active: W, unit: 'lb', at: 100 }, 1000), { status: 200, body: { at: 100 } });
  assert.deepEqual(s.read('u1'), { active: W, unit: 'lb', at: 100 });
  const late = s.write('u1', { active: null, at: 100 }, 1000)
  assert.equal(late.status, 409);
  assert.deepEqual(late.body, { active: W, unit: 'lb', at: 100 });
  assert.equal(s.write('u1', { active: null, at: 101 }, 1000).status, 200);
  assert.equal(s.read('u1').active, null);
});

test('profiles are kept apart and removed with the account', () => {
  const s = liveStore(dir());
  s.write('u1', { active: W, at: 5 }, 1000);
  assert.equal(s.read('u2').active, null);
  s.removeUser('u1');
  assert.equal(fs.existsSync(s.file('u1')), false);
});

test('malformed writes are refused', () => {
  const s = liveStore(dir());
  assert.equal(s.write('u1', { active: W }, 1000).status, 400);
  assert.equal(s.write('u1', { active: { name: 'x' }, at: 1 }, 1000).status, 400);
  assert.equal(s.write('u1', { active: W, at: 1000 + 2 * 86400000 }, 1000).status, 400);
});
