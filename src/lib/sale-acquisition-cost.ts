import type { SaleItem } from '@/types'
import { applyLineTotal, getLineBaseTotal, getLineTotalAfterDiscount } from '@/lib/sale-discount'

export function getProductAcquisitionCost(product: { cost?: number | null }): number {
  return Math.max(0, product.cost ?? 0)
}

/** Precio unitario neto después de descuento de línea. */
export function getLineEffectiveUnitPrice(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>
): number {
  const qty = item.quantity || 0
  if (qty <= 0) return item.unitPrice || 0
  return getLineTotalAfterDiscount(item) / qty
}

export function isLineAtOrAboveAcquisitionCost(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>,
  acquisitionCost: number
): boolean {
  const cost = Math.round(acquisitionCost)
  if (cost <= 0) return true
  const qty = item.quantity || 0
  if (qty <= 0) return Math.round(item.unitPrice || 0) >= cost
  return Math.round(getLineEffectiveUnitPrice(item)) >= cost
}

/** Descuento máximo ($ o %) para que el precio efectivo no quede bajo el costo. */
export function getMaxAllowedLineDiscount(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discountType'>,
  acquisitionCost: number
): number {
  const qty = item.quantity || 0
  const cost = Math.max(0, acquisitionCost)
  if (qty <= 0 || cost <= 0) {
    return item.discountType === 'percentage' ? 100 : Number.POSITIVE_INFINITY
  }

  const base = getLineBaseTotal({ ...item, quantity: qty, unitPrice: item.unitPrice || 0 })
  const minTotal = qty * cost
  if (base <= minTotal) return 0

  const maxDiscountAmount = base - minTotal
  if (item.discountType === 'percentage') {
    return Math.min(100, (maxDiscountAmount / base) * 100)
  }
  return maxDiscountAmount
}

export function clampLineDiscountForAcquisitionCost(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>,
  acquisitionCost: number,
  requestedDiscount: number
): { discount: number; wasClamped: boolean } {
  const maxAllowed = getMaxAllowedLineDiscount(item, acquisitionCost)
  let discount = Math.max(0, requestedDiscount)

  if (item.discountType === 'percentage') {
    discount = Math.min(100, discount)
    if (discount > maxAllowed) {
      return { discount: maxAllowed, wasClamped: true }
    }
    return { discount, wasClamped: false }
  }

  if (discount > maxAllowed) {
    return { discount: maxAllowed, wasClamped: true }
  }
  return { discount, wasClamped: false }
}

export function formatAcquisitionCostViolation(
  productName: string,
  acquisitionCost: number,
  options?: { unitPrice?: number }
): string {
  const cost = Math.round(getProductAcquisitionCost({ cost: acquisitionCost }))
  const unitPrice = Math.round(options?.unitPrice ?? 0)
  if (unitPrice > 0 && unitPrice < cost) {
    return `${productName}: no puedes fijar un precio por debajo del costo de adquisición del producto.`
  }
  return `${productName}: el descuento deja el precio por debajo del costo de adquisición. Reduce el descuento.`
}

export function collectAcquisitionCostViolations(
  items: Pick<SaleItem, 'productId' | 'productName' | 'quantity' | 'unitPrice' | 'discount' | 'discountType'>[],
  getAcquisitionCost: (productId: string) => number | undefined
): string[] {
  const errors: string[] = []

  for (const item of items) {
    const acquisitionCost = getAcquisitionCost(item.productId)
    if (acquisitionCost === undefined) continue

    const cost = getProductAcquisitionCost({ cost: acquisitionCost })
    if (cost <= 0) continue

    if (Math.round(item.unitPrice || 0) < Math.round(cost)) {
      errors.push(
        formatAcquisitionCostViolation(item.productName, cost, { unitPrice: item.unitPrice })
      )
      continue
    }

    if (!isLineAtOrAboveAcquisitionCost(item, cost)) {
      errors.push(formatAcquisitionCostViolation(item.productName, cost))
    }
  }

  return errors
}

export function applyLineWithAcquisitionGuard<T extends SaleItem>(
  item: T,
  acquisitionCost: number,
  patch: Partial<Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>>
): { line: T; wasDiscountClamped: boolean } {
  const merged = { ...item, ...patch }
  const requestedDiscount = patch.discount ?? item.discount ?? 0
  const { discount, wasClamped } = clampLineDiscountForAcquisitionCost(
    merged,
    acquisitionCost,
    requestedDiscount
  )
  return {
    line: applyLineTotal({ ...merged, discount }) as T,
    wasDiscountClamped: wasClamped,
  }
}
