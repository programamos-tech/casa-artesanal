import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CashSessionsService,
  getCashRegisterStoreId,
  type CashStaleOpenAlert,
} from '@/lib/cash-sessions-service'
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
  const scopeStoreId = options.isOwner ? null : options.storeId || getCashRegisterStoreId()
  return CashSessionsService.listStaleOpenSessions(scopeStoreId)
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
