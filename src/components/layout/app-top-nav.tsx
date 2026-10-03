'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  Bell,
  ChevronDown,
  Truck,
  CircleHelp,
  Clock,
  LogOut,
  PackageCheck,
  Plus,
  Search,
  Sun,
  UserCircle,
  Receipt,
  Users,
  Package,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'
import { useTheme } from '@/components/theme-provider'
import { UserAvatar } from '@/components/ui/user-avatar'
import { GlobalSearchService, type GlobalSearchHit } from '@/lib/global-search-service'
import { GlobalSearchDropdown } from '@/components/layout/global-search-dropdown'
import { isReferenceLikeQuery, minSearchLength } from '@/lib/product-search'
import {
  loadTransferAlerts,
  resolveUserStoreId,
  type TransferAlertItem,
} from '@/lib/transfer-alerts'
import { cn } from '@/lib/utils'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'
import { APP_NAME, APP_SIDEBAR_LOGO } from '@/config/app-meta'

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/15'

const menuPanel =
  'casa-artesanal-preserve-surface absolute z-50 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#111113] dark:shadow-black/50'

const menuItem =
  'casa-artesanal-preserve-surface flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-white/75 dark:hover:bg-white/[0.05] dark:hover:text-white'

const menuIcon = 'h-4 w-4 shrink-0 text-zinc-400 dark:text-white/40'

function TopNavThemeButton({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      className={cn(iconBtn, className)}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4" strokeWidth={1.5} aria-hidden />
    </button>
  )
}

export function AppTopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { canView, canCreate } = usePermissions()
  const { ensureCashReady } = useCashOperationGate()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GlobalSearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [approvals, setApprovals] = useState<TransferAlertItem[]>([])
  const [receptions, setReceptions] = useState<TransferAlertItem[]>([])
  const [waiting, setWaiting] = useState<TransferAlertItem[]>([])
  const [alertCount, setAlertCount] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const plusRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const searchSeqRef = useRef(0)

  // Campana de traslados/recepciones (módulo apagado → no mostrar)
  const showBell = Boolean(user) && isTransfersAndReceptionsEnabled()

  useEffect(() => {
    let cancelled = false
    const loadPending = async () => {
      if (!user || !isTransfersAndReceptionsEnabled()) {
        if (!cancelled) {
          setApprovals([])
          setReceptions([])
          setWaiting([])
          setAlertCount(0)
        }
        return
      }
      try {
        const storeId = resolveUserStoreId(user.storeId)
        // Las notificaciones siempre pertenecen a la tienda activa, incluso para superadmin.
        const data = await loadTransferAlerts(storeId)
        if (!cancelled) {
          setApprovals(data.approvals)
          setReceptions(data.receptions)
          setWaiting(data.waiting)
          // Contador de la campana: aprobar + recibir (hasta que estén cerrados).
          // Si no hay acción propia pero hay solicitudes en espera, también avisa.
          setAlertCount(
            data.actionTotal > 0 ? data.actionTotal : data.waitingTotal
          )
        }
      } catch {
        if (!cancelled) {
          setApprovals([])
          setReceptions([])
          setWaiting([])
          setAlertCount(0)
        }
      }
    }
    void loadPending()
    const interval = setInterval(() => void loadPending(), 15000)
    const onFocus = () => void loadPending()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [user?.id, user?.storeId, user?.role, pathname])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false)
      if (plusRef.current && !plusRef.current.contains(t)) setPlusOpen(false)
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false)
      if (bellRef.current && !bellRef.current.contains(t)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    const minLen = minSearchLength(q)
    if (q.length < minLen) {
      setHits([])
      setSearchOpen(false)
      setSearching(false)
      return
    }

    const seq = ++searchSeqRef.current
    setSearching(true)
    setSearchOpen(true)

    const delay = isReferenceLikeQuery(q) ? 80 : 180
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const results = await GlobalSearchService.search(q, {
            clients: canView('clients'),
            products: canView('products'),
            sales: canView('sales'),
            credits: canView('payments'),
            transfers: canView('transfers'),
            supplier_invoices: canView('supplier_invoices'),
          })
          if (searchSeqRef.current !== seq) return
          setHits(results)
        } catch {
          if (searchSeqRef.current === seq) setHits([])
        } finally {
          if (searchSeqRef.current === seq) setSearching(false)
        }
      })()
    }, delay)

    return () => clearTimeout(timer)
  }, [query, user?.id, user?.storeId])

  const navigateHit = (hit: GlobalSearchHit) => {
    setSearchOpen(false)
    setQuery('')
    setHits([])
    router.push(hit.href)
  }

  const quickActions = [
    canCreate('sales') && canView('sales')
      ? { label: 'Nueva venta', href: '/sales/new', icon: Receipt }
      : null,
    canCreate('clients') && canView('clients')
      ? { label: 'Nuevo cliente', href: '/clients', icon: Users }
      : null,
    canCreate('products') && canView('products')
      ? { label: 'Nuevo producto', href: '/inventory/products', icon: Package }
      : null,
  ].filter(Boolean) as { label: string; href: string; icon: typeof Receipt }[]

  const displayName = user?.name?.trim() || 'Usuario'

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-zinc-200 bg-white dark:border-white/[0.07] dark:bg-zinc-950 xl:h-16">
      <div className="relative flex h-14 w-full items-center gap-2 px-3 md:gap-4 md:px-5 xl:h-16 2xl:px-6">
        <Link
          href="/dashboard"
          aria-label={APP_NAME}
          className="shrink-0 transition-opacity hover:opacity-80 xl:hidden"
        >
          <Image src={APP_SIDEBAR_LOGO} alt={APP_NAME} width={480} height={300} className="h-8 w-auto" priority unoptimized />
        </Link>

        <div
          ref={searchRef}
          className="relative min-w-0 max-w-xs flex-1 xl:max-w-sm"
        >
          <div
            className={cn(
              'casa-artesanal-preserve-surface flex h-8 w-full items-center gap-2 rounded-md border border-zinc-200 px-2.5 transition-colors',
              'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/35" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= minSearchLength(query)) setSearchOpen(true)
              }}
              placeholder="Buscar…"
              className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
              aria-label="Buscar en el sistema"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setHits([])
                  setSearchOpen(false)
                }}
                className="p-0.5 text-zinc-400 transition-colors hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {searchOpen && query.trim().length >= 2 && (
            <GlobalSearchDropdown
              hits={hits}
              searching={searching}
              query={query}
              onSelect={navigateHit}
            />
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 md:gap-1">
          {quickActions.length > 0 && (
            <div ref={plusRef} className="relative mx-1 shrink-0 md:ml-0 md:mr-2">
              <button
                type="button"
                onClick={() => setPlusOpen(v => !v)}
                className="casa-artesanal-preserve-surface inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-md bg-zinc-900 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 md:w-auto md:px-3"
                aria-label="Acciones rápidas"
                aria-expanded={plusOpen}
              >
                <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2} />
                <span className="hidden md:inline">Nuevo</span>
                <ChevronDown
                  className={cn('hidden h-3.5 w-3.5 opacity-60 transition-transform md:block', plusOpen && 'rotate-180')}
                  strokeWidth={2}
                />
              </button>
              {plusOpen && (
                <div className={cn(menuPanel, 'right-0 top-[calc(100%+6px)] min-w-[11rem]')}>
                  {quickActions.map(action => (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={(e) => {
                        if (action.href !== '/sales/new') {
                          setPlusOpen(false)
                          return
                        }
                        e.preventDefault()
                        setPlusOpen(false)
                        void (async () => {
                          const ok = await ensureCashReady('sale')
                          if (ok) router.push('/sales/new')
                        })()
                      }}
                      className={menuItem}
                    >
                      <action.icon className={menuIcon} strokeWidth={1.5} />
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <TopNavThemeButton />
          <button
            type="button"
            className={cn(iconBtn, 'hidden md:flex')}
            title="Novedades y ayuda"
            aria-label="Novedades y ayuda"
            onClick={() => window.dispatchEvent(new CustomEvent('casa-artesanal:open-release-notes'))}
          >
            <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {canView('logs') ? (
            <Link href="/logs" className={cn(iconBtn, 'hidden md:flex')} title="Actividades" aria-label="Actividades">
              <Activity className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          ) : null}
          {showBell ? (
            <div ref={bellRef} className="relative shrink-0 overflow-visible">
              <button
                type="button"
                className={cn(iconBtn, 'relative overflow-visible', alertCount > 0 && 'text-zinc-900 dark:text-white')}
                title={
                  alertCount > 0
                    ? `${alertCount} traslado${alertCount === 1 ? '' : 's'} pendiente${alertCount === 1 ? '' : 's'}`
                    : 'Notificaciones de traslados'
                }
                aria-label="Notificaciones de traslados"
                aria-expanded={bellOpen}
                onClick={() => setBellOpen((v) => !v)}
              >
                <Bell className="h-4 w-4" strokeWidth={1.5} />
                {alertCount > 0 && (
                  <span
                    className="casa-artesanal-preserve-surface absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-zinc-950"
                    aria-hidden
                  >
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className={cn(menuPanel, 'right-0 top-[calc(100%+6px)] w-[22rem] max-w-[calc(100vw-2rem)]')}>
                  <div className="border-b border-zinc-100 px-3.5 py-2.5 dark:border-white/[0.06]">
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">Traslados pendientes</p>
                  </div>
                  <div className="max-h-[22rem] overflow-y-auto py-1">
                    {alertCount === 0 ? (
                      <p className="px-3.5 py-6 text-center text-[13px] text-zinc-500 dark:text-white/50">
                        No hay traslados pendientes
                      </p>
                    ) : (
                      <>
                        {[
                          ...approvals.map((item) => ({ item, key: `a-${item.id}`, Icon: Truck })),
                          ...receptions.map((item) => ({ item, key: `r-${item.id}`, Icon: PackageCheck })),
                          ...waiting.map((item) => ({ item, key: `w-${item.id}`, Icon: Clock })),
                        ].map(({ item, key, Icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setBellOpen(false)
                              router.push(item.href)
                            }}
                            className={cn(menuItem, 'items-start py-2.5')}
                          >
                            <Icon className={cn(menuIcon, 'mt-0.5')} strokeWidth={1.5} />
                            <span className="min-w-0">
                              <span className="block font-medium text-zinc-900 dark:text-white">{item.title}</span>
                              <span className="block text-xs text-zinc-500 dark:text-white/50">{item.subtitle}</span>
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  {alertCount > 0 && (
                    <div className="flex gap-1 border-t border-zinc-100 px-2 py-1.5 dark:border-white/[0.06]">
                      {(approvals.length > 0 || waiting.length > 0) && (
                        <Link
                          href="/inventory/transfers"
                          onClick={() => setBellOpen(false)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white"
                        >
                          Ver traslados
                        </Link>
                      )}
                      {receptions.length > 0 && (
                        <Link
                          href="/inventory/receptions"
                          onClick={() => setBellOpen(false)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white"
                        >
                          Ver recepciones
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <span className="mx-2 hidden h-5 w-px bg-zinc-200 dark:bg-white/[0.1] md:block" aria-hidden />

          <div ref={userRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setUserOpen(v => !v)}
              className="casa-artesanal-preserve-surface flex h-9 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
              aria-expanded={userOpen}
              aria-haspopup="menu"
            >
              <UserAvatar name={displayName} seed={user?.id} size="xs" />
              <span className="hidden max-w-[12rem] truncate text-[13px] font-medium text-zinc-900 dark:text-white lg:inline">
                {displayName}
              </span>
              <ChevronDown
                className={cn('hidden h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform dark:text-white/40 md:block', userOpen && 'rotate-180')}
                strokeWidth={2}
              />
            </button>
            {userOpen && (
              <div className={cn(menuPanel, 'right-0 top-[calc(100%+6px)] min-w-[14rem]')}>
                <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/[0.06]">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{displayName}</p>
                  {user?.email ? (
                    <p className="truncate text-xs text-zinc-500 dark:text-white/50">{user.email}</p>
                  ) : null}
                </div>
                <div className="py-1">
                  <Link href="/profile" onClick={() => setUserOpen(false)} className={menuItem}>
                    <UserCircle className={menuIcon} strokeWidth={1.5} />
                    Mi perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserOpen(false)
                      logout()
                      router.push('/login')
                    }}
                    className={cn(menuItem, 'hover:text-rose-600 dark:hover:text-rose-400 [&>svg]:hover:text-rose-500')}
                  >
                    <LogOut className={menuIcon} strokeWidth={1.5} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
