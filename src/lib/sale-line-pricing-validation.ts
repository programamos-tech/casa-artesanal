import type { SaleItem } from '@/types'
import {
  getProductAcquisitionCost,
  isLineAtOrAboveAcquisitionCost,
} from '@/lib/sale-acquisition-cost'

export interface SaleLinePricingAlert {
  id: 'below-acquisition'
  message: string
}

export const ACQUISITION_COST_PRICE_ALERT =
  'No puedes vender por debajo del costo de adquisición del producto.'

export const ACQUISITION_COST_DISCOUNT_ALERT =
  'No puedes vender por debajo del costo de adquisición. Ajusta el precio o el descuento.'

export function getSaleLineAcquisitionAlerts(
  item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount' | 'discountType'>,
  acquisitionCost: number
): SaleLinePricingAlert[] {
  const cost = Math.round(getProductAcquisitionCost({ cost: acquisitionCost }))
  if (cost <= 0 || isLineAtOrAboveAcquisitionCost(item, cost)) {
    return []
  }

  const priceBelowAcquisition = Math.round(item.unitPrice || 0) < cost
  return [
    {
      id: 'below-acquisition',
      message: priceBelowAcquisition
        ? ACQUISITION_COST_PRICE_ALERT
        : ACQUISITION_COST_DISCOUNT_ALERT,
    },
  ]
}

export function hasBlockingAcquisitionCostIssues(
  items: Pick<SaleItem, 'productId' | 'quantity' | 'unitPrice' | 'discount' | 'discountType'>[],
  getAcquisitionCost: (productId: string) => number | undefined
): boolean {
  return items.some(item => {
    const acquisitionCost = getAcquisitionCost(item.productId)
    if (acquisitionCost === undefined) return false
    return getSaleLineAcquisitionAlerts(item, acquisitionCost).length > 0
  })
}

export function collectAcquisitionCostSaveViolations(
  items: Pick<SaleItem, 'productId' | 'productName' | 'quantity' | 'unitPrice' | 'discount' | 'discountType'>[],
  getAcquisitionCost: (productId: string) => number | undefined
): string[] {
  const messages: string[] = []
  for (const item of items) {
    const acquisitionCost = getAcquisitionCost(item.productId)
    if (acquisitionCost === undefined) continue
    for (const alert of getSaleLineAcquisitionAlerts(item, acquisitionCost)) {
      messages.push(`${item.productName}: ${alert.message}`)
    }
  }
  return messages
}
