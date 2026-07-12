'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/** La ficha a pantalla completa quedó deshabilitada: se edita solo con el modal. */
export default function ProductDetailRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const productId = typeof params?.productId === 'string' ? params.productId : ''

  useEffect(() => {
    const qs = productId ? `?edit=${encodeURIComponent(productId)}` : ''
    router.replace(`/inventory/products${qs}`)
  }, [productId, router])

  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
    </div>
  )
}
