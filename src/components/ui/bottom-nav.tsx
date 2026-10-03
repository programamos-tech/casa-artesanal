'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Receipt, Package, Users, CreditCard, Wallet, Activity, UserCog, UserCircle, Truck, CheckCircle, Store, FileText, Banknote } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'

const items = [
  { href: '/dashboard', label: 'Reportes', icon: BarChart3, module: 'dashboard', alwaysVisible: true },
  { href: '/inventory/products', label: 'Productos', icon: Package, module: 'products' },
  ...(isTransfersAndReceptionsEnabled()
    ? [
        { href: '/inventory/transfers', label: 'Traslados', icon: Truck, module: 'transfers' },
        { href: '/inventory/receptions', label: 'Recepciones', icon: CheckCircle, module: 'receptions' },
      ]
    : []),
  { href: '/clients', label: 'Clientes', icon: Users, module: 'clients' },
  { href: '/sales', label: 'Ventas', icon: Receipt, module: 'sales' },
  { href: '/egresos', label: 'Egresos', icon: Wallet, module: 'egresos' },
  { href: '/caja', label: 'Caja', icon: Banknote, module: 'cash_register' },
  { href: '/payments', label: 'Créditos', icon: CreditCard, module: 'payments' },
  { href: '/purchases/invoices', label: 'Proveedores', icon: FileText, module: 'supplier_invoices' },
  { href: '/stores', label: 'Tiendas', icon: Store, module: 'roles' },
  { href: '/roles', label: 'Roles', icon: UserCog, module: 'roles' },
  { href: '/logs', label: 'Actividades', icon: Activity, module: 'logs' },
  { href: '/profile', label: 'Perfil', icon: UserCircle, module: 'dashboard', alwaysVisible: true },
]

export function BottomNav() {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const { canView } = usePermissions()
  const { user } = useAuth()
  const scrollContainerRef = useRef<HTMLUListElement>(null)
  const [showLeftButton, setShowLeftButton] = useState(false)
  const [showRightButton, setShowRightButton] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Durante el render inicial, usar pathname vacío para evitar mismatch
  const currentPathname = isMounted ? pathname : ''

  // Filtrar items basado en permisos, pero siempre mostrar Reportes y Perfil si el usuario está autenticado
  const visibleItems = items
    .filter(item => {
      if (item.alwaysVisible && user) {
        return true
      }
      // Traslados: quien tenga permiso del módulo (incluye microtienda / vendedores)
      if (item.href === '/inventory/transfers') {
        return canView(item.module)
      }
      // Para el módulo de Tiendas, siempre mostrarlo pero solo permitir acceso si es super admin
      if (item.href === '/stores') {
        return canView(item.module) // Mostrar siempre si tiene permisos del módulo
      }
      return canView(item.module)
    })
    .sort((a, b) => {
      // Reportes siempre primero
      if (a.href === '/dashboard') return -1
      if (b.href === '/dashboard') return 1
      // Perfil siempre al final
      if (a.href === '/profile') return 1
      if (b.href === '/profile') return -1
      // Mantener el orden original para los demás
      return 0
    })

  // Función para verificar si hay scroll disponible
  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowLeftButton(scrollLeft > 0)
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 1)
  }

  // Verificar botones al montar y cuando cambian los items visibles
  useEffect(() => {
    checkScrollButtons()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollButtons)
      // Verificar después de un pequeño delay para asegurar que el DOM esté renderizado
      const timeout = setTimeout(checkScrollButtons, 100)
      
      // Listener para redimensionamiento de ventana
      const handleResize = () => {
        setTimeout(checkScrollButtons, 100)
      }
      window.addEventListener('resize', handleResize)
      
      return () => {
        container.removeEventListener('scroll', checkScrollButtons)
        window.removeEventListener('resize', handleResize)
        clearTimeout(timeout)
      }
    }
  }, [visibleItems.length, isMounted])

  return (
    <nav className="casa-artesanal-preserve-surface fixed bottom-0 left-0 right-0 z-[45] isolate xl:hidden">
      {/* Barra pegada al borde inferior: padding seguro dentro del contenedor para que el fondo llegue hasta abajo */}
      <div
        className="casa-artesanal-preserve-surface relative flex flex-col overflow-hidden border-t border-white/[0.07] pt-0"
        style={{
          background: 'linear-gradient(180deg,#1a1a1d 0%,#111113 55%,#0c0c0e 100%)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.04)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Móvil y tablet: barra oscura; en móvil solo iconos (sin texto debajo) */}
        <div className="flex h-11 shrink-0 items-stretch md:h-12">
        {/* Contenedor de scroll: siempre empezando por Reportes a la izquierda */}
        <ul 
          ref={scrollContainerRef}
          className="scrollbar-hide flex h-full min-w-0 flex-1 flex-row items-stretch gap-0.5 overflow-x-auto px-2 py-1.5 md:grid md:px-3 md:py-1 md:grid-flow-col md:[grid-auto-columns:minmax(0,1fr)] md:gap-1 md:overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isStoresModule = href === '/stores'
            const canAccessStores = isStoresModule ? canAccessAllStores(user) : true
            
            const active = currentPathname === href || 
              (href !== '/dashboard' && currentPathname?.startsWith(href)) ||
              (href === '/payments' && currentPathname?.startsWith('/payments')) ||
              (href === '/purchases/invoices' && currentPathname?.startsWith('/purchases')) ||
              (href === '/inventory/products' && currentPathname?.startsWith('/inventory/products')) ||
              (href === '/inventory/transfers' && currentPathname?.startsWith('/inventory/transfers')) ||
              (href === '/inventory/receptions' && currentPathname?.startsWith('/inventory/receptions')) ||
              (href === '/sales' && currentPathname?.startsWith('/sales')) ||
              (href === '/stores' && currentPathname?.startsWith('/stores'))
            
            return (
              <li
                key={href}
                className="flex min-w-[44px] shrink-0 md:min-w-0"
              >
                {isStoresModule && !canAccessStores ? (
                  <div
                    className="flex h-full w-full min-w-0 cursor-not-allowed flex-col items-center justify-center gap-0 rounded-md px-2 text-[9px] text-white/25 md:gap-1 md:px-1 md:text-[10px]"
                    title="Solo disponible para Super Administradores"
                    aria-label={`${label} — solo super administradores`}
                  >
                    <Icon strokeWidth={1.5} className="h-5 w-5 shrink-0" />
                    <span className="hidden max-w-full truncate whitespace-nowrap px-0.5 text-center leading-tight md:block">{label}</span>
                  </div>
                ) : (
                <Link
                  href={href}
                  aria-label={label}
                  title={label}
                  className={`casa-artesanal-preserve-surface flex h-full w-full min-w-0 flex-col items-center justify-center gap-0 rounded-md px-2 text-[9px] transition-colors duration-200 touch-manipulation md:gap-1 md:px-1 md:text-[10px] ${
                    active
                      ? 'bg-white/[0.1] font-semibold text-white'
                      : 'text-white/55 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08]'
                  }`}
                >
                  <Icon strokeWidth={active ? 1.9 : 1.5} className="h-5 w-5 shrink-0 transition-colors" />
                  <span className="hidden max-w-full truncate whitespace-nowrap px-0.5 text-center leading-tight md:block">{label}</span>
                </Link>
                )}
              </li>
            )
          })}
        </ul>
        </div>

        {/* Difuminado derecha: indica que hay más opciones sin quitar espacio */}
        {showRightButton && (
          <div
            className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-[#111113] to-transparent md:w-10"
            aria-hidden
          />
        )}
        {/* Difuminado izquierda: cuando hay scroll, indica que hay más a la izquierda */}
        {showLeftButton && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-[#111113] to-transparent md:w-10"
            aria-hidden
          />
        )}
      </div>
    </nav>
  )
}


