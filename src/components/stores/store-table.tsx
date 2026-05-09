'use client'

import { useMemo } from 'react'
import { Store } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Store as StoreIcon, Crown, CircleDollarSign } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

const storeCardShell = cn(cardShell, 'dark:shadow-none')
const storeMetricIcon =
  'h-4 w-4 shrink-0 text-brand-600/90 dark:text-brand-400/90'
const storeMetricLabel =
  'text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'

interface StoreTableProps {
  stores: Store[]
  /** Ingresos del día (completadas, efectivo + transferencia) por store id. */
  salesByStore: Record<string, { revenueToday: number }>
  onEdit: (store: Store) => void
  onDelete: (store: Store) => void
  onCreate: () => void
  onRefresh: () => void
}

interface StoreCardProps {
  store: Store
  salesSummary: { revenueToday: number }
  /** Fecha legible del “hoy” usada para ingresos (hora local del navegador). */
  todayLabel: string
  isMainStore: boolean
  isCurrentStore: boolean
  isSuperAdmin: boolean
  onStoreClick: (e: React.MouseEvent) => void
  onEdit: () => void
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function StoreCard({ 
  store,
  salesSummary,
  todayLabel,
  isMainStore, 
  isCurrentStore, 
  isSuperAdmin,
  onStoreClick,
  onEdit,
}: StoreCardProps) {

  return (
    <div className="min-w-0 w-full">
      <Card
        onClick={onStoreClick}
        className={cn(
          'group relative flex w-full flex-col overflow-hidden transition-all duration-200',
          storeCardShell,
          isCurrentStore &&
            'border-indigo-300/80 shadow-md ring-2 ring-indigo-200/90 dark:border-indigo-600/60 dark:ring-indigo-800/50',
          isSuperAdmin &&
            'cursor-pointer hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600'
        )}
        title={isSuperAdmin ? `Haz click para ver los reportes de ${store.name}` : undefined}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:p-4.5">
          {isCurrentStore && (
            <span
              className="absolute right-2 top-2 z-10 rounded-full border border-indigo-200/90 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-800 dark:border-indigo-700/60 dark:bg-indigo-950/60 dark:text-indigo-200"
              title="Vista actual"
            >
              Activa
            </span>
          )}

          <div className="flex shrink-0 flex-col items-center gap-2 text-center">
            <div className="relative">
              {store.logo ? (
                <div
                  className={cn(
                    'relative h-16 w-16 overflow-hidden rounded-full border-2 border-zinc-200 bg-white shadow-sm dark:border-zinc-600',
                    isCurrentStore && 'border-indigo-400 ring-2 ring-indigo-200/90 dark:border-indigo-500 dark:ring-indigo-700/45'
                  )}
                >
                  <Image
                    src={store.logo}
                    alt={store.name}
                    fill
                    className="object-contain p-1.5"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-800/80',
                    isCurrentStore && 'border-indigo-400 ring-2 ring-indigo-200/90 dark:border-indigo-500 dark:ring-indigo-700/45'
                  )}
                >
                  <Image
                    src="/logo.ya.png"
                    alt="La Casa Artesanal"
                    width={40}
                    height={40}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              {isMainStore && (
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-zinc-900 p-1 text-zinc-100 shadow-sm dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-100">
                  <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <h3 className="line-clamp-2 w-full px-1 text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
              {store.name}
            </h3>
          </div>

          <div
            className="shrink-0"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex flex-col rounded-xl border border-solid border-zinc-200/90 bg-zinc-50/95 p-3 dark:border-zinc-700/80 dark:bg-zinc-800/35">
              <div className="flex items-center gap-1.5">
                <CircleDollarSign className={storeMetricIcon} strokeWidth={1.75} aria-hidden />
                <span className={storeMetricLabel}>Ventas del día</span>
              </div>
              <p
                className="mt-1 line-clamp-2 text-left text-xl font-bold leading-tight tabular-nums text-zinc-900 dark:text-zinc-100"
                title={`Ingresos del día: ${formatCOP(salesSummary.revenueToday)}`}
              >
                {formatCOP(salesSummary.revenueToday)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
                Hoy · {todayLabel}
              </p>
            </div>
          </div>

          <div
            data-store-card-footer
            className="flex shrink-0 items-center border-t border-solid border-zinc-200/80 pt-1.5 dark:border-zinc-700/80"
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseDown={e => {
              e.stopPropagation()
            }}
          >
            <Button
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                onEdit()
              }}
              onMouseDown={e => {
                e.stopPropagation()
              }}
              variant="outline"
              size="sm"
              className="h-8 w-full justify-center gap-1.5 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function StoreTable({
  stores,
  salesByStore,
  onEdit,
  onDelete,
  onCreate,
  onRefresh
}: StoreTableProps) {
  const router = useRouter()
  const { user, switchStore } = useAuth()
  const isSuperAdmin = user && canAccessAllStores(user)
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  
  // Determinar cuál es la tienda actualmente seleccionada
  const getCurrentStoreId = (): string | undefined => {
    if (!user) return undefined
    // Si storeId es undefined o MAIN_STORE_ID, entonces está en la tienda principal
    return user.storeId || MAIN_STORE_ID
  }
  
  const currentStoreId = getCurrentStoreId()

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  const handleStoreClick = (store: Store, e: React.MouseEvent) => {
    // Solo permitir click si es super admin y no se hizo click en los botones de acción
    if (!isSuperAdmin || !switchStore) return
    
    const target = e.target as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    
    // Si se hizo click en un botón o en sus hijos, no cambiar de tienda
    if (
      target.closest('button') || 
      target.closest('[role="button"]') ||
      target.tagName === 'BUTTON' ||
      (currentTarget.querySelector('[data-store-card-footer]')?.contains(target))
    ) {
      return
    }

    // Prevenir propagación adicional
    e.stopPropagation()
    e.preventDefault()

    // Cambiar de tienda
    const newStoreId = store.id === MAIN_STORE_ID ? MAIN_STORE_ID : store.id
    switchStore(newStoreId)
    
    // Crear slug de la tienda para la URL
    const storeSlug = store.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)
    
    // Usar setTimeout para asegurar que el estado se actualice antes de navegar
    setTimeout(() => {
      router.push(`/dashboard?store=${storeSlug}`)
    }, 0)
  }

  return (
    <Card className={cardShell}>
      <CardHeader className="space-y-0 border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 p-4 dark:border-indigo-900/35 dark:from-indigo-950/40 dark:via-zinc-950 dark:to-violet-950/25 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
              <StoreIcon className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} aria-hidden />
              Micro Tiendas
            </CardTitle>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Gestiona las micro tiendas del sistema
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button
              onClick={onCreate}
              size="sm"
              className="h-9 flex-1 bg-brand-700 text-sm font-medium text-white shadow-none hover:translate-y-0 hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 sm:flex-none"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Nueva Tienda</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {stores.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-indigo-200/90 bg-indigo-50/60 dark:border-indigo-800/60 dark:bg-indigo-950/40">
              <StoreIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400">No hay tiendas registradas</p>
            <Button
              onClick={onCreate}
              size="sm"
              className="mt-4 bg-brand-700 text-white shadow-none hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              Crear Primera Tienda
            </Button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
                {stores.map((store) => {
                  const isMainStore = store.id === MAIN_STORE_ID
                  const isCurrentStore = store.id === currentStoreId
                  const salesSummary =
                    salesByStore[store.id] ?? { revenueToday: 0 }
                  
                  return (
                    <StoreCard
                      key={store.id}
                      store={store}
                      salesSummary={salesSummary}
                      todayLabel={todayLabel}
                      isMainStore={isMainStore}
                      isCurrentStore={isCurrentStore}
                      isSuperAdmin={isSuperAdmin || false}
                      onStoreClick={(e) => handleStoreClick(store, e)}
                      onEdit={() => onEdit(store)}
                    />
                  )
                })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
