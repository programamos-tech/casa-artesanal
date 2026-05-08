import { User } from '@/types'

/**
 * Obtiene el usuario actual desde localStorage
 * @returns Usuario actual o null si no está disponible
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const userData = localStorage.getItem('casa_artesanal_user')
    if (!userData) {
      return null
    }

    return JSON.parse(userData) as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Obtiene el store_id del usuario actual desde localStorage
 * @returns store_id del usuario o null si no está disponible
 */
export function getCurrentUserStoreId(): string | null {
  const user = getCurrentUser()
  return user?.storeId || null
}

/**
 * Obtiene el store_id del usuario pasado como parámetro
 * @param user - Usuario del cual obtener el store_id
 * @returns store_id del usuario o null si no está disponible
 */
export function getUserStoreId(user: User | null): string | null {
  if (!user) {
    return null
  }
  return user.storeId || null
}

/**
 * Verifica si el usuario es de la tienda principal (Zona T)
 * @param user - Usuario a verificar
 * @returns true si es de la tienda principal
 */
export function isMainStoreUser(user: User | null): boolean {
  const storeId = getUserStoreId(user)
  return storeId === '00000000-0000-0000-0000-000000000001' || !storeId
}

/**
 * Verifica si el usuario puede acceder a todas las tiendas (superadmin o admin)
 * Un superadmin puede acceder a todas las tiendas independientemente del storeId actual
 * @param user - Usuario a verificar
 * @returns true si puede acceder a todas las tiendas
 */
export function canAccessAllStores(user: User | null): boolean {
  if (!user?.role) return false
  const role = String(user.role).toLowerCase().trim()
  // Superadmin o admin: pueden entrar a Tiendas y cambiar de tienda
  if (role === 'superadmin' || role === 'admin') return true
  if (role.includes('super') && (role.includes('admin') || role.includes('administrador'))) return true
  return false
}

/** Nombre o ciudad que identifica la tienda donde se permite transferir stock Bodega ↔ Local */
const STORE_IDENTIFIER_SINCELEJO = 'Sincelejo'

/** Misma tienda que `StoresService.getMainStore()` — catálogo y creación de productos viven aquí aunque el nombre no diga "Sincelejo". */
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Indica si una tienda es la de Sincelejo (donde se permite transferir stock bodega ↔ local).
 * La tienda principal por UUID siempre cuenta (badge "Tienda Principal"); además se reconoce por nombre/ciudad.
 */
export function isStoreSincelejo(store: { id?: string; name?: string; city?: string } | null): boolean {
  if (!store) return false
  if (store.id === MAIN_STORE_ID) return true
  const name = (store.name || '').toLowerCase()
  const city = (store.city || '').toLowerCase()
  const key = STORE_IDENTIFIER_SINCELEJO.toLowerCase()
  return name.includes(key) || city.includes(key)
}
