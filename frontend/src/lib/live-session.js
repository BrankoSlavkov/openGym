// The running workout, shared between a profile's devices (fork feature; api/live-session.js).
// Pure rules here; store/live-sync.js does the requests.
//
// The server keeps one copy, `{ active, unit, at }`, and the newest stamp wins. Each device keeps
// `{ at, dirty }`: the stamp of the copy it holds (seen on the server or made here) and whether
// that copy still has to go up.

/** A stamp for a change made here: now, but always above the last copy seen, so a device whose
 *  clock runs behind still beats the copy it just took over from another device. */
export const stampAfter = (now, seen) => Math.max(Number(now) || 0, (Number(seen) || 0) + 1)

export const sameSession = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * What to do with what the server answered: 'adopt' its copy, 'push' this one, or 'none'.
 * `local` is { active, at, dirty }, `server` is { active, at }.
 */
export function decide(local, server) {
  const la = Number(local?.at) || 0, sa = Number(server?.at) || 0
  const same = sameSession(local?.active, server?.active)
  // A device that has never synced its running workout (the first run of this feature): a session
  // of its own against a different one on the server keeps whichever was started last, rather
  // than the server's just for being there first.
  if (la === 0 && local?.active && server?.active && !same) {
    return (Number(local.active.start) || 0) > (Number(server.active.start) || 0) ? 'push' : 'adopt'
  }
  if (sa > la) return same ? 'none' : 'adopt'
  if (sa < la) return local?.dirty || !same ? 'push' : 'none'
  return local?.dirty && !same ? 'push' : 'none'
}
