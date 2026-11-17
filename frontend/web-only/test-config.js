// Test settings for this fork (FORK.md), spread into vite.config.js `test`. Upstream's tests for
// what the fork removed (the phone and watch apps, the translations) are left in place so syncs
// merge cleanly, and are excluded or skipped here instead.
import { fileURLToPath } from 'node:url'
import { SKIP_FILES, SKIP_TESTS } from './test-skips.js'

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const webOnlyTestConfig = {
  alias: [{ find: /^(?:\.{1,2}\/|\/src\/)(?:\.\.\/)*locales\/[A-Za-z-]+\.js$/, replacement: fileURLToPath(new URL('./locale-stub.js', import.meta.url)) }],
  exclude: ['**/node_modules/**', '**/dist/**', ...SKIP_FILES],
  ...(SKIP_TESTS.length ? { testNamePattern: new RegExp(`^(?!.*(?:${SKIP_TESTS.map(esc).join('|')})$)`) } : {}),
}
