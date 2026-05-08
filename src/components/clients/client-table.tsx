'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Users, RefreshCcw, Eye, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Client } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { isStoreClient } from '@/lib/client-helpers'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

interface ClientTableProps {
  clients: Client[]
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onCreate: () => void
  onRefresh?: () => void
}

function getStatusBadgeClass(status: Client['status']) {
  return status === 'active'
    ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
}

function getTypeBadgeClass(type: Client['type']) {
  switch (type) {
    case 'minorista':
      return 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    case 'mayorista':
      return 'border-sky-500/25 bg-sky-500/[0.06] text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300/90'
    case 'consumidor_final':
      return 'border-violet-500/25 bg-violet-500/[0.06] text-violet-950 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300/90'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function getTypeLabel(type: Client['type']) {
  switch (type) {
    case 'mayorista':
      return 'Mayorista'
    case 'minorista':
      return 'Minorista'
    case 'consumidor_final':
      return 'Cliente final'
    default:
      return type
  }
}

export function ClientTable({
  clients,
  onView,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const types = ['all', 'mayorista', 'minorista', 'consumidor_final'] as const

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesSearch =
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone.includes(searchTerm) ||
          client.document.includes(searchTerm) ||
          client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.state.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'all' || client.type === filterType
        return matchesSearch && matchesType
      }),
    [clients, searchTerm, filterType]
  )

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType])

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Users className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                <span>Gestión de clientes</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Administra clientes minoristas, mayoristas y consumidores finales
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nuevo cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="flex min-h-11 flex-nowrap items-stretch overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-400/30 dark:text-zinc-100 dark:focus:ring-zinc-500/25"
              />
            </div>
            <div className="relative flex shrink-0 items-stretch border-l border-zinc-200 dark:border-zinc-700">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filtrar por tipo de cliente"
                className="h-11 min-w-[10.25rem] max-w-[42vw] cursor-pointer appearance-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-400/30 dark:text-zinc-100 dark:focus:ring-zinc-500/25 sm:min-w-[12rem] sm:max-w-none"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'Todos los tipos' : getTypeLabel(type)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                aria-hidden
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn('overflow-hidden', cardShell)}>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600">
                <Users className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No se encontraron clientes</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Ajusta la búsqueda o crea uno con <span className="font-medium text-zinc-700 dark:text-zinc-300">Nuevo cliente</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {paginatedClients.map((client) => (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
                    onClick={() => onView(client)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onView(client)
                      }
                    }}
                  >
                    <UserAvatar name={client.name} seed={client.id} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{client.name}</p>
                          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{client.document}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 border px-2 py-0.5 text-[11px] font-normal', getStatusBadgeClass(client.status))}
                        >
                          {client.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('border px-2 py-0.5 text-[11px] font-normal', getTypeBadgeClass(client.type))}
                        >
                          {getTypeLabel(client.type)}
                        </Badge>
                        {!isStoreClient(client) && (
                          <span
                            role="none"
                            className="ml-auto flex shrink-0 gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-zinc-500"
                              title="Editar"
                              onClick={() => onEdit(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-rose-600 dark:text-rose-400"
                              title="Eliminar"
                              onClick={() => onDelete(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Cliente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Documento
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Tipo
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Correo
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Teléfono
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Estado
                        </th>
                        <th className="w-[7.5rem] bg-zinc-50/80 px-2 py-3 text-right dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {paginatedClients.map((client) => (
                        <tr
                          key={client.id}
                          className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
                          onClick={() => onView(client)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar name={client.name} seed={client.id} size="sm" className="shrink-0" />
                              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{client.name}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                            {client.document}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn('inline-flex border px-2 py-0.5 text-[11px] font-normal', getTypeBadgeClass(client.type))}
                            >
                              {getTypeLabel(client.type)}
                            </Badge>
                          </td>
                          <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-700 dark:text-zinc-300" title={client.email || undefined}>
                            {client.email || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{client.phone || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn('inline-flex border px-2 py-0.5 text-[11px] font-normal', getStatusBadgeClass(client.status))}
                            >
                              {client.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-1 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                title="Ver detalle"
                                onClick={() => onView(client)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isStoreClient(client) && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                    title="Editar"
                                    onClick={() => onEdit(client)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                                    title="Eliminar"
                                    onClick={() => onDelete(client)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {isStoreClient(client) && (
                                <span className="px-2 text-xs text-zinc-400 dark:text-zinc-500">Microtienda</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredClients.length > 0 && (
                <div className="flex flex-col items-center gap-3 border-t border-zinc-100 px-3 py-4 dark:border-zinc-800 sm:flex-row sm:justify-between sm:gap-4">
                  <p className="order-2 text-center text-sm tabular-nums text-zinc-500 dark:text-zinc-400 sm:order-1 sm:text-left">
                    Mostrando{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredClients.length)}
                    </span>{' '}
                    de <span className="font-medium text-zinc-700 dark:text-zinc-300">{filteredClients.length}</span>
                  </p>
                  {totalPages > 1 && (
                    <div className="order-1 flex flex-wrap items-center justify-center gap-3 sm:order-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="min-w-[10rem] text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
