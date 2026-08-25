import type { User } from '@/types'

/** Acciones que mutan inventario (solo propietario). */
export const PRODUCT_ADMIN_ACTIONS = ['create', 'edit', 'delete'] as const

export type ProductAdminAction = (typeof PRODUCT_ADMIN_ACTIONS)[number]

/** Propietario = rol superadmin (y variantes históricas del nombre). */
export function isOwnerRole(role: string | null | undefined): boolean {
  const roleNorm = (role || '').toLowerCase().trim()
  if (roleNorm === 'superadmin') return true
  return roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador'))
}

export function isOwnerUser(user: Pick<User, 'role'> | null | undefined): boolean {
  return Boolean(user && isOwnerRole(user.role))
}

export function isProductAdminAction(action: string): boolean {
  return (PRODUCT_ADMIN_ACTIONS as readonly string[]).includes(action)
}
