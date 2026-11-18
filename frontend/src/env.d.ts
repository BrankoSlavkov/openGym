// Build-time constants (vite.config.ts `define`).
declare const __APP_VERSION__: string
declare const __SEASON_CLOCK__: boolean

// The browser fork resolves this native package to a web-only adapter in Vite.
declare module '@capacitor/core' {
  export function registerPlugin<T extends object>(name: string): T
}
