import { fileURLToPath } from 'node:url'
// Retained test fixtures can still reference upstream locale imports.
export const webOnlyTestConfig = {
  alias: [{ find: /^(?:\.{1,2}\/|\/src\/)(?:\.\.\/)*locales\/[A-Za-z-]+\.js$/, replacement: fileURLToPath(new URL('./locale-stub.ts', import.meta.url)) }],
  exclude: ['**/node_modules/**', '**/dist/**'],
}
