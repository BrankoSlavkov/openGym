// This fork runs in the browser only (FORK.md): the Capacitor packages are not installed. The app
// still names them in code that runs only in the phone builds (lib/mobile.js MOBILE), so each
// one resolves to a small stand-in here that says "not a native platform".
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./capacitor/', import.meta.url))

export const webOnlyAlias = [
  { find: /^@capacitor\/(core|app|filesystem|local-notifications|share|splash-screen)$/, replacement: dir + '$1.js' },
  { find: /^@capacitor-mlkit\/barcode-scanning$/, replacement: dir + 'barcode-scanning.js' },
  { find: /^@aparajita\/capacitor-secure-storage$/, replacement: dir + 'secure-storage.js' },
]
