/* A fetch for the server that waits as long as a job may.
 *
 * Fork: the api runs on Bun (FORK.md). Upstream's version of this file exists because Node's
 * global fetch is undici with a hard 300-second headers timeout, which cut off a local model
 * that legitimately needs six minutes; it handed the adapters undici's own fetch with a
 * dispatcher whose timeouts follow the job timeout. Bun's fetch has no headers timeout of its own
 * (a 330-second answer arrives), so no dispatcher is needed and undici is gone from the api.
 * What stays is the transport budget: the job timeout plus a grace period, never under a minute,
 * after which the request is abandoned even if nothing else aborts it. The job's own
 * AbortController still wins, and it always fires first, since the budget is longer.
 *
 * Server-only by design: the phone's transport is capacitor-fetch.js, and the core adapters
 * take whichever fetch they are given. */

const GRACE_MS = 15000;

/** The longest a provider call may take for a job with this timeout. */
export function budgetFor(timeoutMs) {
  return Math.max(60000, +timeoutMs || 0) + GRACE_MS;
}

/** fetch(url, init) that will wait `timeoutMs` for the provider; AbortController still wins. */
export function fetchFor(timeoutMs) {
  const budget = budgetFor(timeoutMs);
  return (url: string | URL | Request, init: RequestInit = {}) => {
    const limit = AbortSignal.timeout(budget);
    return fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, limit]) : limit });
  };
}
