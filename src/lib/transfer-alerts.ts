import type { StoreStockTransfer } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type TransferAlertKind = 'approval' | 'receive'

export interface TransferAlertItem {
  kind: TransferAlertKind
  id: string
  transferNumber: string
  title: string
  subtitle: string
  href: string
}

function storageKey(userId: string, kind: TransferAlertKind) {
  return `casa_artesanal_transfer_alert_seen_${kind}_${userId}`
}

export function getSeenTransferIds(userId: string, kind: TransferAlertKind): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(userId, kind))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markTransferIdsSeen(userId: string, kind: TransferAlertKind, ids: string[]) {
  if (typeof window === 'undefined' || !ids.length) return
  try {
    const prev = new Set(getSeenTransferIds(userId, kind))
    for (const id of ids) prev.add(id)
    // Mantener solo IDs recientes (evitar crecimiento infinito)
    const next = [...prev].slice(-80)
    localStorage.setItem(storageKey(userId, kind), JSON.stringify(next))
  } catch {
    // ignore quota / private mode
  }
}

export function resolveUserStoreId(storeId?: string | null): string {
  return storeId || MAIN_STORE_ID
}

/** Carga notificaciones de traslados: por aprobar (origen) y por recibir (destino). */
export async function loadTransferAlerts(
  storeId: string
): Promise<{
  approvals: TransferAlertItem[]
  receptions: TransferAlertItem[]
  approvalTotal: number
  receptionTotal: number
}> {
  const [approvalResult, receptionResult] = await Promise.all([
    StoreStockTransferService.getTransfersAwaitingApproval(storeId, 1, 12),
    StoreStockTransferService.getPendingTransfers(storeId, 1, 12),
  ])

  const approvals: TransferAlertItem[] = (approvalResult.transfers || []).map((t) =>
    mapApproval(t)
  )
  const receptions: TransferAlertItem[] = (receptionResult.transfers || []).map((t) =>
    mapReception(t)
  )

  return {
    approvals,
    receptions,
    approvalTotal: approvalResult.total || approvals.length,
    receptionTotal: receptionResult.total || receptions.length,
  }
}

function mapApproval(t: StoreStockTransfer): TransferAlertItem {
  const num = t.transferNumber || t.id.slice(0, 8)
  return {
    kind: 'approval',
    id: t.id,
    transferNumber: num,
    title: `Solicitud por aprobar · ${num}`,
    subtitle: `Hacia ${t.toStoreName || 'destino'}`,
    href: `/inventory/transfers/${t.id}`,
  }
}

function mapReception(t: StoreStockTransfer): TransferAlertItem {
  const num = t.transferNumber || t.id.slice(0, 8)
  return {
    kind: 'receive',
    id: t.id,
    transferNumber: num,
    title: `Listo para recibir · ${num}`,
    subtitle: `Desde ${t.fromStoreName || 'origen'}`,
    href: `/inventory/transfers/${t.id}`,
  }
}
