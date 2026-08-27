import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { type CashStaleOpenAlert } from '@/lib/cash-sessions-service'
import { isOwnerRole } from '@/lib/roles'
import { getCurrentUserStoreId } from '@/lib/store-helper'

export type { CashStaleOpenAlert }

export function formatCashOpenDuration(openedAt: string, now: Date = new Date()): string {
  const distance = formatDistanceToNow(new Date(openedAt), {
    addSuffix: false,
    locale: es,
  })
  return `desde hace ${distance}`
}

export async function loadCashStaleAlerts(options: {
  isOwner: boolean
  storeId?: string | null
}): Promise<CashStaleOpenAlert[]> {
  try {
    const params = new URLSearchParams()
    if (!options.isOwner) {
      const scopeStoreId = options.storeId || getCurrentUserStoreId()
      if (scopeStoreId) params.set('storeId', scopeStoreId)
    }

    const query = params.toString()
    const response = await fetch(`/api/caja/stale-alerts${query ? `?${query}` : ''}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return []

    const payload = (await response.json()) as { alerts?: CashStaleOpenAlert[] }
    return Array.isArray(payload.alerts) ? payload.alerts : []
  } catch (error) {
    console.error('loadCashStaleAlerts:', error)
    return []
  }
}

export function shouldShowCashStaleAlertsForUser(user: {
  role?: string | null
  storeId?: string | null
} | null): boolean {
  return Boolean(user?.role)
}

export function resolveCashStaleAlertScope(user: {
  role?: string | null
  storeId?: string | null
} | null): { isOwner: boolean; storeId: string | null } {
  const isOwner = isOwnerRole(user?.role)
  const storeId = isOwner ? null : user?.storeId || getCurrentUserStoreId()
  return { isOwner, storeId }
}
