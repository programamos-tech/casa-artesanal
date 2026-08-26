'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/ui/sidebar'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState } from 'react'
import { useStoreUrl } from '@/hooks/use-store-url'
import { cn } from '@/lib/utils'
import { ReleaseNotesModal } from '@/components/ui/release-notes-modal'
import { TransferAlertModal } from '@/components/layout/transfer-alert-modal'
import { AppTopNav } from '@/components/layout/app-top-nav'
import { OwnerAssistantBubble } from '@/components/assistant/owner-assistant-bubble'
import { CashOperationGateProvider } from '@/components/caja/cash-operation-gate-provider'
import { CashStaleAlertBar } from '@/components/caja/cash-stale-alert-bar'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Actualizar URL con el identificador de la tienda
  useStoreUrl()
  
  // Si es la página de login o select-store, no mostrar sidebar ni protección
  if (pathname === '/login' || pathname === '/select-store' || pathname.startsWith('/tienda')) {
    return <>{children}</>
  }
  
  // Nueva venta y detalle de factura: scroll sin barras (vertical u horizontal)
  const hideMainScrollbar = pathname.startsWith('/sales/')

  // Misma regla que MobileNavWrapper: sin barra inferior → no reservar hueco
  const showMobileBottomNavInset =
    pathname !== '/login' &&
    pathname !== '/select-store' &&
    !pathname.startsWith('/sales/new')

  // Para todas las demás páginas, mostrar el layout completo con sidebar
  return (
    <ProtectedRoute>
    <CashOperationGateProvider>
      <div className="flex h-screen min-h-0 min-w-0 bg-white dark:bg-zinc-950">
        <Sidebar onMobileMenuToggle={setIsMobileMenuOpen} />
        <main
          className={cn(
            'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col bg-white transition-all duration-300 dark:bg-zinc-950 xl:ml-60',
            isMobileMenuOpen && 'blur-sm'
          )}
        >
          <AppTopNav />
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-white dark:bg-zinc-950',
              showMobileBottomNavInset &&
                'pb-[calc(var(--cash-stale-alert-h,0px)+max(3.5rem,calc(2.875rem+env(safe-area-inset-bottom))))] scroll-pb-[calc(var(--cash-stale-alert-h,0px)+max(3.5rem,calc(2.875rem+env(safe-area-inset-bottom))))] xl:pb-[var(--cash-stale-alert-h,0px)] xl:scroll-pb-[var(--cash-stale-alert-h,0px)]',
              !showMobileBottomNavInset &&
                'pb-[var(--cash-stale-alert-h,0px)] scroll-pb-[var(--cash-stale-alert-h,0px)]',
              hideMainScrollbar && 'scrollbar-hide'
            )}
          >
            {/* +1px horizontal vs px-* evita que overflow-auto recorte el borde de las cards a ancho completo */}
            <div className="box-border w-full min-w-0 max-w-full px-[13px] md:px-[25px] xl:px-[33px] 2xl:px-[41px]">
              {children}
            </div>
          </div>
        </main>
      </div>
      <ReleaseNotesModal />
      {isTransfersAndReceptionsEnabled() ? <TransferAlertModal /> : null}
      <OwnerAssistantBubble />
      <CashStaleAlertBar />
    </CashOperationGateProvider>
    </ProtectedRoute>
  )
}
