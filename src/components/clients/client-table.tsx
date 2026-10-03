'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, X, CreditCard } from 'lucide-react'
import { Client } from '@/types'
import { isStoreClient } from '@/lib/client-helpers'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { StatusDot } from '@/components/dashboard/report-ui'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const rowDeleteBtnClass =
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

export type ClientCreditBalance = {
  pending: number
  hasCredit: boolean
}

interface ClientTableProps {
  clients: Client[]
  creditBalances?: Map<string, ClientCreditBalance>
  balancesLoading?: boolean
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onCreate: () => void
  onRefresh?: () => void
}

const typeFilters = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'consumidor_final', label: 'Cliente final' },
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'minorista', label: 'Minorista' },
] as const

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

export function ClientTable({
  clients,
  creditBalances,
  balancesLoading = false,
  onView,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const filteredClients = useMemo(
    () =>
      clients.filter(client => {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          (client.name || '').toLowerCase().includes(term) ||
          (client.email || '').toLowerCase().includes(term) ||
          (client.phone || '').includes(searchTerm) ||
          (client.document || '').includes(searchTerm) ||
          (client.city || '').toLowerCase().includes(term) ||
          (client.state || '').toLowerCase().includes(term)
        const matchesType = filterType === 'all' || client.type === filterType
        return matchesSearch && matchesType
      }),
    [clients, searchTerm, filterType]
  )

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedClients = filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType])

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages))
  }, [totalPages])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const balanceOf = (clientId: string): ClientCreditBalance =>
    creditBalances?.get(clientId) ?? { pending: 0, hasCredit: false }

  const renderClientName = (client: Client) => {
    const balance = balanceOf(client.id)
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">{client.name}</span>
        {!balancesLoading && balance.hasCredit ? (
          <CreditCard
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: REPORT_CHART_COLORS.primary }}
            strokeWidth={1.75}
            aria-label="Tiene créditos"
          />
        ) : null}
      </span>
    )
  }

  const renderDebt = (client: Client) => {
    if (balancesLoading) return <span className="text-zinc-400 dark:text-white/40">…</span>
    const pending = balanceOf(client.id).pending
    return (
      <span
        className="tabular-nums"
        style={pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
      >
        {formatCurrency(pending)}
      </span>
    )
  }

  const renderCreditStatus = (client: Client) => {
    if (balancesLoading) return <span className="text-zinc-400 dark:text-white/40">…</span>
    const open = balanceOf(client.id).pending > 0
    return (
      <span className="inline-flex items-center gap-2">
        <StatusDot tone={open ? 'warning' : 'success'} />
        {open ? 'Créditos abiertos' : 'Al día'}
      </span>
    )
  }

  const renderRowActions = (client: Client) => (
    <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
      {isStoreClient(client) ? (
        <span className="px-2 text-xs text-zinc-400 dark:text-white/35">Microtienda</span>
      ) : (
        <>
          <button type="button" className={rowIconBtnClass} onClick={() => onEdit(client)} title="Editar" aria-label="Editar">
            <Edit className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={rowDeleteBtnClass}
            onClick={() => onDelete(client)}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Clientes</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Clientes finales, mayoristas y minoristas de la tienda seleccionada.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onRefresh && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} strokeWidth={1.5} />
            </button>
          )}
          <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
            <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors sm:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            placeholder="Buscar cliente, documento o teléfono…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar cliente"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div className={cn(filterSelectWrapClass, 'min-w-[10.5rem]')}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filtrar por tipo de cliente"
            className={filterSelectClass}
          >
            {typeFilters.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
            aria-hidden
          />
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No hay clientes</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Ajusta la búsqueda o crea uno con «Nuevo cliente».
          </p>
        </div>
      ) : (
        <>
          <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
            {paginatedClients.map(client => (
              <div
                key={client.id}
                role="button"
                tabIndex={0}
                className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                onClick={() => onView(client)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView(client)
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{renderClientName(client)}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {client.document || 'Sin documento'}
                    {client.phone ? ` · ${client.phone}` : ''}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderDebt(client)}
                    <span className="text-zinc-300 dark:text-white/20">·</span>
                    {renderCreditStatus(client)}
                  </p>
                </div>
                {renderRowActions(client)}
              </div>
            ))}
          </div>

          <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Documento</th>
                  <th className={cn(thClass, 'text-right')}>Adeudado</th>
                  <th className={thClass}>Teléfono</th>
                  <th className={thClass}>Estado</th>
                  <th className={cn(thClass, 'w-[7.5rem]')}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map(client => (
                  <tr
                    key={client.id}
                    className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                    onClick={() => onView(client)}
                  >
                    <td className={cn(tdClass, 'max-w-[min(22rem,32vw)]')}>
                      {renderClientName(client)}
                      {client.email ? (
                        <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">{client.email}</span>
                      ) : null}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap tabular-nums text-zinc-500 dark:text-zinc-400')}>
                      {client.document || '—'}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right')}>{renderDebt(client)}</td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>
                      {client.phone || '—'}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>{renderCreditStatus(client)}</td>
                    <td className="px-3 py-1.5">{renderRowActions(client)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === 2 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
                        className={cn(
                          'casa-artesanal-preserve-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] tabular-nums transition-colors',
                          currentPage === page
                            ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-white/[0.1] dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                        )}
                      >
                        {page}
                      </button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-1 text-sm text-zinc-400 dark:text-zinc-500">
                        …
                      </span>
                    )
                  }
                  return null
                })}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
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
