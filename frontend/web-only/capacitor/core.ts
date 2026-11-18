import { unavailable } from './unavailable.ts'

export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  convertFileSrc: (src: string) => src,
}
export const registerPlugin = (name: string) => unavailable(name)
export const SystemBars = unavailable('SystemBars')
export const CapacitorHttp = unavailable('CapacitorHttp')
