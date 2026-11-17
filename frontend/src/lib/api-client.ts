import { api } from './api.ts'

/** Generated requests share the app's session, subpath and error handling. */
export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const pathname = url.split('?')[0] || url
  const read = !options?.method || options.method.toUpperCase() === 'GET'
  const responseType = read && (/^\/api\/(?:shared\/)?media\/[^/]+$/.test(pathname) || pathname === '/api/trainer/member/photo')
    ? 'blob'
    : pathname === '/api/docs' || /^\/api\/calendar\/[^/]+\.ics$/.test(pathname) ? 'text' : 'json'
  return api<T>(url, { ...options, responseType })
}

export type ErrorType<T> = Error & { status?: number; code?: string; data?: T }
export type BodyType<T> = T
