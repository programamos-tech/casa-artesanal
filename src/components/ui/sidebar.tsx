'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores, getCurrentUserStoreId } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { loadTransferAlerts, resolveUserStoreId } from '@/lib/transfer-alerts'
import { APP_NAME, APP_SIDEBAR_LOGO, POWERED_BY_LOGO, POWERED_BY_NAME } from '@/config/app-meta'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'
import { FABRICA_NAV } from '@/components/fabrica/fabrica-nav'
import type { Store } from '@/types/store'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

type NavItem = {
  name: string
  href: string
  module: string
  requiresAllStoresAccess?: boolean
}

type NavGroup = {
  label: string
  /** Si el usuario no puede ver este módulo, el grupo completo se oculta. */
  module: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    label: 'General',
    module: 'dashboard',
    items: [{ name: 'Reportes', href: '/dashboard', module: 'dashboard' }],
  },
  {
    label: 'Inventario',
    module: 'products',
    items: [
      { name: 'Productos', href: '/inventory/products', module: 'products' },
      ...(isTransfersAndReceptionsEnabled()
        ? [
            { name: 'Traslados', href: '/inventory/transfers', module: 'transfers' },
            { name: 'Recepciones', href: '/inventory/receptions', module: 'receptions' },
          ]
        : []),
    ],
  },
  {
    label: 'Comercial',
    module: 'clients',
    items: [
      { name: 'Clientes', href: '/clients', module: 'clients' },
      { name: 'Ventas', href: '/sales', module: 'sales' },
      { name: 'Créditos', href: '/payments', module: 'payments' },
      { name: 'Proveedores', href: '/purchases/invoices', module: 'supplier_invoices' },
      { name: 'Egresos', href: '/egresos', module: 'egresos' },
      { name: 'Caja', href: '/caja', module: 'cash_register' },
    ],
  },
  {
    label: 'Administración',
    module: 'roles',
    items: [
      { name: 'Tiendas', href: '/stores', module: 'roles', requiresAllStoresAccess: true },
      { name: 'Roles', href: '/roles', module: 'roles' },
      { name: 'Actividades', href: '/logs', module: 'logs' },
    ],
  },
  {
    label: 'Cuenta',
    module: 'dashboard',
    items: [{ name: 'Perfil', href: '/profile', module: 'dashboard' }],
  },
]

const workspaceTabClass = 'casa-artesanal-preserve-surface flex-1 rounded-md border py-[7px] text-center text-[13px] transition-colors'
const workspaceTabActiveClass = 'border-white/[0.12] bg-[#0a0a0b] font-semibold text-white'
const workspaceTabIdleClass = 'border-transparent text-white/50 hover:text-white'

const navGroupLabelClass = 'px-3 pb-1.5 pt-5 text-xs font-medium uppercase tracking-[0.06em] text-white/40'
const navItemClass = 'casa-artesanal-preserve-surface flex items-center rounded-md px-3 py-2 text-sm transition-colors'
const navItemActiveClass = 'bg-white/[0.1] font-semibold text-white'
const navItemIdleClass = 'text-white/70 hover:bg-white/[0.05] hover:text-white'

function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/dashboard') return pathname === '/dashboard'
  if (href === '/fabrica') return pathname === '/fabrica'
  if (href === '/purchases/invoices') return pathname.startsWith('/purchases')
  return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`)
}

/** "La Casa Artesanal Parque" → "Tienda El Parque"; "La Casa Artesanal 2 Piso" → "Tienda 2 Piso". */
export function storeLabel(name: string): string {
  const short = name.replace(/^\s*la\s+casa\s+artesanal\s*/i, '').trim()
  if (!short) return name
  return `Tienda ${/^parque$/i.test(short) ? 'El Parque' : short}`
}

/** Detalles y formularios (/sales/new, /sales/[id]…) pertenecen a la tienda anterior: al cambiar de tienda se vuelve al listado del módulo. */
export function storeSwitchHref(pathname: string | null, store: Pick<Store, 'name'>): string {
  const moduleHref =
    navigation.flatMap((g) => g.items).find((item) => isPathActive(pathname, item.href))?.href ?? '/dashboard'
  return `${moduleHref}?store=${storeSlug(store.name)}`
}

function storeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
}

interface SidebarProps {
  className?: string
  onMobileMenuToggle?: (isOpen: boolean) => void
}

export function Sidebar({ className, onMobileMenuToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { canView } = usePermissions()
  const { user, switchStore } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [pendingReceptionsCount, setPendingReceptionsCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const canSwitchStores = canAccessAllStores(user)
  const isFactory = canSwitchStores && (pathname?.startsWith('/fabrica') ?? false)

  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen)
  }, [isMobileMenuOpen, onMobileMenuToggle])

  useEffect(() => {
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

  useEffect(() => {
    if (!canSwitchStores) {
      setStores([])
      return
    }
    let cancelled = false
    StoresService.getAllStores()
      .then((list) => {
        if (!cancelled) setStores(list)
      })
      .catch(() => {
        if (!cancelled) setStores([])
      })
    return () => {
      cancelled = true
    }
  }, [canSwitchStores])

  useEffect(() => {
    let cancelled = false

    const loadPendingCounts = async () => {
      if (!user || !isTransfersAndReceptionsEnabled()) {
        setPendingReceptionsCount(0)
        setPendingApprovalsCount(0)
        return
      }

      const storeId = resolveUserStoreId(user.storeId)

      try {
        const { approvalTotal, receptionTotal } = await loadTransferAlerts(storeId)
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
    }, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user?.id, user?.storeId, user?.role, pathname])

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

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    if (!store || !switchStore) return
    switchStore(store.id)
    setIsMobileMenuOpen(false)
    router.replace(storeSwitchHref(pathname, store), { scroll: false })
  }

  const activeStoreId = currentStore?.id ?? MAIN_STORE_ID

  const badgeFor = (href: string): number => {
    if (href === '/inventory/transfers') return pendingApprovalsCount
    if (href === '/inventory/receptions') return pendingReceptionsCount
    return 0
  }

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'casa-artesanal-preserve-surface fixed inset-y-0 left-0 z-40 w-60 transform overflow-hidden border-r border-white/[0.07] bg-[#111113] transition-transform duration-300 ease-in-out xl:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        /* Cerrado en móvil/tablet: sin pointer-events para que WebKit no intercepte toques en la barra inferior (z-40 compartida con bottom nav). */
        !isMobileMenuOpen && 'max-xl:pointer-events-none',
        className
      )}
    >
      <div className="flex h-full flex-col px-3 pb-3 pt-4">
        <Link
          href="/dashboard"
          aria-label={APP_NAME}
          className="flex justify-center px-1 transition-opacity hover:opacity-90"
        >
          <Image
            src={APP_SIDEBAR_LOGO}
            alt={APP_NAME}
            width={480}
            height={300}
            className="h-auto w-[88px]"
            priority
            unoptimized
          />
        </Link>

        <div className="mt-3">
          {isFactory ? (
            <p className="flex h-9 items-center truncate rounded-md border border-white/[0.12] px-3 text-[13px] font-medium text-white/90">
              Planta de producción
            </p>
          ) : canSwitchStores && stores.length > 1 ? (
            <div className="relative">
              <select
                value={activeStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                aria-label="Tienda activa"
                className="casa-artesanal-preserve-surface h-9 w-full cursor-pointer appearance-none truncate rounded-md border border-white/[0.12] bg-[#111113] py-1 pl-3 pr-8 text-[13px] font-medium text-white/90 focus:border-white/25 focus:outline-none"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id} className="bg-zinc-900 text-white">
                    {storeLabel(store.name)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                aria-hidden
              />
            </div>
          ) : currentStore?.name ? (
            <p className="truncate px-1 text-[13px] text-white/60" title={currentStore.name}>
              {storeLabel(currentStore.name)}
            </p>
          ) : null}
        </div>

        <div
          className="casa-artesanal-preserve-surface mt-3 flex gap-0.5 rounded-lg bg-white/[0.06] p-0.5"
          role="group"
          aria-label="Espacio de trabajo"
        >
          <Link
            href="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-current={!isFactory ? 'page' : undefined}
            className={cn(workspaceTabClass, !isFactory ? workspaceTabActiveClass : workspaceTabIdleClass)}
          >
            Tiendas
          </Link>
          {canSwitchStores ? (
            <Link
              href="/fabrica"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-current={isFactory ? 'page' : undefined}
              className={cn(workspaceTabClass, isFactory ? workspaceTabActiveClass : workspaceTabIdleClass)}
            >
              Fábrica
            </Link>
          ) : (
            <span
              className="flex flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-transparent py-[7px] text-center text-[13px] text-white/40"
              title="El módulo de Fábrica estará disponible pronto"
            >
              Fábrica
              <span className="text-[10px] uppercase tracking-wide text-white/35">Pronto</span>
            </span>
          )}
        </div>

        <nav className="scrollbar-hide -mx-1 mt-2 flex-1 overflow-y-auto px-1">
          {isFactory
            ? FABRICA_NAV.map((group) => (
                <div key={group.label}>
                  <p className={navGroupLabelClass}>{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(navItemClass, isPathActive(pathname, item.href) ? navItemActiveClass : navItemIdleClass)}
                      >
                        <span className="flex-1 truncate">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            : null}
          {!isFactory && navigation.map((group) => {
            if (!canView(group.module)) return null
            const items = group.items.filter((item) => {
              if (!canView(item.module)) return false
              if (item.requiresAllStoresAccess && !canAccessAllStores(user)) return false
              return true
            })
            if (items.length === 0) return null

            return (
              <div key={group.label}>
                <p className={navGroupLabelClass}>{group.label}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = isPathActive(pathname, item.href)
                    const badge = badgeFor(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(navItemClass, active ? navItemActiveClass : navItemIdleClass)}
                      >
                        <span className="flex-1 truncate">{item.name}</span>
                        {badge > 0 && (
                          <span
                            className="casa-artesanal-preserve-surface ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                            title={
                              item.href === '/inventory/transfers'
                                ? `${badge} por aprobar`
                                : `${badge} pendientes por gestionar`
                            }
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="mt-2 flex flex-col items-center gap-1.5 border-t border-white/[0.07] pb-1 pt-3">
          <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-white/35">
            Powered by
          </span>
          <Image
            src={POWERED_BY_LOGO}
            alt={POWERED_BY_NAME}
            width={480}
            height={213}
            className="h-auto w-[52px]"
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}
