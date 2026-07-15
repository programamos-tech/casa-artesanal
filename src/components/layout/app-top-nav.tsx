'use client'

import { useEffect, useRef, useState } from 'react'
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
  SlidersHorizontal,
  Sun,
  UserCircle,
  Receipt,
  Users,
  Package,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/components/theme-provider'
import { UserAvatar } from '@/components/ui/user-avatar'
import { GlobalSearchService, type GlobalSearchHit } from '@/lib/global-search-service'
import { GlobalSearchDropdown } from '@/components/layout/global-search-dropdown'
import { isReferenceLikeQuery, minSearchLength } from '@/lib/product-search'
import { canAccessAllStores } from '@/lib/store-helper'
import {
  loadTransferAlerts,
  resolveUserStoreId,
  type TransferAlertItem,
} from '@/lib/transfer-alerts'
import { cn } from '@/lib/utils'

/** Altura única de la barra y de todos los controles interactivos */
const NAV_BAR_H = 'h-16'
const CONTROL_H = 'h-10'
/** Mismo espacio entre buscador, cada botón y la cuenta */
const NAV_GAP = 'gap-3'

const iconBtn = cn(
  'flex shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors',
  CONTROL_H,
  'w-10',
  'hover:bg-zinc-100 hover:text-zinc-800',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10',
  'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
)

const menuPanel =
  'absolute z-50 overflow-hidden rounded-xl border border-zinc-200/90 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40'

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
      <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  )
}

export function AppTopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { canView, canCreate } = usePermissions()
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

  // Campana siempre activa para usuarios logueados: se apaga solo cuando no hay
  // traslados por aprobar ni por recibir.
  const showBell = Boolean(user)

  useEffect(() => {
    let cancelled = false
    const loadPending = async () => {
      if (!user) {
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
        const data = await loadTransferAlerts(storeId, {
          allStores: canAccessAllStores(user),
        })
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
    <header
      className={cn(
        'sticky top-0 z-30 hidden shrink-0 bg-white xl:block dark:bg-zinc-950',
        NAV_BAR_H
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full max-w-[100%] items-center',
          NAV_BAR_H,
          NAV_GAP,
          'px-5 2xl:px-6'
        )}
      >
        <div ref={searchRef} className="relative min-w-0 flex-1">
          <div
            className={cn(
              'flex w-full items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-4',
              CONTROL_H,
              'transition-[border-color,background-color,box-shadow]',
              'focus-within:border-zinc-300 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]',
              'dark:border-zinc-700 dark:bg-zinc-900/60',
              'dark:focus-within:border-zinc-600 dark:focus-within:bg-zinc-900 dark:focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]'
            )}
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={2} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= minSearchLength(query)) setSearchOpen(true)
              }}
              placeholder="Ref., productos, clientes, facturas…"
              className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-[15px] leading-5 text-zinc-900 placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
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
                className="rounded-full p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
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

        <div ref={plusRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPlusOpen(v => !v)}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
              CONTROL_H,
              'w-10',
              plusOpen && 'ring-2 ring-zinc-900/15 dark:ring-white/20'
            )}
            aria-label="Acciones rápidas"
            aria-expanded={plusOpen}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </button>
          {plusOpen && quickActions.length > 0 && (
            <div className={cn(menuPanel, 'right-0 top-[calc(100%+8px)] min-w-[11rem]')}>
              {quickActions.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setPlusOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                >
                  <action.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <TopNavThemeButton />
        <button
          type="button"
          className={iconBtn}
          title="Novedades y ayuda"
          onClick={() => window.dispatchEvent(new CustomEvent('casa-artesanal:open-release-notes'))}
        >
          <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        {canView('logs') ? (
          <Link href="/logs" className={iconBtn} title="Actividades">
            <Activity className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
        ) : (
          <span className={cn(iconBtn, 'pointer-events-none opacity-30')} aria-hidden>
            <Activity className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
        )}
        <Link href="/profile" className={iconBtn} title="Perfil y ajustes">
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
        {showBell ? (
          <div ref={bellRef} className="relative shrink-0 overflow-visible">
            <button
              type="button"
              className={cn(
                iconBtn,
                'relative overflow-visible',
                alertCount > 0 && 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              )}
              title={
                alertCount > 0
                  ? `${alertCount} traslado${alertCount === 1 ? '' : 's'} pendiente${alertCount === 1 ? '' : 's'}`
                  : 'Notificaciones de traslados'
              }
              aria-label="Notificaciones de traslados"
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
            >
              <Bell
                className={cn('h-[18px] w-[18px]', alertCount > 0 && 'animate-pulse')}
                strokeWidth={alertCount > 0 ? 2.25 : 1.75}
              />
              {alertCount > 0 && (
                <>
                  <span className="absolute -right-0.5 -top-0.5 h-[18px] w-[18px] animate-ping rounded-full bg-red-400/70" aria-hidden />
                  <span className="absolute -right-0.5 -top-0.5 z-10 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                </>
              )}
            </button>
            {bellOpen && (
              <div className={cn(menuPanel, 'right-0 top-[calc(100%+8px)] w-[22rem] max-w-[calc(100vw-2rem)]')}>
                <div className="border-b border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Traslados pendientes</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    La alerta sigue hasta que se aprueben y reciban
                  </p>
                </div>
                <div className="max-h-[22rem] overflow-y-auto py-1">
                  {alertCount === 0 ? (
                    <p className="px-3.5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No hay traslados pendientes
                    </p>
                  ) : (
                    <>
                      {approvals.map((item) => (
                        <button
                          key={`a-${item.id}`}
                          type="button"
                          onClick={() => {
                            setBellOpen(false)
                            router.push(item.href)
                          }}
                          className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                            <Truck className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                              {item.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                      {receptions.map((item) => (
                        <button
                          key={`r-${item.id}`}
                          type="button"
                          onClick={() => {
                            setBellOpen(false)
                            router.push(item.href)
                          }}
                          className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                              {item.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                      {waiting.map((item) => (
                        <button
                          key={`w-${item.id}`}
                          type="button"
                          onClick={() => {
                            setBellOpen(false)
                            router.push(item.href)
                          }}
                          className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                            <Clock className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                              {item.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {alertCount > 0 && (
                  <div className="border-t border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                    {(approvals.length > 0 || waiting.length > 0) && (
                      <Link
                        href="/inventory/transfers"
                        onClick={() => setBellOpen(false)}
                        className="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
                      >
                        Ver traslados
                      </Link>
                    )}
                    {receptions.length > 0 && (
                      <Link
                        href="/inventory/receptions"
                        onClick={() => setBellOpen(false)}
                        className="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      >
                        Ver recepciones
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className={cn(iconBtn, 'relative opacity-30')} aria-hidden>
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
        )}

        <div ref={userRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setUserOpen(v => !v)}
            className={cn(
              'flex items-center rounded-full transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
              CONTROL_H,
              'gap-2 pl-1 pr-2'
            )}
            aria-expanded={userOpen}
            aria-haspopup="menu"
          >
            <span className="hidden max-w-[12rem] truncate text-[15px] font-semibold leading-5 text-zinc-900 xl:inline dark:text-zinc-100">
              {displayName}
            </span>
            <UserAvatar name={displayName} size="md" className="ring-1 ring-zinc-200/80 dark:ring-zinc-700" />
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500', userOpen && 'rotate-180')}
              strokeWidth={2}
            />
          </button>
          {userOpen && (
            <div className={cn(menuPanel, 'right-0 top-[calc(100%+8px)] min-w-[12rem]')}>
              <Link
                href="/profile"
                onClick={() => setUserOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
              >
                <UserCircle className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
                Mi perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  setUserOpen(false)
                  logout()
                  router.push('/login')
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
