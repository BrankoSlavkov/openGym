// A plugin as Capacitor's web build gives one it has no browser version of: listeners can be
// added (they never fire), every other method rejects as unimplemented.
const handle = { remove: async () => {} }

export const unavailable = (name: string): object => new Proxy({}, {
  get: (_target, key: string | symbol) => {
    if (key === 'then') return undefined
    if (key === 'addListener') return async () => handle
    if (key === 'removeAllListeners') return async () => {}
    return () => Promise.reject(Object.assign(new Error(`${name}.${String(key)} is not implemented on web`), { code: 'UNIMPLEMENTED' }))
  },
})
