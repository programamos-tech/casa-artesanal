import type { SaleItem } from '@/types'

export type SaleDiscountType = 'percentage' | 'amount'

export function getLineBaseTotal(item: Pick<SaleItem, 'quantity' | 'unitPrice'>): number {
  return (item.quantity || 0) * (item.unitPrice || 0)
}

export function getLineDiscountAmount(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>
): number {
  const base = getLineBaseTotal(item)
  const discount = item.discount || 0
  if (discount <= 0 || base <= 0) return 0
  if (item.discountType === 'percentage') {
    return Math.min(base, (base * discount) / 100)
  }
  return Math.min(base, discount)
}

export function getLineTotalAfterDiscount(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>
): number {
  return Math.max(0, getLineBaseTotal(item) - getLineDiscountAmount(item))
}

export function getOrderDiscountAmount(
  baseSubtotal: number,
  discount: number,
  discountType: SaleDiscountType = 'amount'
): number {
  if (discount <= 0 || baseSubtotal <= 0) return 0
  if (discountType === 'percentage') {
    return Math.min(baseSubtotal, (baseSubtotal * discount) / 100)
  }
  return Math.min(baseSubtotal, discount)
}

export type ComputeSaleAmountsOptions = {
  transportPrice?: number
  discount?: number
  discountType?: SaleDiscountType
}

/** Aplica total de línea coherente con descuento (para guardar en BD). */
export function applyLineTotal<T extends SaleItem>(item: T): T {
  return { ...item, total: getLineTotalAfterDiscount(item) }
}

export function computeSubtotalFromItems(
  items: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>[]
): number {
  return items.reduce((sum, item) => sum + getLineTotalAfterDiscount(item), 0)
}

export function computeSaleAmounts(
  items: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>[],
  includeTax: boolean,
  options: ComputeSaleAmountsOptions = {}
): {
  itemsSubtotal: number
  orderDiscountAmount: number
  subtotal: number
  tax: number
  transportPrice: number
  total: number
  discount: number
  discountType: SaleDiscountType
} {
  const itemsSubtotal = computeSubtotalFromItems(items)
  const discountType = options.discountType || 'amount'
  const rawDiscount = Math.max(0, options.discount || 0)
  const discount =
    discountType === 'percentage' ? Math.min(100, rawDiscount) : rawDiscount
  const orderDiscountAmount = getOrderDiscountAmount(itemsSubtotal, discount, discountType)
  const subtotal = Math.max(0, itemsSubtotal - orderDiscountAmount)
  const tax = includeTax ? subtotal * 0.19 : 0
  const transport = Math.max(0, options.transportPrice || 0)
  return {
    itemsSubtotal,
    orderDiscountAmount,
    subtotal,
    tax,
    transportPrice: transport,
    total: subtotal + tax + transport,
    discount,
    discountType,
  }
}

export function prepareSaleItemsForSave(items: SaleItem[]): SaleItem[] {
  return items.map((item) =>
    applyLineTotal({
      ...item,
      discount: item.discount || 0,
      discountType: item.discountType || 'amount',
    })
  )
}
