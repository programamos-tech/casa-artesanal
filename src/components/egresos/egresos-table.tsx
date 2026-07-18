'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Ban,
  Wallet,
} from 'lucide-react'
import { Egreso } from '@/types'
import {
  EGRESO_CONCEPTS,
  getEgresoConceptLabel,
  getEgresoPaymentLabel,
} from '@/lib/egreso-concepts'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

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
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
}: EgresosTableProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return egresos
    return egresos.filter((e) => {
      const label = getEgresoConceptLabel(e.concept, e.conceptOther).toLowerCase()
      const notes = (e.description || '').toLowerCase()
      const by = (e.createdByName || '').toLowerCase()
      return label.includes(q) || notes.includes(q) || by.includes(q)
    })
  }, [egresos, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Wallet className="h-7 w-7 text-zinc-500" strokeWidth={1.5} />
            Egresos
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Organiza arriendo, servicios, nómina, deudas y demás gastos del negocio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
              Actualizar
            </Button>
          )}
          {canCreate && onCreate && (
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo egreso
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por concepto, nota o quien registró…"
            className="h-10 pl-9"
          />
        </div>
        <Select value={conceptFilter} onValueChange={onConceptFilterChange}>
          <SelectTrigger className="h-10 w-full md:w-56">
            <SelectValue placeholder="Concepto" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos los conceptos</SelectItem>
            {EGRESO_CONCEPTS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as 'active' | 'cancelled' | 'all')}
        >
          <SelectTrigger className="h-10 w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="cancelled">Anulados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={cn(cardShell, 'overflow-hidden')}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">No hay egresos</p>
            <p className="mt-1 text-sm text-zinc-500">
              Registra el primero con “Nuevo egreso”
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold text-right">Monto</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatDate(e.expenseDate)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {getEgresoConceptLabel(e.concept, e.conceptOther)}
                      </p>
                      {e.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{e.description}</p>
                      ) : null}
                      {e.createdByName ? (
                        <p className="mt-0.5 text-[11px] text-zinc-400">por {e.createdByName}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {getEgresoPaymentLabel(e.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatCOP(e.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {e.status === 'active' ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Anulado
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit && e.status === 'active' && onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Editar"
                            onClick={() => onEdit(e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canCancel && e.status === 'active' && onCancel && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                            title="Anular"
                            onClick={() => onCancel(e)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
