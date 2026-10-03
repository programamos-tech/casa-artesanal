'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ProductDetailPageView } from '@/components/products/product-detail-page-view'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { usePermissions } from '@/hooks/usePermissions'
import { ProductsService } from '@/lib/products-service'
import { SalesService } from '@/lib/sales-service'
import { Product, Sale } from '@/types'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const productId = typeof params.productId === 'string' ? params.productId : ''
  const canEdit = hasPermission('products', 'edit')

  const [product, setProduct] = useState<Product | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [salesLoading, setSalesLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setNotFound(false)
    try {
      const data = await ProductsService.getProductById(productId)
      if (!data) {
        setProduct(null)
        setNotFound(true)
      } else {
        setProduct(data)
      }
    } catch {
      setProduct(null)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setSalesLoading(true)
    SalesService.getSalesByProductId(productId)
      .then(list => {
        if (!cancelled) setSales(list)
      })
      .catch(() => {
        if (!cancelled) setSales([])
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  return (
    <RoleProtectedRoute module="products" requiredAction="view">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando producto…</p>
        </div>
      ) : notFound || !product ? (
        <div className="py-16 text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-white">Producto no encontrado</p>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-white/50">No existe o no tienes acceso.</p>
          <Link
            href="/inventory/products"
            className={cn(
              'mt-5 inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
            )}
          >
            Volver a productos
          </Link>
        </div>
      ) : (
        <ProductDetailPageView
          product={product}
          sales={sales}
          salesLoading={salesLoading}
          onBack={() => router.push('/inventory/products')}
          onEdit={canEdit ? () => router.push(`/inventory/products?edit=${encodeURIComponent(product.id)}`) : undefined}
        />
      )}
    </RoleProtectedRoute>
  )
}
