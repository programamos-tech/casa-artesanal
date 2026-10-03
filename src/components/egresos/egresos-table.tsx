'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, RefreshCw, Pencil, Ban, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Egreso, EgresoKind } from '@/types'
import {
  EGRESO_CONCEPTS,
  formatPeriodMonth,
  getEgresoConceptLabel,
  getEgresoKindLabel,
} from '@/lib/egreso-concepts'
import { StatusDot } from '@/components/dashboard/report-ui'
import { PaymentMethodLabel } from '@/components/sales/payment-method-label'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

const pageArrowClass =
  'flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const rowDangerIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 dark:text-white/40 dark:hover:text-rose-400'

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const filterSelectWrapClass = 'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

interface EgresosTableProps {
  egresos: Egreso[]
  loading?: boolean
  canCreate?: boolean
  canEdit?: boolean
  canCancel?: boolean
  onCreate?: () => void
  onEdit?: (egreso: Egreso) => void
  onCancel?: (egreso: Egreso) => void
  onRefresh?: () => void
  statusFilter: 'active' | 'cancelled' | 'all'
  onStatusFilterChange: (v: 'active' | 'cancelled' | 'all') => void
  conceptFilter: string
  onConceptFilterChange: (v: string) => void
  kindFilter: EgresoKind | 'all'
  onKindFilterChange: (v: EgresoKind | 'all') => void
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function FilterSelect({
  value,
  onChange,
  label,
  className,
  children,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(filterSelectWrapClass, className)}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={filterSelectClass}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
        aria-hidden
      />
    </div>
  )
}

export function EgresosTable({
  egresos,
  loading,
  canCreate,
  canEdit,
  canCancel,
  onCreate,
  onEdit,
  onCancel,
  onRefresh,
  statusFilter,
  onStatusFilterChange,
  conceptFilter,
  onConceptFilterChange,
  kindFilter,
  onKindFilterChange,
}: EgresosTableProps) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return egresos
    return egresos.filter((e) => {
      const label = getEgresoConceptLabel(e.concept, e.conceptOther).toLowerCase()
      const notes = (e.description || '').toLowerCase()
      const by = (e.createdByName || '').toLowerCase()
      const kind = getEgresoKindLabel(e.expenseKind || 'caja').toLowerCase()
      return label.includes(q) || notes.includes(q) || by.includes(q) || kind.includes(q)
    })
  }, [egresos, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, kindFilter, conceptFilter, statusFilter])

  const goToPage = (next: number) => {
    setCurrentPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasFilters = search.trim() !== '' || kindFilter !== 'all' || conceptFilter !== 'all' || statusFilter !== 'active'

  const renderKind = (e: Egreso) => {
    const kind = e.expenseKind || 'caja'
    return (
      <span>
        {kind === 'cuenta' ? 'Cuenta' : 'Caja del turno'}
        {kind === 'cuenta' && e.periodMonth ? (
          <span className="block text-xs text-zinc-500 first-letter:uppercase dark:text-zinc-400">{formatPeriodMonth(e.periodMonth)}</span>
        ) : null}
      </span>
    )
  }

  const renderStatus = (e: Egreso) => (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot tone={e.status === 'active' ? 'success' : 'danger'} />
      {e.status === 'active' ? 'Activo' : 'Anulado'}
    </span>
  )

  const renderReceipt = (e: Egreso, size = 'h-8 w-8') =>
    e.imageUrl ? (
      <a
        href={e.imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver comprobante"
        className={cn(
          'block shrink-0 overflow-hidden rounded-md border border-zinc-200 transition-opacity hover:opacity-80 dark:border-white/[0.12]',
          size
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.imageUrl} alt="Comprobante" className="h-full w-full object-cover" />
      </a>
    ) : null

  const renderActions = (e: Egreso) =>
    e.status === 'active' ? (
      <div className="flex items-center justify-end gap-0.5">
        {canEdit && onEdit ? (
          <button type="button" className={rowIconBtnClass} title="Editar" aria-label="Editar egreso" onClick={() => onEdit(e)}>
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : null}
        {canCancel && onCancel ? (
          <button type="button" className={rowDangerIconBtnClass} title="Anular" aria-label="Anular egreso" onClick={() => onCancel(e)}>
            <Ban className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
    ) : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Egresos</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Gastos de la caja del turno o de cuenta (arriendo, nómina, servicios).
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} />
            </button>
          )}
          {canCreate && onCreate && (
            <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Nuevo egreso
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors md:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por concepto, nota o quién registró…"
            aria-label="Buscar egresos"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <FilterSelect
          value={kindFilter}
          onChange={(v) => onKindFilterChange(v as EgresoKind | 'all')}
          label="Filtrar por tipo"
          className="w-[9.5rem]"
        >
          <option value="all">Todos los tipos</option>
          <option value="caja">Caja del turno</option>
          <option value="cuenta">Cuenta (mensual)</option>
        </FilterSelect>
        <FilterSelect value={conceptFilter} onChange={onConceptFilterChange} label="Filtrar por concepto" className="w-[11rem]">
          <option value="all">Todos los conceptos</option>
          {EGRESO_CONCEPTS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={statusFilter}
          onChange={(v) => onStatusFilterChange(v as 'active' | 'cancelled' | 'all')}
          label="Filtrar por estado"
          className="w-[7.5rem]"
        >
          <option value="active">Activos</option>
          <option value="cancelled">Anulados</option>
          <option value="all">Todos</option>
        </FilterSelect>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando egresos…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {hasFilters ? 'Ningún egreso coincide' : 'No hay egresos'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            {hasFilters ? 'Prueba otra búsqueda o cambia los filtros.' : 'Registra el primero con «Nuevo egreso».'}
          </p>
        </div>
      ) : (
        <>
          <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
            {paginated.map((e) => (
              <div key={e.id} className={cn('flex items-start gap-3 px-4 py-3', e.status !== 'active' && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {getEgresoConceptLabel(e.concept, e.conceptOther)}
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCOP(e.amount)}</p>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="tabular-nums">{formatDate(e.expenseDate)}</span>
                    <span className="text-zinc-300 dark:text-white/20">·</span>
                    <span>{(e.expenseKind || 'caja') === 'cuenta' ? 'Cuenta' : 'Caja'}</span>
                    <span className="text-zinc-300 dark:text-white/20">·</span>
                    <PaymentMethodLabel method={e.paymentMethod} className="gap-1" />
                  </p>
                  {e.description ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-500 dark:text-zinc-400">{e.description}</p>
                  ) : null}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderStatus(e)}
                    {e.createdByName ? (
                      <>
                        <span className="text-zinc-300 dark:text-white/20">·</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{e.createdByName}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {renderReceipt(e, 'h-9 w-9')}
                  {renderActions(e)}
                </div>
              </div>
            ))}
          </div>

          <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Concepto</th>
                  <th className={thClass}>Tipo</th>
                  <th className={thClass}>Medio</th>
                  <th className={thClass}>Registrado por</th>
                  <th className={cn(thClass, 'text-right')}>Monto</th>
                  <th className={thClass}>Estado</th>
                  <th className="w-12 px-2 py-2.5">
                    <span className="sr-only">Comprobante</span>
                  </th>
                  <th className="w-16 px-2 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      'casa-artesanal-preserve-surface border-b border-zinc-100 align-top transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40',
                      e.status !== 'active' && 'text-zinc-400 dark:text-zinc-500'
                    )}
                  >
                    <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>{formatDate(e.expenseDate)}</td>
                    <td className={cn(tdClass, 'min-w-[12rem]')}>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{getEgresoConceptLabel(e.concept, e.conceptOther)}</p>
                      {e.description ? (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-zinc-500 dark:text-zinc-400">{e.description}</p>
                      ) : null}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>{renderKind(e)}</td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>
                      <PaymentMethodLabel method={e.paymentMethod} />
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>{e.createdByName || '—'}</td>
                    <td
                      className={cn(
                        tdClass,
                        'whitespace-nowrap text-right font-medium tabular-nums',
                        e.status !== 'active' && 'text-zinc-400 line-through dark:text-zinc-500'
                      )}
                    >
                      {formatCOP(e.amount)}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>{renderStatus(e)}</td>
                    <td className="px-2 py-1.5">{renderReceipt(e)}</td>
                    <td className="px-2 py-1.5">{renderActions(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Página {page} de {totalPages} · {filtered.length} egresos
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={pageArrowClass}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  if (n === 1 || n === totalPages || (n >= page - 1 && n <= page + 1)) {
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => goToPage(n)}
                        className={cn(
                          'casa-artesanal-preserve-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] tabular-nums transition-colors',
                          page === n
                            ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-white/[0.1] dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                        )}
                      >
                        {n}
                      </button>
                    )
                  }
                  if (n === page - 2 || n === page + 2) {
                    return (
                      <span key={n} className="px-1 text-sm text-zinc-400 dark:text-zinc-500">
                        …
                      </span>
                    )
                  }
                  return null
                })}
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className={pageArrowClass}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
