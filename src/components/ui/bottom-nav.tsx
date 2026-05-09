'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Receipt, Package, Users, CreditCard, ShieldCheck, Activity, UserCog, UserCircle, ArrowRightLeft, CheckCircle, Store, FileText } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { isMainStoreUser, canAccessAllStores } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import type { Store as StoreType } from '@/types/store'
import { Logo } from '@/components/ui/logo'

const items = [
  { href: '/dashboard', label: 'Reportes', icon: BarChart3, module: 'dashboard', alwaysVisible: true },
  { href: '/inventory/products', label: 'Productos', icon: Package, module: 'products' },
  { href: '/inventory/transfers', label: 'Transferencias', icon: ArrowRightLeft, module: 'transfers', requiresMainStore: true },
  { href: '/inventory/receptions', label: 'Recepciones', icon: CheckCircle, module: 'receptions' },
  { href: '/clients', label: 'Clientes', icon: Users, module: 'clients' },
  { href: '/sales', label: 'Ventas', icon: Receipt, module: 'sales' },
  { href: '/warranties', label: 'Garantías', icon: ShieldCheck, module: 'warranties' },
  { href: '/payments', label: 'Créditos', icon: CreditCard, module: 'payments' },
  { href: '/purchases/invoices', label: 'Facturador', icon: FileText, module: 'supplier_invoices' },
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
  const [currentStore, setCurrentStore] = useState<StoreType | null>(null)
  const scrollContainerRef = useRef<HTMLUListElement>(null)
  const [showLeftButton, setShowLeftButton] = useState(false)
  const [showRightButton, setShowRightButton] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Durante el render inicial, usar pathname vacío para evitar mismatch
  const currentPathname = isMounted ? pathname : ''

  // Cargar logo de la tienda para la barra inferior (móvil y tablet)
  useEffect(() => {
    let cancelled = false

    const loadStore = async () => {
      if (!user) {
        if (!cancelled) setCurrentStore(null)
        return
      }

      try {
        const store = user.storeId
          ? await StoresService.getStoreById(user.storeId)
          : await StoresService.getMainStore()
        if (!cancelled) setCurrentStore(store)
      } catch {
        if (!cancelled) setCurrentStore(null)
      }
    }

    loadStore()
    return () => {
      cancelled = true
    }
  }, [user])

  // Filtrar items basado en permisos, pero siempre mostrar Reportes y Perfil si el usuario está autenticado
  const visibleItems = items
    .filter(item => {
      if (item.alwaysVisible && user) {
        return true
      }
      // Transferencias: tienda principal o admin/superadmin con acceso global (misma regla que el sidebar)
      if (item.requiresMainStore && !isMainStoreUser(user) && !canAccessAllStores(user)) {
        return false
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
        className="casa-artesanal-preserve-surface relative flex flex-col overflow-hidden border-t border-white/[0.06] pt-0 backdrop-blur-2xl"
        style={{ background: 'linear-gradient(180deg,#040e24 0%,#020a18 100%)', boxShadow: '0 -4px 32px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.05)', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        {/* Móvil y tablet: barra oscura; en móvil solo iconos (sin texto debajo) */}
        <div className="flex h-11 shrink-0 items-stretch gap-2 md:h-12 md:gap-2">
        {/* Logo de tienda a la izquierda */}
        <div className="flex w-12 shrink-0 items-center justify-center pl-2 md:w-14">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.06] ring-1 ring-white/[0.05] transition-colors hover:border-white/25 hover:bg-white/[0.1]"
            title={currentStore?.name ? `Tienda: ${currentStore.name}` : 'Tienda'}
          >
            {currentStore?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentStore.logo}
                alt={currentStore.name || 'Logo de tienda'}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Logo size="sm" className="scale-[0.82]" />
            )}
          </Link>
        </div>

        {/* Contenedor de scroll: siempre empezando por Reportes a la izquierda */}
        <ul 
          ref={scrollContainerRef}
          className="scrollbar-hide flex h-full min-w-0 flex-1 flex-row items-stretch gap-1 overflow-x-auto pr-2 md:grid md:grid-flow-col md:[grid-auto-columns:minmax(0,1fr)] md:gap-2 md:overflow-x-auto md:pr-3"
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
                    className="flex h-full w-full min-w-0 cursor-not-allowed flex-col items-center justify-center gap-0 px-1.5 text-[9px] opacity-30 text-white/50 transition-all duration-200 md:gap-1 md:px-1 md:text-[10px]"
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
                  className={`flex h-full w-full min-w-0 flex-col items-center justify-center gap-0 px-1.5 text-[9px] transition-all duration-200 touch-manipulation md:gap-1 md:px-1 md:text-[10px] ${
                    active
                      ? 'text-white bg-white/[0.1] ring-1 ring-inset ring-white/[0.08]'
                      : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70 active:scale-95'
                  }`}
                >
                  <Icon strokeWidth={1.5} className="h-5 w-5 shrink-0 transition-colors" />
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
            className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-[#020a18] to-transparent md:w-10"
            aria-hidden
          />
        )}
        {/* Difuminado izquierda: cuando hay scroll, indica que hay más a la izquierda */}
        {showLeftButton && (
          <div
            className="pointer-events-none absolute bottom-0 left-14 top-0 z-10 w-8 bg-gradient-to-r from-[#020a18] to-transparent md:left-16 md:w-10"
            aria-hidden
          />
        )}
      </div>
    </nav>
  )
}


