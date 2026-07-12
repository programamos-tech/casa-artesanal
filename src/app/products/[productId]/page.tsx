'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ProductDetailRedirect() {
  const router = useRouter()
  const params = useParams()
  const productId = typeof params?.productId === 'string' ? params.productId : ''

  useEffect(() => {
    const qs = productId ? `?edit=${encodeURIComponent(productId)}` : ''
    router.replace(`/inventory/products${qs}`)
  }, [router, productId])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
    </div>
  )
}
