import type { SalePayment } from '@/types'

export type MixedPaymentType = Extract<
  SalePayment['paymentType'],
  'cash' | 'nequi' | 'bancolombia' | 'transfer' | 'card'
>

export const MIXED_PAYMENT_TYPE_OPTIONS: { value: MixedPaymentType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'transfer', label: 'Transferencia (otro / sin canal)' },
  { value: 'card', label: 'Tarjeta' },
]

export function createEmptyMixedPayment(paymentType: MixedPaymentType): SalePayment {
  return {
    id: '',
    saleId: '',
    paymentType,
    amount: 0,
    reference: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

export function getMixedPaymentTypeLabel(type: string): string {
  return MIXED_PAYMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

/** Tipos disponibles para un slot, excluyendo el elegido en el otro. */
export function getAvailableMixedTypes(
  currentType: MixedPaymentType,
  otherType: MixedPaymentType | undefined
): typeof MIXED_PAYMENT_TYPE_OPTIONS {
  return MIXED_PAYMENT_TYPE_OPTIONS.filter(
    (o) => o.value === currentType || o.value !== otherType
  )
}

export function summarizeMixedPayments(payments: SalePayment[], saleTotal: number) {
  const roundedSaleTotal = Math.round(saleTotal)
  const cashAmount = payments
    .filter((p) => p.paymentType === 'cash')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const nonCashAmount = payments
    .filter((p) => p.paymentType !== 'cash')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const hasCash = payments.some((p) => p.paymentType === 'cash')
  const enteredTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const cashOwed = hasCash ? Math.max(0, roundedSaleTotal - Math.round(nonCashAmount)) : 0
  const cashChange = hasCash ? cashAmount - cashOwed : 0
  const appliedTotal = hasCash
    ? Math.round(nonCashAmount) + Math.min(Math.round(cashAmount), cashOwed)
    : Math.round(enteredTotal)
  const remaining = Math.max(0, roundedSaleTotal - appliedTotal)
  const typesDistinct =
    payments.length >= 2 &&
    new Set(payments.map((p) => p.paymentType)).size === payments.length
  const bothPositive = payments.every((p) => (p.amount || 0) > 0)
  const isComplete = hasCash
    ? cashAmount >= cashOwed &&
      Math.round(nonCashAmount) + cashOwed === roundedSaleTotal &&
      (Math.round(nonCashAmount) > 0 || cashAmount > 0) &&
      typesDistinct
    : appliedTotal === roundedSaleTotal && bothPositive && typesDistinct

  return {
    roundedSaleTotal,
    cashAmount,
    nonCashAmount,
    hasCash,
    enteredTotal,
    cashOwed,
    cashChange,
    appliedTotal,
    remaining,
    typesDistinct,
    bothPositive,
    isComplete,
  }
}

/** Guarda efectivo sin vuelto; el resto tal cual. */
export function buildMixedPaymentsForSave(
  payments: SalePayment[],
  cashOwed: number
): SalePayment[] {
  return payments.map((p) =>
    p.paymentType === 'cash' ? { ...p, amount: cashOwed } : p
  )
}

export function validateMixedPayments(
  payments: SalePayment[],
  saleTotal: number
): string | null {
  const summary = summarizeMixedPayments(payments, saleTotal)
  if (!summary.typesDistinct) {
    return 'Los dos medios de pago deben ser distintos.'
  }
  if (summary.hasCash) {
    const digital = Math.round(summary.nonCashAmount)
    const cashEntered = Math.round(summary.cashAmount)
    if (digital > summary.roundedSaleTotal) {
      return `El monto que no es efectivo ($${digital.toLocaleString('es-CO')}) supera el total de la venta ($${summary.roundedSaleTotal.toLocaleString('es-CO')}).`
    }
    if (cashEntered < summary.cashOwed) {
      return `En efectivo faltan $${(summary.cashOwed - cashEntered).toLocaleString('es-CO')}. Restante a cubrir: $${summary.cashOwed.toLocaleString('es-CO')}.`
    }
    return null
  }
  if (!summary.bothPositive) {
    return 'Indica un monto mayor a 0 en cada medio de pago.'
  }
  if (Math.round(summary.enteredTotal) !== summary.roundedSaleTotal) {
    const diff = Math.round(summary.enteredTotal) - summary.roundedSaleTotal
    if (diff < 0) {
      return `Faltan $${Math.abs(diff).toLocaleString('es-CO')} para completar el total ($${summary.roundedSaleTotal.toLocaleString('es-CO')}).`
    }
    return `Sobran $${diff.toLocaleString('es-CO')} respecto al total ($${summary.roundedSaleTotal.toLocaleString('es-CO')}).`
  }
  return null
}
