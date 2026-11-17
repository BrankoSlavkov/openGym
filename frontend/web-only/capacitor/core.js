import { unavailable } from './unavailable.js'

export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  convertFileSrc: src => src,
}
export const registerPlugin = name => unavailable(name)
export const SystemBars = unavailable('SystemBars')
export const CapacitorHttp = unavailable('CapacitorHttp')
