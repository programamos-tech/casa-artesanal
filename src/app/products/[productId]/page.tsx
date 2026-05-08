'use client'

import { useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

export default function ProductDetailRedirect() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const productId = params?.productId as string
  
  useEffect(() => {
    if (productId) {
      // Preservar los query params si existen
      const queryString = searchParams.toString()
      const newPath = `/inventory/products/${productId}${queryString ? `?${queryString}` : ''}`
      console.log('[PRODUCT REDIRECT] Redirecting to:', newPath)
      router.replace(newPath)
    }
  }, [router, productId, searchParams])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  )
}
