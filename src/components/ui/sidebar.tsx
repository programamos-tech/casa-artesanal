'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Package,
  Users,
  Receipt,
  CreditCard,
  Shield,
  Activity,
  ShieldCheck,
  UserCircle,
  UserCog,
  Store as StoreIcon,
  Warehouse,
  ArrowRightLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores, getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { loadTransferAlerts, resolveUserStoreId } from '@/lib/transfer-alerts'
import { APP_BRAND_LOGO, APP_NAME, APP_VERSION } from '@/config/app-meta'
import type { Store } from '@/types/store'
const navigation = [
  { name: 'Reportes', href: '/dashboard', icon: BarChart3, module: 'dashboard' },
  { 
    name: 'Inventario', 
    href: '/inventory/products', 
    icon: Warehouse, 
    module: 'products',
    submenu: [
      { name: 'Productos', href: '/inventory/products', icon: Package, module: 'products' },
      { name: 'Transferencias', href: '/inventory/transfers', icon: ArrowRightLeft, module: 'transfers' },
      { name: 'Recepciones', href: '/inventory/receptions', icon: CheckCircle, module: 'receptions' },
    ]
  },
  { 
    name: 'Comercial', 
    href: '/clients', 
    icon: Users, 
    module: 'clients',
    submenu: [
      { name: 'Clientes', href: '/clients', icon: Users, module: 'clients' },
      { name: 'Ventas', href: '/sales', icon: Receipt, module: 'sales' },
      { name: 'Créditos', href: '/payments', icon: CreditCard, module: 'payments' },
      { name: 'Facturador', href: '/purchases/invoices', icon: FileText, module: 'supplier_invoices' },
      { name: 'Garantías', href: '/warranties', icon: ShieldCheck, module: 'warranties' },
    ]
  },
  { 
    name: 'Administración', 
    href: '/stores', 
    icon: Shield, 
    module: 'roles',
    submenu: [
      { name: 'Tiendas', href: '/stores', icon: StoreIcon, module: 'roles', requiresAllStoresAccess: true as const },
      { name: 'Roles', href: '/roles', icon: UserCog, module: 'roles' },
      { name: 'Actividades', href: '/logs', icon: Activity, module: 'logs' },
    ]
  },
  { name: 'Perfil', href: '/profile', icon: UserCircle, module: 'dashboard' },
]

interface SidebarProps {
  className?: string
  onMobileMenuToggle?: (isOpen: boolean) => void
}

export function Sidebar({ className, onMobileMenuToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { canView } = usePermissions()
  const { user } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [pendingReceptionsCount, setPendingReceptionsCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  // Inicializar con todos los menús expandidos por defecto
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Inventario', 'Comercial', 'Administración']))

  // Mantener expandidos los menús cuando estamos en alguna de sus rutas
  useEffect(() => {
    if (pathname?.startsWith('/inventory')) {
      setExpandedMenus(prev => new Set([...prev, 'Inventario']))
    }
    if (pathname?.startsWith('/clients') || pathname?.startsWith('/sales') || pathname?.startsWith('/payments') || pathname?.startsWith('/purchases') || pathname?.startsWith('/warranties')) {
      setExpandedMenus(prev => new Set([...prev, 'Comercial']))
    }
    if (pathname?.startsWith('/stores') || pathname?.startsWith('/roles') || pathname?.startsWith('/logs')) {
      setExpandedMenus(prev => new Set([...prev, 'Administración']))
    }
  }, [pathname])

  // Notificar al layout cuando cambie el estado del menú móvil
  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen)
  }, [isMobileMenuOpen, onMobileMenuToggle])

  // Cargar tienda activa (principal o microtienda seleccionada)
  useEffect(() => {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

    const loadStoreInfo = async () => {
      if (!user) {
        setCurrentStore(null)
        return
      }

      const storeId = getCurrentUserStoreId() ?? user.storeId
      try {
        const store =
          !storeId || storeId === MAIN_STORE_ID
            ? await StoresService.getMainStore()
            : await StoresService.getStoreById(storeId)
        setCurrentStore(store)
      } catch (error) {
        console.error('Error loading store info:', error)
        setCurrentStore(null)
      }
    }

    void loadStoreInfo()
  }, [user, user?.storeId])

  // Contadores de traslados: por aprobar (origen) y por recibir (destino).
  useEffect(() => {
    let cancelled = false

    const loadPendingCounts = async () => {
      if (!user) {
        setPendingReceptionsCount(0)
        setPendingApprovalsCount(0)
        return
      }

      const storeId = resolveUserStoreId(user.storeId)

      try {
        const { approvals, receptions, approvalTotal, receptionTotal } = await loadTransferAlerts(storeId)
        if (!cancelled) {
          setPendingApprovalsCount(approvalTotal)
          setPendingReceptionsCount(receptionTotal)
        }
      } catch {
        if (!cancelled) {
          setPendingReceptionsCount(0)
          setPendingApprovalsCount(0)
        }
      }
    }

    void loadPendingCounts()
    const interval = setInterval(() => {
      void loadPendingCounts()
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user?.id, user?.storeId, pathname])

  // Cerrar menú cuando se hace click fuera del sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* Mobile/Tablet menu button - solo visible cuando el sidebar está cerrado */}
      {/* Hidden hamburger on mobile: usamos bottom nav */}

      {/* Mobile/Tablet overlay - removido para evitar pantalla negra */}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          'casa-artesanal-preserve-surface fixed inset-y-0 left-0 z-40 w-60 transform overflow-hidden border-r border-[#1c1c1f] bg-[#0d0d0e] shadow-[2px_0_16px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-zinc-800 dark:bg-[#0d0d0e] xl:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          /* Cerrado en móvil/tablet: sin pointer-events para que WebKit no intercepte toques en la barra inferior (z-40 compartida con bottom nav). */
          !isMobileMenuOpen && 'max-xl:pointer-events-none',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo y Tienda */}
          <div
            className={cn(
              'border-b border-[#1c1c1f] px-2 py-3 transition-colors dark:border-zinc-800'
            )}
          >
            <Link
              href="/dashboard"
              className="relative flex w-full flex-col items-center gap-2 px-1 transition-opacity hover:opacity-90"
            >
              <div className="flex w-full min-h-[4.75rem] items-center justify-center">
                <Image
                  src={APP_BRAND_LOGO}
                  alt={APP_NAME}
                  width={240}
                  height={88}
                  className="h-[4.75rem] w-[92%] max-w-[12rem] object-contain object-center"
                  priority
                  unoptimized
                />
              </div>
              {currentStore?.name ? (
                <p
                  className="max-w-full text-center text-[11px] font-medium leading-snug tracking-wide text-white/55"
                  title={
                    currentStore.city
                      ? `${currentStore.name} — ${currentStore.city}`
                      : currentStore.name
                  }
                >
                  <span className="line-clamp-2">
                    {isMainStoreUser(user)
                      ? currentStore.name
                      : currentStore.city
                        ? `${currentStore.name} — ${currentStore.city}`
                        : currentStore.name}
                  </span>
                </p>
              ) : null}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
            {navigation.map((item) => {
              // Solo mostrar el item si el usuario tiene permisos para verlo
              if (!canView(item.module)) return null
              
              // Para el módulo de Tiendas, siempre mostrarlo pero solo permitir acceso si es super admin
              const isStoresModule = item.href === '/stores'
              const canAccessStores = isStoresModule ? canAccessAllStores(user) : true
              
              // Si requiere acceso a todas las tiendas (y no es stores), verificar
              if ((item as { requiresAllStoresAccess?: boolean }).requiresAllStoresAccess && !isStoresModule && !canAccessAllStores(user)) return null
              
              // Verificar si tiene submenú
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isExpanded = expandedMenus.has(item.name)
              
              // Verificar si algún subitem está activo
              const isSubmenuActive = hasSubmenu && item.submenu?.some(subitem => {
                if (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) return true
                if (subitem.href === '/inventory/transfers' && pathname?.startsWith('/inventory/transfers')) return true
                if (subitem.href === '/inventory/receptions' && pathname?.startsWith('/inventory/receptions')) return true
                if (subitem.href === '/clients' && pathname?.startsWith('/clients')) return true
                if (subitem.href === '/sales' && pathname?.startsWith('/sales')) return true
                if (subitem.href === '/payments' && pathname?.startsWith('/payments')) return true
                if (subitem.href === '/purchases/invoices' && pathname?.startsWith('/purchases')) return true
                if (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) return true
                if (subitem.href === '/stores' && pathname?.startsWith('/stores')) return true
                if (subitem.href === '/roles' && pathname?.startsWith('/roles')) return true
                if (subitem.href === '/logs' && pathname?.startsWith('/logs')) return true
                return pathname === subitem.href
              })
              
              // Para créditos, productos, ventas y stores, también considerar activo si la ruta empieza con el href
              const isActive = pathname === item.href || 
                (item.href === '/payments' && pathname?.startsWith('/payments')) ||
                (item.href === '/inventory/products' && pathname?.startsWith('/inventory')) ||
                (item.href === '/clients' && (pathname?.startsWith('/clients') || pathname?.startsWith('/sales') || pathname?.startsWith('/payments') || pathname?.startsWith('/purchases') || pathname?.startsWith('/warranties'))) ||
                (item.href === '/stores' && (pathname?.startsWith('/stores') || pathname?.startsWith('/roles') || pathname?.startsWith('/logs'))) ||
                (item.href === '/stores' && pathname?.startsWith('/stores')) ||
                isSubmenuActive
              
              const rowActive =
                'bg-white/[0.1] text-white ring-1 ring-inset ring-white/[0.1] shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
              const rowInactive =
                'text-white/55 hover:bg-white/[0.055] hover:text-white/90'
              /** Con submenú: el padre no se resalta; solo el hijo activo */
              const isParentHighlighted = hasSubmenu ? false : isActive

              const navIconParent = (active: boolean) =>
                cn(
                  'mr-2.5 h-[18px] w-[18px] shrink-0 stroke-[1.75] transition-colors',
                  active ? 'text-white/85' : 'text-white/40 group-hover:text-white/70'
                )

              const navIconChild = (active: boolean) =>
                cn(
                  'mr-2 h-4 w-4 shrink-0 stroke-[1.75] transition-colors',
                  active ? 'text-white/85' : 'text-white/38 group-hover:text-white/65'
                )

              const toggleSubmenu = (e: React.MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                setExpandedMenus(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(item.name)) {
                    newSet.delete(item.name)
                  } else {
                    newSet.add(item.name)
                  }
                  return newSet
                })
              }
              
              return (
                <div key={item.name}>
                  {hasSubmenu ? (
                    <>
                      <button
                        onClick={toggleSubmenu}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                          isParentHighlighted ? rowActive : rowInactive
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center">
                          <item.icon className={navIconParent(isParentHighlighted)} aria-hidden />
                          <span className="flex-1 truncate text-left">{item.name}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown strokeWidth={2} className="ml-1 h-3 w-3 shrink-0 text-white/30" />
                        ) : (
                          <ChevronRight strokeWidth={2} className="ml-1 h-3 w-3 shrink-0 text-white/30" />
                        )}
                      </button>
                      {isExpanded && item.submenu && (
                        <div className="ml-2.5 mt-0.5 space-y-0.5 border-l border-white/[0.07] pl-2.5">
                          {item.submenu.map((subitem) => {
                            if (!canView(subitem.module)) return null
                            
                            // Transferencias: visible si tiene permiso (incl. microtienda que debe aprobar salidas)
                            if (subitem.href === '/inventory/transfers' && !canView('transfers')) return null
                            
                            // Verificar si requiere acceso a todas las tiendas (para el subitem de Tiendas)
                            if (subitem.requiresAllStoresAccess && !canAccessAllStores(user)) return null
                            
                            const isSubActive = pathname === subitem.href ||
                              (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) ||
                              (subitem.href === '/inventory/transfers' && pathname?.startsWith('/inventory/transfers')) ||
                              (subitem.href === '/inventory/receptions' && pathname?.startsWith('/inventory/receptions')) ||
                              (subitem.href === '/clients' && pathname?.startsWith('/clients')) ||
                              (subitem.href === '/sales' && pathname?.startsWith('/sales')) ||
                              (subitem.href === '/payments' && pathname?.startsWith('/payments')) ||
                              (subitem.href === '/purchases/invoices' && pathname?.startsWith('/purchases')) ||
                              (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) ||
                              (subitem.href === '/stores' && pathname?.startsWith('/stores')) ||
                              (subitem.href === '/roles' && pathname?.startsWith('/roles')) ||
                              (subitem.href === '/logs' && pathname?.startsWith('/logs'))

                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  'group flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150',
                                  isSubActive ? rowActive : rowInactive
                                )}
                              >
                                <subitem.icon className={navIconChild(isSubActive)} aria-hidden />
                                <span className="flex-1 truncate">{subitem.name}</span>
                                {subitem.href === '/inventory/transfers' && pendingApprovalsCount > 0 && (
                                  <span
                                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-violet-500/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                                    title={`${pendingApprovalsCount} por aprobar`}
                                  >
                                    {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
                                  </span>
                                )}
                                {subitem.href === '/inventory/receptions' && pendingReceptionsCount > 0 && (
                                  <span
                                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/12 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/75"
                                    title={`${pendingReceptionsCount} pendientes por gestionar`}
                                  >
                                    {pendingReceptionsCount > 99 ? '99+' : pendingReceptionsCount}
                                  </span>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isStoresModule && !canAccessStores ? (
                        <div
                          className="group flex cursor-not-allowed items-center rounded-lg px-2.5 py-2 text-sm font-medium opacity-35 text-white/60"
                          title="Solo disponible para Super Administradores"
                        >
                          <item.icon className="mr-2.5 h-[18px] w-[18px] shrink-0 text-white/35" aria-hidden />
                          <span className="flex-1 truncate">{item.name}</span>
                        </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                        isActive ? rowActive : rowInactive
                      )}
                    >
                      <item.icon className={navIconParent(!!isActive)} aria-hidden />
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="flex flex-col items-center gap-2.5 border-t border-white/[0.065] px-2 pb-4 pt-3.5">
            <Image
              src="/berea.png"
              alt="Berea — Software a medida"
              width={220}
              height={80}
              className="h-[4.75rem] w-[88%] max-w-none object-contain object-center opacity-95 brightness-110 contrast-[1.02]"
              unoptimized
            />
            <p className="max-w-full text-center text-[10px] leading-snug tracking-wide text-white/30">
              <span className="font-medium text-white/45">{APP_NAME}</span>
              <span className="mx-1.5 text-white/15" aria-hidden>
                ·
              </span>
              <span className="tabular-nums text-white/35">v{APP_VERSION}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
