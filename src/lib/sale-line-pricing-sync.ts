import type { Client, Product, SaleItem } from '@/types'
import { getProductUnitPriceForClient } from '@/lib/product-pricing'
import { applyLineTotal } from '@/lib/sale-discount'

/** Recalcula precios de línea al cambiar tipo de cliente (sin peticiones a la API). */
export function syncSaleLinePricesForClient(
  items: SaleItem[],
  clientType: Client['type'] | null | undefined,
  resolveProduct: (productId: string) => Product | undefined
): SaleItem[] {
  return items.map(item => {
    const product = resolveProduct(item.productId)
    if (!product) return item
    const unitPrice = getProductUnitPriceForClient(product, clientType ?? null)
    return applyLineTotal({ ...item, unitPrice })
  })
}
