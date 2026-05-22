import type { Client, Product } from '@/types'

/** Cliente mayorista usa precio wholesale; el resto usa precio retail (cliente final). */
export function isWholesaleClientType(type: Client['type'] | undefined | null): boolean {
  return type === 'mayorista'
}

export function getClientPriceTierLabel(type: Client['type'] | undefined | null): string {
  return isWholesaleClientType(type) ? 'Mayorista' : 'Cliente final'
}

export function getProductUnitPriceForClient(
  product: Pick<Product, 'retailPrice' | 'wholesalePrice' | 'price'>,
  clientType: Client['type'] | undefined | null
): number {
  if (isWholesaleClientType(clientType)) {
    return product.wholesalePrice ?? product.price ?? 0
  }
  return product.retailPrice ?? product.price ?? 0
}
