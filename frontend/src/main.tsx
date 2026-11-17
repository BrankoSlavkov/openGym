import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client.ts'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { useStore } from './store/useStore.js'
import { startMediaSync } from './lib/media-sync.js'
import { startLiveSync } from './store/live-sync.js'
import { startNativeKeyboard } from './lib/native-keyboard.js'
import { registerDailyFormSource } from './lib/daily-form.js'
// The Coach's and the admin dashboard's styles stay in the main stylesheet, in the place they
// always had (before index.css), although their screens are now loaded on demand (App.jsx).
import './admin.css'
import './coach.css'
import './index.css'
import { hideBoot, handOverFromLaunchScreen } from './lib/boot.js'
import { guardFocusZoom } from './lib/viewport-zoom.ts'
import { initBuildCaps } from './lib/channel.js'
import { startNetLog } from './lib/net-log.js'
import { applyDisplay } from './lib/display-prefs.js'

// App.jsx restores per-route scroll itself; the browser's own attempt races it.
// A script that dies before the app draws would otherwise leave the boot logo lifting forever.
window.addEventListener('error', hideBoot, { once: true })
handOverFromLaunchScreen()

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// The web build lets people pinch to zoom; on iOS a focused small field must not zoom the page.
if (!MOBILE) guardFocusZoom()

// Settings → Look & Home → Motion and Text size, before anything draws.
applyDisplay()

// Settings → About → Network log (lib/net-log.js): from the very first request on.
if (MOBILE) startNetLog()

const render = () => createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></StrictMode>
)
// The phone app first asks which build it is (lib/build-caps.js): openGym Offline must never show
// a sync button, not even for a frame. The answer is a few milliseconds; a shell that never
// answers still gets its app after a moment.
if (MOBILE) Promise.race([initBuildCaps().catch(() => {}), new Promise(r => setTimeout(r, 700))]).then(render)
else render()

// The photos and videos of custom exercises, in every build (the phone and the demo included):
// uploads of what the server lacks, the local clean-up, and the plan's files kept offline.
startMediaSync(useStore)
// The running workout on every device of the profile (fork feature, store/live-sync.js).
startLiveSync(useStore)

// Android 15 does not resize the page for the soft keyboard; the app says how much it covers and
// this keeps the focused field above it. Idle everywhere else.
startNativeKeyboard()
// The daily-form check-in feeds the automatic deload suggestion (lib/deload-cycle.js).
registerDailyFormSource()

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
  // The plan's exercise media, kept by the worker for a workout opened without a network (#281).
  // It only fetches ahead while the page runs as the installed app; a tab keeps what it has shown.
  import('./lib/media-prefetch.js').then(m => m.startMediaPrefetch(useStore)).catch(() => {})
  // A deploy reaches an app left open too, not just the next fresh start (lib/app-refresh.js).
  import('./lib/app-refresh.js').then(m => m.startAppRefresh()).catch(() => {})
}
