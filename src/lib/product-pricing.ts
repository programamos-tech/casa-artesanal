import type { Client, Product } from '@/types'

/** Cliente mayorista usa precio wholesale; el resto usa precio retail (cliente final). */
export function isWholesaleClientType(type: Client['type'] | undefined | null): boolean {
  return type === 'mayorista'
}

export function getClientPriceTierLabel(type: Client['type'] | undefined | null): string {
  return isWholesaleClientType(type) ? 'Mayorista' : 'Cliente final'
}

/** Etiqueta del campo de precio en ventas según tipo de cliente. */
export function getClientPriceFieldLabel(type: Client['type'] | undefined | null): string {
  return isWholesaleClientType(type) ? 'Precio mayorista' : 'Precio cliente final'
}

export function getProductRetailPrice(product: Pick<Product, 'retailPrice' | 'price'>): number {
  return product.retailPrice ?? product.price ?? 0
}

export function getProductWholesalePrice(
  product: Pick<Product, 'wholesalePrice' | 'retailPrice' | 'price'>
): number {
  const retail = getProductRetailPrice(product)
  if (product.wholesalePrice != null && product.wholesalePrice !== undefined) {
    return product.wholesalePrice
  }
  return retail
}

/** Precio de referencia (el otro tramo) para mostrar comparación en la línea de venta. */
export function getProductAlternatePriceForClient(
  product: Pick<Product, 'retailPrice' | 'wholesalePrice' | 'price'>,
  clientType: Client['type'] | undefined | null
): { label: string; amount: number } | null {
  if (!clientType) return null
  const retail = getProductRetailPrice(product)
  const wholesale = getProductWholesalePrice(product)
  if (retail === wholesale) return null
  if (isWholesaleClientType(clientType)) {
    return { label: 'Cliente final', amount: retail }
  }
  return { label: 'Mayorista', amount: wholesale }
}

export function getProductUnitPriceForClient(
  product: Pick<Product, 'retailPrice' | 'wholesalePrice' | 'price'>,
  clientType: Client['type'] | undefined | null
): number {
  const retail = product.retailPrice ?? product.price ?? 0
  // No usar `price` como respaldo mayorista: en Product, price = retail (cliente final).
  const wholesale =
    product.wholesalePrice != null && product.wholesalePrice !== undefined
      ? product.wholesalePrice
      : retail
  if (isWholesaleClientType(clientType)) {
    return wholesale
  }
  return retail
}
