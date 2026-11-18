// Stand-in for src/lib/gym-places.js (the OpenStreetMap place search), removed with the gym map
// (.fork/removed-paths). Upstream's build-caps test still imports it: no search, no address.
export async function findPlaces(_query?: string, _options?: { suggest?: (...args: never[]) => unknown }) { return [] }
export async function addressAt(_point?: { lat: number; lng: number }) { return null }
