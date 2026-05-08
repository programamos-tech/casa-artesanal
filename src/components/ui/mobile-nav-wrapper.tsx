'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'

export function MobileNavWrapper() {
  const pathname = usePathname()
  // Ocultar en /login, /select-store, facturador de venta (más espacio; volver con la flecha del encabezado)
  const hideOnRoutes = ['/login', '/select-store', '/sales/new', '/tienda']
  const shouldHide = hideOnRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`))

  if (shouldHide) return null
  return <BottomNav />
}


