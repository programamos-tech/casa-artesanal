'use client'

import { useMemo } from 'react'
import { Store } from '@/types'
import { ChevronRight, Crown, Pencil, Plus, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/dashboard/report-ui'

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

interface StoreTableProps {
  stores: Store[]
  /** Ingresos del día (completadas, sin créditos) por store id. */
  salesByStore: Record<string, { revenueToday: number }>
  onEdit: (store: Store) => void
  onDelete: (store: Store) => void
  onCreate: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function StoreLogo({ store }: { store: Store }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-white/[0.04]">
      <Image
        src={store.logo || '/logo.ya.png'}
        alt={store.name}
        fill
        className="object-contain p-1"
        unoptimized
      />
    </span>
  )
}

function StoreTags({ isMain, isCurrent }: { isMain: boolean; isCurrent: boolean }) {
  if (!isMain && !isCurrent) return null
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
      {isMain && (
        <span className="inline-flex items-center gap-1">
          <Crown className="h-3 w-3 text-amber-500 dark:text-amber-400" strokeWidth={2} />
          Principal
        </span>
      )}
      {isCurrent && (
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone="success" />
          Vista actual
        </span>
      )}
    </span>
  )
}

function storeLocation(store: Store) {
  return [store.address, store.city].filter((v) => v && v.trim()).join(' · ')
}

export function StoreTable({
  stores,
  salesByStore,
  onEdit,
  onCreate,
  onRefresh,
  isRefreshing = false,
}: StoreTableProps) {
  const router = useRouter()
  const { user, switchStore } = useAuth()
  const isSuperAdmin = Boolean(user && canAccessAllStores(user))
  const currentStoreId = user ? user.storeId || MAIN_STORE_ID : undefined

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    []
  )

  const totalToday = stores.reduce((sum, s) => sum + (salesByStore[s.id]?.revenueToday ?? 0), 0)

  const goToStore = (store: Store) => {
    if (!isSuperAdmin || !switchStore) return
    switchStore(store.id === MAIN_STORE_ID ? MAIN_STORE_ID : store.id)

    const storeSlug = store.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)

    setTimeout(() => {
      router.push(`/dashboard?store=${storeSlug}`)
    }, 0)
  }

  const handleRowClick = (store: Store, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    goToStore(store)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">Tiendas</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">
            {stores.length} tienda{stores.length === 1 ? '' : 's'}
            <span className="text-zinc-300 dark:text-white/20"> · </span>
            Hoy {todayLabel}:{' '}
            <span className="font-medium tabular-nums text-zinc-900 dark:text-white">{formatCOP(totalToday)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={headerIconBtnClass}
            title="Actualizar"
            aria-label="Actualizar"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nueva tienda
          </button>
        </div>
      </div>

      <div className="mt-5">
        {stores.length === 0 ? (
          <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No hay tiendas registradas</p>
            <button type="button" onClick={onCreate} className={cn(headerPrimaryBtnClass, 'mt-4')}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Crear primera tienda
            </button>
          </div>
        ) : (
          <>
            <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
              {stores.map((store) => {
                const isMain = store.id === MAIN_STORE_ID
                const isCurrent = store.id === currentStoreId
                const location = storeLocation(store)
                return (
                  <div
                    key={store.id}
                    onClick={(e) => handleRowClick(store, e)}
                    className={cn(
                      'casa-artesanal-preserve-surface flex items-start gap-3 px-4 py-3',
                      isSuperAdmin && 'cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    )}
                  >
                    <StoreLogo store={store} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{store.name}</p>
                      <StoreTags isMain={isMain} isCurrent={isCurrent} />
                      {location ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{location}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Hoy{' '}
                        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatCOP(salesByStore[store.id]?.revenueToday ?? 0)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(store)}
                      className={rowIconBtnClass}
                      title="Editar"
                      aria-label={`Editar ${store.name}`}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <th className={thClass}>Tienda</th>
                    <th className={thClass}>Ubicación</th>
                    <th className={thClass}>Teléfono</th>
                    <th className={thClass}>NIT</th>
                    <th className={cn(thClass, 'text-right')}>Ingresos hoy</th>
                    <th className="w-20 px-2 py-2.5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => {
                    const isMain = store.id === MAIN_STORE_ID
                    const isCurrent = store.id === currentStoreId
                    const location = storeLocation(store)
                    return (
                      <tr
                        key={store.id}
                        onClick={(e) => handleRowClick(store, e)}
                        title={isSuperAdmin ? `Ver reportes de ${store.name}` : undefined}
                        className={cn(
                          'casa-artesanal-preserve-surface border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80',
                          isSuperAdmin && 'cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                        )}
                      >
                        <td className={tdClass}>
                          <div className="flex items-center gap-3">
                            <StoreLogo store={store} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{store.name}</p>
                              <StoreTags isMain={isMain} isCurrent={isCurrent} />
                            </div>
                          </div>
                        </td>
                        <td className={cn(tdClass, 'max-w-[18rem]')}>
                          {location ? (
                            <span className="line-clamp-2 text-zinc-600 dark:text-zinc-300">{location}</span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                          {store.phone || <span className="text-zinc-400">—</span>}
                        </td>
                        <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                          {store.nit || <span className="text-zinc-400">—</span>}
                        </td>
                        <td className={cn(tdClass, 'whitespace-nowrap text-right font-semibold tabular-nums')}>
                          {formatCOP(salesByStore[store.id]?.revenueToday ?? 0)}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => onEdit(store)}
                              className={rowIconBtnClass}
                              title="Editar"
                              aria-label={`Editar ${store.name}`}
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => goToStore(store)}
                                className={rowIconBtnClass}
                                title="Ver reportes"
                                aria-label={`Ver reportes de ${store.name}`}
                              >
                                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
