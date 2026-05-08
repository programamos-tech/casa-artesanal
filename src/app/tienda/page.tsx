import { getPublicCatalogProducts } from '@/lib/public-catalog'
import { CatalogStorefront } from '@/components/tienda/catalog-storefront'

/** Catálogo siempre desde BD (no snapshot estático en build). */
export const dynamic = 'force-dynamic'

export default async function TiendaPage() {
  const products = await getPublicCatalogProducts()
  return <CatalogStorefront products={products} />
}
