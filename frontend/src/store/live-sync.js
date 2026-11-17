// Keeps the running workout (`S.active`) the same on every device of a signed-in profile (fork
// feature): start on the phone, carry on from the laptop. The profile sync leaves `active` out on
// purpose (useStore.js restoredStateFor), so this rides on its own route, /api/live
// (api/live-session.js), with its own newest-stamp-wins rule (lib/live-session.js).
//
// A change here goes up shortly after it is made; the server's copy is read every few seconds
// while the app is visible, and on every return to it.
import { api } from '../lib/api.js'
import { inUnitOf } from '../lib/sync-merge.js'
import { decide, stampAfter, sameSession } from '../lib/live-session.js'

const POLL_MS = 8000
const PUSH_MS = 700
const metaKey = uid => 'gym_live_v1:' + uid

export function startLiveSync(store) {
  let uid = null           // the profile being synced; null while signed out
  let meta = { at: 0, dirty: false }
  let seen = null          // JSON of the `active` last looked at, to tell a change here from none
  let pushTm = null, pollTm = null
  let busy = null          // the request in flight, so a pull and a push never cross
  let again = false        // a push asked for while busy
  let off = false          // a server without /api/live (404): nothing to sync with

  const loadMeta = id => {
    try { const m = JSON.parse(localStorage.getItem(metaKey(id))); if (m && typeof m === 'object') return { at: Number(m.at) || 0, dirty: !!m.dirty } } catch { /* none */ }
    return null
  }
  const saveMeta = () => { try { if (uid) localStorage.setItem(metaKey(uid), JSON.stringify(meta)) } catch { /* storage full or blocked */ } }
  const json = a => JSON.stringify(a ?? null)
  const live = () => {
    const st = store.getState()
    if (!uid || off || !st.ready || st.tourSandbox || st.user?.id !== uid) return null
    return st
  }

  // The server's copy, in this profile's unit, as this device's running workout.
  const adopt = srv => {
    const st = live()
    if (!st) return
    const conv = srv.active ? (inUnitOf({ unit: srv.unit || 'kg', active: srv.active }, st.S)?.active ?? srv.active) : null
    meta = { at: Number(srv.at) || 0, dirty: false }
    saveMeta()
    if (sameSession(conv, st.S.active)) { seen = json(st.S.active); return }
    seen = json(conv)   // before the update, so the subscriber does not send it straight back
    st.update(S => { S.active = conv ? JSON.parse(JSON.stringify(conv)) : null }, false)
    seen = json(store.getState().S.active)
  }

  const run = fn => {
    if (busy) { again = true; return busy }
    busy = (async () => { try { await fn() } finally { busy = null } })()
    return busy
  }

  const push = () => run(async () => {
    const st = live()
    if (!st || !meta.dirty) return
    const at = meta.at
    try {
      await api('/api/live', { method: 'PUT', body: JSON.stringify({ active: st.S.active ?? null, unit: st.S.unit === 'lb' ? 'lb' : 'kg', at }) })
      if (meta.at === at) { meta.dirty = false; saveMeta() }
    } catch (e) {
      if (e?.status === 409 && e.data) adopt(e.data)
      else if (e?.status === 404) off = true
      // offline or refused: still dirty, the next pull sends it
    }
  }).then(() => { if (again) { again = false; return push() } })

  const pull = () => run(async () => {
    const st = live()
    if (!st || document.visibilityState === 'hidden') return
    let srv
    try { srv = await api('/api/live') } catch (e) { if (e?.status === 404) off = true; return }
    if (!live()) return
    const what = decide({ active: store.getState().S.active, at: meta.at, dirty: meta.dirty }, srv)
    if (what === 'adopt') adopt(srv)
    else if (what === 'push') {
      meta = { at: stampAfter(Date.now(), Math.max(meta.at, Number(srv.at) || 0)), dirty: true }
      saveMeta()
      again = true   // runs right after this pull
    } else if ((Number(srv.at) || 0) > meta.at) { meta.at = Number(srv.at); saveMeta() }
  }).then(() => { if (again) { again = false; return push() } })

  const schedulePoll = () => {
    clearTimeout(pollTm)
    pollTm = setTimeout(() => { pull(); schedulePoll() }, POLL_MS)
  }

  const begin = id => {
    uid = id
    off = false
    clearTimeout(pushTm)
    if (!id) { clearTimeout(pollTm); return }
    const a = store.getState().S.active
    // First run on this device: a workout already running here has never been sent.
    meta = loadMeta(id) || { at: 0, dirty: !!a }
    seen = json(a)
    wasLive = !!live()
    saveMeta()
    pull()
    schedulePoll()
  }

  let wasLive = false
  store.subscribe(st => {
    const id = st.user?.id || null
    if (id !== uid) begin(id)
    const now = !!live()
    // Boot finished (or a tour ended): look at the server's copy before anything goes up.
    if (now && !wasLive) { wasLive = true; seen = json(st.S.active); pull(); return }
    wasLive = now
    if (!now) return
    const j = json(st.S.active)
    if (j === seen) return
    seen = j
    meta = { at: stampAfter(Date.now(), meta.at), dirty: true }
    saveMeta()
    clearTimeout(pushTm)
    pushTm = setTimeout(push, PUSH_MS)
  })

  const wake = () => { if (document.visibilityState === 'visible') pull() }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { clearTimeout(pushTm); push() }   // the last set before the phone goes in the pocket
    else pull()
  })
  window.addEventListener('focus', wake)
  window.addEventListener('online', wake)

  begin(store.getState().user?.id || null)
}
