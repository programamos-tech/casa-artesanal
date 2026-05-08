'use client'

import type { ReactNode } from 'react'
import { TiendaCartProvider } from '@/contexts/tienda-cart-context'
import { CartDrawer } from '@/components/tienda/cart-drawer'

export function TiendaProviders({ children }: { children: ReactNode }) {
  return (
    <TiendaCartProvider>
      {children}
      <CartDrawer />
    </TiendaCartProvider>
  )
}
