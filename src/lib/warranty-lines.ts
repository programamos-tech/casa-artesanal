import type { Sale, SaleItem } from '@/types'

export type WarrantyLineRole = 'received' | 'delivered'

export type WarrantyLineInput = {
  productId: string
  productName: string
  productReference?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  saleItemId?: string
  role: WarrantyLineRole
  serialNumber?: string
}

export function getSaleItemLineTotal(item: Pick<SaleItem, 'total' | 'quantity' | 'unitPrice' | 'discount' | 'discountType'>): number {
  if (item.total && item.total > 0) return item.total
  const base = (item.quantity || 0) * (item.unitPrice || 0)
  const discount = item.discount || 0
  if (discount <= 0) return base
  if (item.discountType === 'percentage') {
    return Math.max(0, base - (base * discount) / 100)
  }
  return Math.max(0, base - discount)
}

export function saleItemToReceivedLine(item: SaleItem, quantity?: number): WarrantyLineInput {
  const qty = Math.max(1, Math.min(quantity ?? item.quantity, item.quantity))
  const unitPrice = qty > 0 ? getSaleItemLineTotal(item) / item.quantity : item.unitPrice
  return {
    productId: item.productId,
    productName: item.productName || 'Producto',
    productReference: item.productReferenceCode,
    quantity: qty,
    unitPrice,
    lineTotal: Math.round(unitPrice * qty),
    saleItemId: item.id,
    role: 'received',
  }
}

export function sumWarrantyLineTotals(lines: Pick<WarrantyLineInput, 'lineTotal'>[]): number {
  return lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0)
}

export function totalsMatchSale(deliveredTotal: number, sale: Pick<Sale, 'total'>): boolean {
  return Math.round(deliveredTotal) === Math.round(sale.total || 0)
}

export function formatWarrantyMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}
