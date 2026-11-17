// The web-only build aliases this optional native plugin to an unavailable implementation.
// Keep the native API used by the lazy Coach notification path typed without installing it.
declare module '@capacitor/local-notifications' {
  export const LocalNotifications: {
    checkPermissions(): Promise<{ display: string }>
    schedule(options: {
      notifications: { id: number; title: string; body: string; schedule?: { at?: Date } }[]
    }): Promise<unknown>
  }
}
