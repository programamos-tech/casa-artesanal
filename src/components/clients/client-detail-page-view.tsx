'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, Check, CreditCard, Eye, MapPin, Pencil, Phone, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Client, Credit, Sale } from '@/types'
import { creditStatusLabel, getEffectiveCreditStatus, isCreditCancelled } from '@/lib/credit-status-ui'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS, ReportBarChart } from '@/components/dashboard/report-bar-chart'
import {
  modalErrorClass,
  modalInputClass,
  modalInputErrorClass,
  modalLabelClass,
  modalSecondaryButtonClass,
} from '@/lib/app-modal'

const detailActionClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium leading-none transition-colors disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0'

const detailGhostClass = cn(
  detailActionClass,
  'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white'
)

const detailPrimaryClass = cn(
  detailActionClass,
  'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
)

const detailDangerClass = cn(
  detailActionClass,
  'border border-zinc-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-white/[0.12] dark:text-rose-300 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10'
)

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

export type ClientDetailEditDraft = Pick<
  Client,
  'name' | 'email' | 'phone' | 'document' | 'address' | 'city' | 'state' | 'type' | 'status'
>

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

function typeTone(type: Client['type']): ReportTone {
  switch (type) {
    case 'mayorista':
      return 'warning'
    case 'minorista':
      return 'neutral'
    case 'consumidor_final':
      return 'info'
    default:
      return 'neutral'
  }
}

function creditTone(status: Credit['status']): ReportTone {
  switch (status) {
    case 'completed':
      return 'success'
    case 'partial':
      return 'info'
    case 'pending':
      return 'warning'
    case 'overdue':
    case 'cancelled':
      return 'danger'
    default:
      return 'neutral'
  }
}

function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; tone: ReportTone }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="min-w-0">
      <span className={modalLabelClass}>{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="casa-artesanal-preserve-surface grid gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map(option => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'casa-artesanal-preserve-surface inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[13px] transition-colors',
                selected
                  ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/55 dark:hover:text-white'
              )}
            >
              <StatusDot tone={option.tone} className={cn(!selected && 'opacity-60')} />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const typeOptions: { value: Client['type']; label: string; tone: ReportTone }[] = [
  { value: 'consumidor_final', label: 'Cliente final', tone: 'info' },
  { value: 'mayorista', label: 'Mayorista', tone: 'warning' },
  { value: 'minorista', label: 'Minorista', tone: 'neutral' },
]

const statusOptions: { value: Client['status']; label: string; tone: ReportTone }[] = [
  { value: 'active', label: 'Activo', tone: 'success' },
  { value: 'inactive', label: 'Inactivo', tone: 'neutral' },
]

function chartCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000
    const digits = abs >= 100_000_000 ? 0 : 1
    return `$${millions.toFixed(digits).replace('.', ',')}M`
  }
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${Math.round(value)}`
}

function creditMonthSeries(
  entries: { createdAt: string; saldoTotal: number; pagado: number; abonos: number }[]
) {
  const map = new Map<string, { saldoTotal: number; pagado: number; abonos: number; start: Date }>()
  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const key = `${start.getFullYear()}-${String(start.getMonth()).padStart(2, '0')}`
    const current = map.get(key) ?? { saldoTotal: 0, pagado: 0, abonos: 0, start }
    current.saldoTotal += entry.saldoTotal || 0
    current.pagado += entry.pagado || 0
    current.abonos += entry.abonos || 0
    map.set(key, current)
  }

  const keys = [...map.keys()].sort()
  if (keys.length === 0) return []

  const first = map.get(keys[0])!.start
  const last = map.get(keys[keys.length - 1])!.start
  const spansYears = first.getFullYear() !== last.getFullYear()
  const points: { label: string; saldoTotal: number; pagado: number; abonos: number }[] = []
  const cursor = new Date(first)

  for (let i = 0; i < 24 && cursor <= last; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth()).padStart(2, '0')}`
    const bucket = map.get(key)
    const month = cursor.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
    points.push({
      label: spansYears ? `${month} ${String(cursor.getFullYear()).slice(2)}` : month,
      saldoTotal: bucket?.saldoTotal ?? 0,
      pagado: bucket?.pagado ?? 0,
      abonos: bucket?.abonos ?? 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return points
}

export interface ClientDetailPageViewProps {
  client: Client
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  canMutate: boolean
  credits?: Credit[]
  creditsLoading?: boolean
  sales?: Array<Pick<Sale, 'id' | 'invoiceNumber' | 'total' | 'status' | 'paymentMethod' | 'createdAt'>>
  salesLoading?: boolean
  abonos?: Array<{ id: string; amount: number; paymentDate: string }>
  abonosLoading?: boolean
  editing: boolean
  draft: ClientDetailEditDraft | null
  onDraftChange: (patch: Partial<ClientDetailEditDraft>) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  saving?: boolean
  editErrors?: Record<string, string>
}

export function ClientDetailPageView({
  client,
  onBack,
  onEdit,
  onDelete,
  canMutate,
  credits = [],
  creditsLoading = false,
  sales = [],
  salesLoading = false,
  abonos = [],
  abonosLoading = false,
  editing,
  draft,
  onDraftChange,
  onCancelEdit,
  onSaveEdit,
  saving = false,
  editErrors = {},
}: ClientDetailPageViewProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

  const totalPendingCredits = credits.reduce(
    (sum, c) => sum + (c.pendingAmount > 0 && c.status !== 'cancelled' ? c.pendingAmount : 0),
    0
  )
  const activityLoading = creditsLoading || salesLoading || abonosLoading
  const creditBySaleId = useMemo(() => new Map(credits.map(credit => [credit.saleId, credit])), [credits])
  const invoiceRows = useMemo(() => {
    const usedCreditIds = new Set<string>()
    const rows = sales
      .filter(sale => sale.status !== 'draft')
      .map(sale => {
        const credit = creditBySaleId.get(sale.id)
        if (credit) usedCreditIds.add(credit.id)
        const displayStatus = credit ? getEffectiveCreditStatus(credit) : null
        const cancelled = sale.status === 'cancelled' || (credit ? isCreditCancelled(credit) || credit.status === 'cancelled' : false)
        const paid = cancelled
          ? 0
          : credit
            ? credit.paidAmount || 0
            : sale.paymentMethod === 'credit' || sale.status !== 'completed'
              ? 0
              : sale.total
        const settled = !credit && !cancelled && sale.status === 'completed' && sale.paymentMethod !== 'credit'
        return {
          key: sale.id,
          invoiceNumber: sale.invoiceNumber || '—',
          total: sale.total,
          pending: credit && !cancelled ? credit.pendingAmount : 0,
          paid,
          createdAt: sale.createdAt,
          tone: (credit && displayStatus ? creditTone(displayStatus) : cancelled ? 'danger' : settled ? 'success' : 'warning') as ReportTone,
          label: credit && displayStatus
            ? creditStatusLabel(displayStatus, credit, { completedLabel: 'Pagado' })
            : cancelled
              ? 'Anulada'
              : settled
                ? 'Pagada'
                : 'Pendiente',
          href: credit ? `/payments/${client.id}/credit/${credit.id}` : `/sales/${sale.id}`,
          includeInChart: !cancelled,
          isCredit: Boolean(credit),
        }
      })

    for (const credit of credits) {
      if (usedCreditIds.has(credit.id) || isCreditCancelled(credit) || credit.status === 'cancelled') continue
      const displayStatus = getEffectiveCreditStatus(credit)
      rows.push({
        key: credit.id,
        invoiceNumber: credit.invoiceNumber || '—',
        total: credit.totalAmount,
        pending: credit.pendingAmount,
        paid: credit.paidAmount || 0,
        createdAt: credit.createdAt,
        tone: creditTone(displayStatus),
        label: creditStatusLabel(displayStatus, credit, { completedLabel: 'Pagado' }),
        href: `/payments/${client.id}/credit/${credit.id}`,
        includeInChart: true,
        isCredit: true,
      })
    }

    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [sales, credits, creditBySaleId, client.id])

  const totalContado = invoiceRows.reduce((sum, row) => sum + (row.isCredit ? 0 : row.paid), 0)
  const totalCreditPaid = invoiceRows.reduce((sum, row) => sum + (row.isCredit ? row.paid : 0), 0)
  const totalSaldo = invoiceRows.reduce((sum, row) => sum + (row.includeInChart ? row.total : 0), 0)
  const totalAbonos = useMemo(() => {
    const fromRecords = abonos.reduce((sum, row) => sum + (row.amount || 0), 0)
    if (fromRecords > 0 || abonosLoading) return fromRecords
    return totalCreditPaid
  }, [abonos, abonosLoading, totalCreditPaid])
  const saldoPagado = totalCreditPaid + totalContado
  const recentInvoices = invoiceRows.slice(0, 8)
  const monthSeries = useMemo(() => {
    const entries = invoiceRows
      .filter(row => row.includeInChart)
      .map(row => ({
        createdAt: row.createdAt,
        saldoTotal: row.isCredit ? row.total : 0,
        pagado: row.paid,
        abonos: 0,
      }))

    if (abonos.length > 0) {
      for (const abono of abonos) {
        entries.push({
          createdAt: abono.paymentDate,
          saldoTotal: 0,
          pagado: 0,
          abonos: abono.amount || 0,
        })
      }
    } else if (!abonosLoading) {
      for (const credit of credits) {
        if (isCreditCancelled(credit) || credit.status === 'cancelled' || !(credit.paidAmount > 0)) continue
        entries.push({
          createdAt: credit.lastPaymentDate || credit.createdAt,
          saldoTotal: 0,
          pagado: 0,
          abonos: credit.paidAmount || 0,
        })
      }
    }

    return creditMonthSeries(entries)
  }, [invoiceRows, abonos, abonosLoading, credits])
  const hasSaldoTotal = monthSeries.some(point => point.saldoTotal > 0)
  const hasPagado = monthSeries.some(point => point.pagado > 0)
  const hasAbonos = monthSeries.some(point => point.abonos > 0)
  const chartSeries = [
    hasSaldoTotal ? { key: 'saldoTotal', name: 'Saldo total', color: REPORT_CHART_COLORS.secondary } : null,
    hasPagado ? { key: 'pagado', name: 'Pagado', color: REPORT_CHART_COLORS.tertiary } : null,
    hasAbonos ? { key: 'abonos', name: 'Abonos', color: REPORT_CHART_COLORS.abono } : null,
  ].filter((series): series is { key: string; name: string; color: string } => series !== null)
  const chartTitle = hasSaldoTotal || hasAbonos ? 'Créditos por mes' : 'Facturas por mes'
  const chartParts = [
    hasSaldoTotal ? 'saldo total' : null,
    hasPagado ? 'pagado' : null,
    hasAbonos ? 'abonos registrados' : null,
  ].filter((part): part is string => Boolean(part))
  const chartCaption =
    chartParts.length <= 1
      ? chartParts[0] || ''
      : chartParts.length === 2
        ? `${chartParts[0]} y ${chartParts[1]}`
        : `${chartParts.slice(0, -1).join(', ')} y ${chartParts[chartParts.length - 1]}`
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const read = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {editing && draft ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="detail-client-name" className={modalLabelClass}>
                  Nombre
                </label>
                <input
                  id="detail-client-name"
                  type="text"
                  value={draft.name}
                  onChange={e => onDraftChange({ name: e.target.value })}
                  className={cn(modalInputClass, editErrors.name && modalInputErrorClass)}
                  placeholder="Nombre del cliente"
                />
                {editErrors.name ? <p className={modalErrorClass}>{editErrors.name}</p> : null}
              </div>
              <div>
                <label htmlFor="detail-client-document" className={modalLabelClass}>
                  Documento
                </label>
                <input
                  id="detail-client-document"
                  type="text"
                  value={draft.document}
                  onChange={e => onDraftChange({ document: e.target.value })}
                  className={cn(modalInputClass, 'tabular-nums', editErrors.document && modalInputErrorClass)}
                  placeholder="Cédula / NIT"
                />
                {editErrors.document ? <p className={modalErrorClass}>{editErrors.document}</p> : null}
              </div>
              <SegmentedChoice
                label="Tipo"
                value={draft.type}
                options={typeOptions}
                onChange={type => onDraftChange({ type })}
              />
              <SegmentedChoice
                label="Estado"
                value={draft.status}
                options={statusOptions}
                onChange={status => onDraftChange({ status })}
              />
            </div>
          ) : (
            <>
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                {client.name}
              </h1>
              <p className="mt-0.5 text-[13px] tabular-nums text-zinc-500 dark:text-white/50">{client.document || 'Sin documento'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot tone={typeTone(client.type)} />
                  {getTypeLabel(client.type)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot tone={client.status === 'active' ? 'success' : 'neutral'} />
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.75} aria-hidden />
                  {client.city?.trim() ? client.city : <span className="text-zinc-500 dark:text-white/45">Sin ciudad</span>}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.75} aria-hidden />
                  {client.phone ? (
                    <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="tabular-nums underline-offset-2 hover:underline">
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-zinc-500 dark:text-white/45">Sin teléfono</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.75} aria-hidden />
                  <time dateTime={client.createdAt}>
                    {new Date(client.createdAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          <button type="button" onClick={onBack} disabled={saving} className={detailGhostClass}>
            <ArrowLeft strokeWidth={1.75} />
            Volver
          </button>
          <Link href={`/payments/${client.id}`} className={cn(detailGhostClass, saving && 'pointer-events-none')}>
            <CreditCard strokeWidth={1.75} />
            Créditos
          </Link>
          {canMutate && !editing && (
            <>
              <button type="button" onClick={onEdit} className={detailPrimaryClass}>
                <Pencil strokeWidth={1.75} />
                Editar
              </button>
              <button type="button" onClick={onDelete} className={detailDangerClass}>
                <Trash2 strokeWidth={1.75} />
                Eliminar
              </button>
            </>
          )}
          {canMutate && editing && (
            <>
              <button type="button" onClick={onCancelEdit} disabled={saving} className={detailGhostClass}>
                <X strokeWidth={1.75} />
                Cancelar
              </button>
              <button type="button" onClick={onSaveEdit} disabled={saving} className={detailPrimaryClass}>
                <Check strokeWidth={1.75} />
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </div>

      {editing && draft ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={modalLabelClass} htmlFor="detail-client-email">
              Correo
            </label>
            <input
              id="detail-client-email"
              type="email"
              value={draft.email}
              onChange={e => onDraftChange({ email: e.target.value })}
              className={cn(modalInputClass, editErrors.email && modalInputErrorClass)}
              placeholder="correo@ejemplo.com"
            />
            {editErrors.email ? <p className={modalErrorClass}>{editErrors.email}</p> : null}
          </div>
          <div>
            <label className={modalLabelClass} htmlFor="detail-client-phone">
              Teléfono
            </label>
            <input
              id="detail-client-phone"
              type="tel"
              value={draft.phone}
              onChange={e => onDraftChange({ phone: e.target.value })}
              className={modalInputClass}
              placeholder="Teléfono"
            />
          </div>
          <div>
            <label className={modalLabelClass} htmlFor="detail-client-city">
              Ciudad
            </label>
            <input
              id="detail-client-city"
              type="text"
              value={draft.city}
              onChange={e => onDraftChange({ city: e.target.value })}
              className={modalInputClass}
              placeholder="Ciudad"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={modalLabelClass} htmlFor="detail-client-address">
              Dirección
            </label>
            <input
              id="detail-client-address"
              type="text"
              value={draft.address}
              onChange={e => onDraftChange({ address: e.target.value })}
              className={modalInputClass}
              placeholder="Dirección"
            />
          </div>
          <div>
            <label className={modalLabelClass} htmlFor="detail-client-state">
              Departamento
            </label>
            <input
              id="detail-client-state"
              type="text"
              value={draft.state}
              onChange={e => onDraftChange({ state: e.target.value })}
              className={modalInputClass}
              placeholder="Departamento"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Saldo total</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {activityLoading ? '…' : formatCurrency(totalSaldo)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Saldo adeudado</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!activityLoading && totalPendingCredits > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
          >
            {activityLoading ? '…' : formatCurrency(totalPendingCredits)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Saldo pagado</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!activityLoading && saldoPagado > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
          >
            {activityLoading ? '…' : formatCurrency(saldoPagado)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Abonos registrados</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!activityLoading && totalAbonos > 0 ? { color: REPORT_CHART_COLORS.abono } : undefined}
          >
            {activityLoading ? '…' : formatCurrency(totalAbonos)}
          </p>
          {!activityLoading && abonos.length > 0 ? (
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-white/45">
              {abonos.length} {abonos.length === 1 ? 'abono' : 'abonos'}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">{chartTitle}</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/50">
          {chartCaption
            ? `${chartCaption.charAt(0).toUpperCase()}${chartCaption.slice(1)} en esta tienda`
            : 'En esta tienda'}
        </p>
        <div className="mt-3">
          {activityLoading ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Cargando gráfica…</p>
          ) : monthSeries.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Sin facturas para graficar.</p>
          ) : (
            <ReportBarChart
              data={monthSeries}
              categoryKey="label"
              series={chartSeries}
              isDarkMode={isDarkMode}
              height={240}
              formatCompact={chartCompact}
              showValues
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Créditos y facturas</h2>

        {activityLoading ? (
          <p className="py-8 text-center text-[13px] text-zinc-500 dark:text-white/50">Cargando facturas…</p>
        ) : invoiceRows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-zinc-500 dark:text-white/50">
            No hay facturas para este cliente.
          </p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                    <th className={thClass}>Factura</th>
                    <th className={cn(thClass, 'text-right')}>Total</th>
                    <th className={cn(thClass, 'text-right')}>Pendiente</th>
                    <th className={thClass}>Estado</th>
                    <th className="w-16 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map(row => (
                      <tr key={row.key} className="border-b border-zinc-100 last:border-0 dark:border-white/[0.05]">
                        <td className={cn(tdClass, 'font-mono text-xs')}>{row.invoiceNumber}</td>
                        <td className={cn(tdClass, 'text-right tabular-nums')}>{formatCurrency(row.total)}</td>
                        <td className={cn(tdClass, 'text-right font-medium tabular-nums')}>{formatCurrency(row.pending)}</td>
                        <td className={tdClass}>
                          <span className="inline-flex items-center gap-1.5">
                            <StatusDot tone={row.tone} />
                            {row.label}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Link
                            href={row.href}
                            aria-label={`Ver factura ${row.invoiceNumber}`}
                            className="ml-auto flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-zinc-200 dark:divide-white/[0.07] md:hidden">
              {recentInvoices.map(row => (
                  <li key={row.key}>
                    <Link href={row.href} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-zinc-500 dark:text-white/50">{row.invoiceNumber}</p>
                        <p className="mt-0.5 text-[13px] font-medium tabular-nums text-zinc-900 dark:text-white">
                          {formatCurrency(row.pending > 0 ? row.pending : row.total)}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-zinc-700 dark:text-white/80">
                        <StatusDot tone={row.tone} />
                        {row.label}
                      </span>
                    </Link>
                  </li>
              ))}
            </ul>

            {invoiceRows.length > recentInvoices.length && (
              <div className="mt-3">
                <Link href={`/payments/${client.id}`} className={modalSecondaryButtonClass}>
                  Ver todos ({invoiceRows.length})
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {!canMutate && (
        <p className="mt-8 text-center text-[13px] text-zinc-500 dark:text-white/50">
          Este perfil corresponde a una tienda del sistema. Los datos se gestionan desde Microtiendas.
        </p>
      )}
    </div>
  )
}
