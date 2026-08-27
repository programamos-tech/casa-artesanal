import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  type CashOpenSessionStatus,
  type CashSessionSemaphore,
} from '@/lib/cash-sessions-service'
import { isOwnerRole } from '@/lib/roles'
import { getCurrentUserStoreId } from '@/lib/store-helper'

export type { CashOpenSessionStatus, CashSessionSemaphore }

export function formatCashOpenDuration(openedAt: string, now: Date = new Date()): string {
  const distance = formatDistanceToNow(new Date(openedAt), {
    addSuffix: false,
    locale: es,
  })
  return `desde hace ${distance}`
}

export function worstCashSessionSemaphore(
  sessions: Pick<CashOpenSessionStatus, 'status'>[]
): CashSessionSemaphore {
  if (sessions.some((session) => session.status === 'red')) return 'red'
  if (sessions.some((session) => session.status === 'orange')) return 'orange'
  return 'green'
}

export async function loadCashSessionStatuses(options: {
  isOwner: boolean
  storeId?: string | null
}): Promise<CashOpenSessionStatus[]> {
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

    const payload = (await response.json()) as { sessions?: CashOpenSessionStatus[] }
    return Array.isArray(payload.sessions) ? payload.sessions : []
  } catch (error) {
    console.error('loadCashSessionStatuses:', error)
    return []
  }
}

/** @deprecated Use loadCashSessionStatuses */
export async function loadCashStaleAlerts(options: {
  isOwner: boolean
  storeId?: string | null
}): Promise<CashOpenSessionStatus[]> {
  const sessions = await loadCashSessionStatuses(options)
  return sessions.filter((session) => session.status === 'red')
}

export function resolveCashStaleAlertScope(user: {
  role?: string | null
  storeId?: string | null
} | null): { isOwner: boolean; storeId: string | null } {
  const isOwner = isOwnerRole(user?.role)
  const storeId = isOwner ? null : user?.storeId || getCurrentUserStoreId()
  return { isOwner, storeId }
}
