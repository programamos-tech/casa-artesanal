'use client'

import Link from 'next/link'
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
  LogOut,
  ShieldCheck,
  UserCircle,
  UserCog,
  Store,
  Warehouse,
  ArrowRightLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { Logo } from './logo'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { APP_VERSION } from '@/config/app-meta'
import type { Store } from '@/types/store'
import { UserAvatar } from '@/components/ui/user-avatar'
import { SidebarThemeToggle } from '@/components/ui/sidebar-theme-toggle'

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
      { name: 'Tiendas', href: '/stores', icon: Store, module: 'roles', requiresAllStoresAccess: true },
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
  const { user, logout } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [pendingReceptionsCount, setPendingReceptionsCount] = useState(0)
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

  // Cargar información de la tienda del usuario
  useEffect(() => {
    const loadStoreInfo = async () => {
      if (user?.storeId) {
        try {
          const store = await StoresService.getStoreById(user.storeId)
          setCurrentStore(store)
        } catch (error) {
          console.error('Error loading store info:', error)
        }
      } else {
        // Si no tiene storeId, es de la tienda principal
        try {
          const mainStore = await StoresService.getMainStore()
          setCurrentStore(mainStore)
        } catch (error) {
          console.error('Error loading main store:', error)
        }
      }
    }

    if (user) {
      loadStoreInfo()
    }
  }, [user])

  // Contador de recepciones pendientes para badge en sidebar.
  useEffect(() => {
    let cancelled = false
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

    const loadPendingReceptionsCount = async () => {
      if (!user) {
        setPendingReceptionsCount(0)
        return
      }

      const storeId = isMainStoreUser(user) ? MAIN_STORE_ID : user.storeId
      if (!storeId) {
        setPendingReceptionsCount(0)
        return
      }

      try {
        const result = await StoreStockTransferService.getPendingTransfers(storeId, 1, 1)
        if (!cancelled) {
          setPendingReceptionsCount(result.total || 0)
        }
      } catch (error) {
        if (!cancelled) setPendingReceptionsCount(0)
      }
    }

    void loadPendingReceptionsCount()
    const interval = setInterval(() => {
      void loadPendingReceptionsCount()
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
              'border-b border-[#1c1c1f] px-1 py-2 transition-colors dark:border-zinc-800'
            )}
          >
            <Link
              href="/dashboard"
              className="relative flex flex-col items-center transition-opacity hover:opacity-90"
            >
              <div className="relative">
                {currentStore?.logo ? (
                  <img
                    src={currentStore.logo}
                    alt={currentStore.name}
                    className="h-11 w-11 object-cover"
                  />
                ) : (
                  <Logo size="lg" />
                )}
              </div>
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
              if (item.requiresAllStoresAccess && !isStoresModule && !canAccessAllStores(user)) return null
              
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
                'bg-[#1c1c1f] text-zinc-50 ring-1 ring-[#2a2a2d] dark:bg-zinc-800 dark:text-zinc-50 dark:ring-1 dark:ring-zinc-700'
              const rowInactive =
                'text-zinc-400 hover:bg-[#17171a] hover:text-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'

              const getIconColorForItem = (active: boolean) =>
                active
                  ? 'text-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 group-hover:text-zinc-200 dark:text-zinc-500 dark:group-hover:text-zinc-200'

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
                          'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive || isSubmenuActive ? rowActive : rowInactive
                        )}
                      >
                        <div className="flex flex-1 items-center">
                          <item.icon
                            strokeWidth={1.5}
                            className={cn(
                              'mr-2.5 h-4 w-4 shrink-0 transition-colors',
                              getIconColorForItem(!!(isActive || isSubmenuActive))
                            )}
                          />
                          <span className="flex-1 truncate text-left">{item.name}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-500" />
                        ) : (
                          <ChevronRight strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-500" />
                        )}
                      </button>
                      {isExpanded && item.submenu && (
                        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-[#1f1f22] pl-2 dark:border-zinc-700">
                          {item.submenu.map((subitem) => {
                            if (!canView(subitem.module)) return null
                            
                            // Permitir "Transferencias" en microtiendas a usuarios con acceso global (admin/superadmin).
                            // Solo usuarios sin acceso global quedan limitados a recepciones.
                            if (subitem.href === '/inventory/transfers' && !isMainStoreUser(user) && !canAccessAllStores(user)) return null
                            
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

                            const getSubitemIconColor = (href: string) => {
                              if (href === '/stores' && isMainStoreUser(user)) {
                                return isSubActive
                                  ? 'text-zinc-50 dark:text-zinc-50'
                                  : 'text-zinc-500 group-hover:text-zinc-200 dark:text-zinc-500 dark:group-hover:text-zinc-200'
                              }
                              return isSubActive
                                ? 'text-zinc-50 dark:text-zinc-50'
                                : 'text-zinc-500 group-hover:text-zinc-200 dark:text-zinc-500 dark:group-hover:text-zinc-200'
                            }
                            
                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  'group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                                  isSubActive ? rowActive : rowInactive
                                )}
                              >
                                <subitem.icon
                                  strokeWidth={1.5}
                                  className={cn(
                                    'mr-2 h-3.5 w-3.5 shrink-0 transition-colors',
                                    getSubitemIconColor(subitem.href)
                                  )}
                                />
                                <span className="flex-1 truncate">{subitem.name}</span>
                                {subitem.href === '/inventory/receptions' && pendingReceptionsCount > 0 && (
                                  <span
                                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
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
                          className={cn(
                            'group flex cursor-not-allowed items-center rounded-md px-3 py-2 text-sm font-medium opacity-50 transition-colors',
                            'text-zinc-600 dark:text-zinc-600'
                          )}
                          title="Solo disponible para Super Administradores"
                        >
                          <item.icon strokeWidth={1.5} className="mr-2.5 h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-600" />
                          <span className="flex-1 truncate">{item.name}</span>
                        </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? rowActive : rowInactive
                      )}
                    >
                      <item.icon
                        strokeWidth={1.5}
                        className={cn(
                          'mr-2.5 h-4 w-4 shrink-0 transition-colors',
                          getIconColorForItem(isActive)
                        )}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="border-t border-[#1c1c1f] px-2.5 py-2 dark:border-zinc-800">
            <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Apariencia
            </p>
            <SidebarThemeToggle className="w-full" />
          </div>

          {/* User info */}
          <div className="border-t border-[#1c1c1f] p-2.5 dark:border-zinc-800">
            <div className="flex items-center justify-between rounded-md bg-[#17171a] px-2 py-1 transition-colors hover:bg-[#1f1f22] dark:bg-zinc-900 dark:hover:bg-zinc-900/90">
              <div className="flex min-w-0 flex-1 items-center">
                <div className="shrink-0">
                  <UserAvatar
                    name={user?.name || 'Usuario'}
                    seed={user?.id}
                    size="sm"
                    className="ring-1 ring-[#2a2a2d] dark:ring-zinc-700"
                  />
                </div>
                <div className="ml-2.5 min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100 dark:text-zinc-100">
                    {user?.name || 'Diego Admin'}
                  </p>
                  <p className="truncate text-xs text-zinc-400 dark:text-zinc-400">
                    {user?.role === 'superadmin' ? 'Super Admin' : 
                     user?.role === 'admin' ? 'Admin' :
                     user?.role === 'vendedor' ? 'Vendedor' :
                     user?.role === 'cajero' ? 'Cajero' :
                     user?.role === 'inventario' ? 'Inventario' :
                     user?.role === 'contador' ? 'Contador' : 'Usuario'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-1 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Cerrar sesión"
                type="button"
              >
                <LogOut strokeWidth={1.5} className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-2.5 pb-3 pt-1">
            <p className="font-programamos-brand text-center text-[11px] font-medium leading-snug tracking-wide text-zinc-500 dark:text-zinc-500">
              powered by{' '}
              <a
                href="https://programamos-st.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                programamos
              </a>
              <span className="mx-1.5 text-zinc-400 dark:text-zinc-600" aria-hidden>
                ·
              </span>
              <span className="text-zinc-500 tabular-nums dark:text-zinc-500">{`V${APP_VERSION}`}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
