import type { User } from '@/types'

/** Sliding session: each refresh extends middleware access for this window (7 days). */
export const SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7

/**
 * Writes the session cookie used by middleware (presence check).
 * Value is URL-encoded so JSON with special characters stays valid.
 */
export function setZonatSessionCookie(jsonPayload: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `casa_artesanal_user=${encodeURIComponent(jsonPayload)}; path=/; max-age=${SESSION_COOKIE_MAX_AGE_SEC}; SameSite=Lax`
}

export function clearZonatSessionCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = 'casa_artesanal_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

/**
 * Single source of truth for client session: localStorage + aligned cookie (sliding max-age).
 */
export function persistZonatUser(user: User): void {
  const userToSave = {
    ...user,
    storeId: user.storeId === undefined ? null : user.storeId
  }
  const json = JSON.stringify(userToSave)
  localStorage.setItem('casa_artesanal_user', json)
  setZonatSessionCookie(json)
}
