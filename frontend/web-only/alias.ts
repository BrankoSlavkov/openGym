// This fork runs in the browser only (FORK.md): the Capacitor packages are not installed. The app
// still names them in code that runs only in the phone builds (lib/mobile.js MOBILE), so each
// one resolves to a small stand-in here that says "not a native platform".
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./capacitor/', import.meta.url))
const gym = fileURLToPath(new URL('./gym/', import.meta.url))

export const webOnlyAlias = [
  { find: /^@capacitor\/(core|app|filesystem|local-notifications|share|splash-screen)$/, replacement: dir + '$1.ts' },
  { find: /^@aparajita\/capacitor-secure-storage$/, replacement: dir + 'secure-storage.ts' },
  // The gym reminder's map and place search are removed (.fork/removed-paths); the upstream files
  // that still import them get these stand-ins.
  { find: /^(?:\.{1,2}\/)+(?:views\/)?GymReminder\.jsx$/, replacement: gym + 'GymReminder.tsx' },
  { find: /^(?:\.{1,2}\/)+(?:lib\/)?gym-places\.js$/, replacement: gym + 'gym-places.ts' },
]
