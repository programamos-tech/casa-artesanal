import type { Credit } from '@/types'

export type BulkCreditAllocation = {
  creditId: string
  amount: number
  cashAmount: number
  transferAmount: number
  recordMethod: 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card' | 'mixed'
}

/**
 * Reparte efectivo total entre créditos en COP de forma proporcional al pendiente,
 * con ajuste por mayor resto para que la suma sea exacta.
 * Luego transfer_i = p_i - cash_i (suma transfer = P - cashTotal).
 */
function allocateCashByPending(pendings: readonly number[], cashTotal: number): number[] {
  const P = pendings.reduce((a, b) => a + b, 0)
  if (pendings.length === 0) return []
  if (P <= 0 || cashTotal <= 0) return pendings.map(() => 0)
  if (cashTotal > P) throw new Error('El efectivo no puede superar el total pendiente')

  const floors = pendings.map((p) => Math.floor((cashTotal * p) / P))
  const remainder = cashTotal - floors.reduce((a, b) => a + b, 0)
  const byRemainder = pendings
    .map((p, i) => ({ i, r: (cashTotal * p) % P }))
    .sort((a, b) => b.r - a.r)

  const out = [...floors]
  for (let k = 0; k < remainder; k++) {
    out[byRemainder[k].i]++
  }
  return out
}

/**
 * Créditos con pendiente > 0, orden estables (vencimiento, luego id).
 */
export function sortCreditsForBulkPayment(credits: Credit[]): Credit[] {
  return [...credits].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0
    if (da !== db) return da - db
    return a.id.localeCompare(b.id)
  })
}

/**
 * Genera montos por crédito para un pago mixto global (C + T = sum(pending)).
 */
export function splitMixedByPending(
  credits: readonly Credit[],
  cashTotal: number,
  transferTotal: number
): BulkCreditAllocation[] {
  const sorted = sortCreditsForBulkPayment([...credits])
  const pendings = sorted.map((c) => c.pendingAmount)
  const P = pendings.reduce((a, b) => a + b, 0)
  if (P !== cashTotal + transferTotal) {
    throw new Error('Efectivo + transferencia debe igualar el total pendiente seleccionado')
  }

  const cashParts = allocateCashByPending(pendings, cashTotal)

  return sorted.map((c, i) => {
    const p = pendings[i]
    const cash = cashParts[i]
    const transfer = p - cash
    if (transfer < 0 || cash < 0) {
      throw new Error('Error interno al repartir montos')
    }
    return {
      creditId: c.id,
      amount: p,
      cashAmount: cash,
      transferAmount: transfer,
      recordMethod: 'mixed' as const,
    }
  })
}

/** Una fila por crédito: efectivo, Nequi, Bancolombia o tarjeta. */
export function allocationsSingleMethod(
  credits: readonly Credit[],
  method: 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card'
): BulkCreditAllocation[] {
  const sorted = sortCreditsForBulkPayment([...credits])
  return sorted.map((c) => ({
    creditId: c.id,
    amount: c.pendingAmount,
    cashAmount: method === 'cash' ? c.pendingAmount : 0,
    transferAmount:
      method === 'transfer' || method === 'nequi' || method === 'bancolombia' ? c.pendingAmount : 0,
    recordMethod: method,
  }))
}
