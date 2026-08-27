import type { CashSession } from '@/types'
import {
  CashSessionsService,
  getCashRegisterStoreId,
  isCashSessionFromPreviousDay,
} from '@/lib/cash-sessions-service'

export type CashGateAction = 'sale' | 'credit' | 'payment' | 'expense' | 'supplier'
export type CashGateStatus = 'ok' | 'must_close' | 'must_open'

export type CashOperationGate =
  | { status: 'ok'; session: CashSession }
  | { status: 'must_close'; session: CashSession }
  | { status: 'must_open'; session: null }

const ACTION_LABEL: Record<CashGateAction, string> = {
  sale: 'facturar',
  credit: 'crear un crédito',
  payment: 'registrar un abono',
  expense: 'registrar un egreso o gasto',
  supplier: 'registrar proveedores o abonos',
}

export class CashOperationBlockedError extends Error {
  readonly status: Exclude<CashGateStatus, 'ok'>
  readonly action: CashGateAction

  constructor(status: Exclude<CashGateStatus, 'ok'>, action: CashGateAction) {
    super(getCashGateBody(status, action))
    this.name = 'CashOperationBlockedError'
    this.status = status
    this.action = action
  }
}

export function isCashOperationBlockedError(
  error: unknown
): error is CashOperationBlockedError {
  return error instanceof CashOperationBlockedError
}

export function getCashGateActionLabel(action: CashGateAction): string {
  return ACTION_LABEL[action]
}

export function getCashGateTitle(status: Exclude<CashGateStatus, 'ok'>): string {
  return status === 'must_close' ? 'Cierra la caja de ayer' : 'Abre caja primero'
}

export function getCashGateBody(
  status: Exclude<CashGateStatus, 'ok'>,
  action: CashGateAction
): string {
  const verb = ACTION_LABEL[action]
  if (status === 'must_close') {
    return `No puedes ${verb} hasta que cierres la caja. El turno de ayer sigue abierto.`
  }
  return `No puedes ${verb} hasta que abras caja.`
}

export async function getCashOperationGate(
  storeId?: string | null
): Promise<CashOperationGate> {
  const session = await CashSessionsService.getOpenSession(
    storeId || getCashRegisterStoreId()
  )
  if (!session) {
    return { status: 'must_open', session: null }
  }
  if (isCashSessionFromPreviousDay(session.openedAt)) {
    return { status: 'must_close', session }
  }
  return { status: 'ok', session }
}

export async function assertCashReadyForOperation(
  action: CashGateAction,
  storeId?: string | null,
  options?: { allowPreviousDay?: boolean }
): Promise<CashSession> {
  const gate = await getCashOperationGate(storeId)
  if (gate.status === 'ok') return gate.session
  if (gate.status === 'must_close' && options?.allowPreviousDay && gate.session) {
    return gate.session
  }
  throw new CashOperationBlockedError(gate.status, action)
}
