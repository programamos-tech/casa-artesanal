import type { StoreStockTransfer } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type TransferAlertKind = 'approval' | 'receive' | 'waiting'

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

/** Vista en esta sesión (no oculta la campana; solo evita repetir el modal). */
export function getSeenTransferIds(userId: string, kind: TransferAlertKind): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(storageKey(userId, kind))
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
    const next = [...prev].slice(-80)
    sessionStorage.setItem(storageKey(userId, kind), JSON.stringify(next))
  } catch {
    // ignore quota / private mode
  }
}

export function resolveUserStoreId(storeId?: string | null): string {
  return storeId || MAIN_STORE_ID
}

export type TransferAlertsResult = {
  approvals: TransferAlertItem[]
  receptions: TransferAlertItem[]
  waiting: TransferAlertItem[]
  approvalTotal: number
  receptionTotal: number
  waitingTotal: number
  /** Pendientes de acción: aprobar + recibir (la campana se apaga solo cuando esto es 0). */
  actionTotal: number
}

/**
 * Notificaciones de traslados hasta que estén aprobados y recibidos:
 * - approval: origen debe aprobar (requested)
 * - receive: destino debe recibir (pending / in_transit)
 * - waiting: destino solicitó y espera aprobación (requested)
 */
export async function loadTransferAlerts(
  storeId: string,
  options?: { allStores?: boolean }
): Promise<TransferAlertsResult> {
  const allStores = Boolean(options?.allStores)

  const [approvalResult, receptionResult, waitingResult] = await Promise.all([
    allStores
      ? StoreStockTransferService.getTransfersAwaitingApprovalAll(1, 20)
      : StoreStockTransferService.getTransfersAwaitingApproval(storeId, 1, 12),
    allStores
      ? StoreStockTransferService.getPendingTransfersAll(1, 20)
      : StoreStockTransferService.getPendingTransfers(storeId, 1, 12),
    allStores
      ? Promise.resolve({ transfers: [] as StoreStockTransfer[], total: 0 })
      : StoreStockTransferService.getTransfersWaitingApproval(storeId, 1, 12),
  ])

  const approvals = (approvalResult.transfers || []).map(mapApproval)
  const receptions = (receptionResult.transfers || []).map(mapReception)
  const waiting = (waitingResult.transfers || []).map(mapWaiting)

  const approvalTotal = approvalResult.total || approvals.length
  const receptionTotal = receptionResult.total || receptions.length
  const waitingTotal = waitingResult.total || waiting.length

  return {
    approvals,
    receptions,
    waiting,
    approvalTotal,
    receptionTotal,
    waitingTotal,
    // La campana cuenta lo que aún hay que gestionar (aprobar u recibir).
    // "waiting" recuerda al destino, pero no duplica el contador si ya está en approvals de otra tienda.
    actionTotal: approvalTotal + receptionTotal,
  }
}

function mapApproval(t: StoreStockTransfer): TransferAlertItem {
  const num = t.transferNumber || t.id.slice(0, 8)
  return {
    kind: 'approval',
    id: t.id,
    transferNumber: num,
    title: `Por aprobar · ${num}`,
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
    title: `Por recibir · ${num}`,
    subtitle: `Desde ${t.fromStoreName || 'origen'}`,
    href: `/inventory/transfers/${t.id}`,
  }
}

function mapWaiting(t: StoreStockTransfer): TransferAlertItem {
  const num = t.transferNumber || t.id.slice(0, 8)
  return {
    kind: 'waiting',
    id: t.id,
    transferNumber: num,
    title: `Espera aprobación · ${num}`,
    subtitle: `Desde ${t.fromStoreName || 'origen'}`,
    href: `/inventory/transfers/${t.id}`,
  }
}
