import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicProductDetailById } from '@/lib/public-catalog'
import { ProductDetailClient } from '@/components/tienda/product-detail-client'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ productId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params
  const p = await getPublicProductDetailById(productId)
  if (!p) {
    return { title: 'Producto | La Casa Artesanal' }
  }
  const desc = p.description?.trim().slice(0, 155) || `Producto ${p.name} — La Casa Artesanal`
  return {
    title: `${p.name} | La Casa Artesanal`,
    description: desc
  }
}

export default async function TiendaProductPage({ params }: Props) {
  const { productId } = await params
  const product = await getPublicProductDetailById(productId)
  if (!product) {
    notFound()
  }
  return <ProductDetailClient product={product} />
}
