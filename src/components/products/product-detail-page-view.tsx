'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, Eye, Pencil, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Product, Sale } from '@/types'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS, ReportBarChart } from '@/components/dashboard/report-bar-chart'

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

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function countsAsOutput(status: Sale['status']) {
  return status !== 'cancelled' && status !== 'draft'
}

function productLines(sale: Sale, productId: string) {
  return (sale.items || []).filter(item => item.productId === productId)
}

function stockTone(units: number): ReportTone {
  if (units === 0) return 'danger'
  if (units < 5) return 'warning'
  if (units < 10) return 'warning'
  return 'success'
}

function compactUnits(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1000) return `${Math.round(value / 1000)}k`
  return String(Math.round(value))
}

function outputMonthSeries(sales: Sale[], productId: string) {
  const map = new Map<string, { unidades: number; start: Date }>()
  for (const sale of sales) {
    if (!countsAsOutput(sale.status)) continue
    const units = productLines(sale, productId).reduce((sum, line) => sum + (line.quantity || 0), 0)
    if (units <= 0) continue
    const date = new Date(sale.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const key = `${start.getFullYear()}-${String(start.getMonth()).padStart(2, '0')}`
    const current = map.get(key) ?? { unidades: 0, start }
    current.unidades += units
    map.set(key, current)
  }

  const keys = [...map.keys()].sort()
  if (keys.length === 0) return []

  const first = map.get(keys[0])!.start
  const last = map.get(keys[keys.length - 1])!.start
  const spansYears = first.getFullYear() !== last.getFullYear()
  const points: { label: string; unidades: number }[] = []
  const cursor = new Date(first)

  for (let i = 0; i < 36 && cursor <= last; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth()).padStart(2, '0')}`
    const bucket = map.get(key)
    const month = cursor.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
    points.push({
      label: spansYears ? `${month} ${String(cursor.getFullYear()).slice(2)}` : month,
      unidades: bucket?.unidades ?? 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return points.length > 18 ? points.slice(-18) : points
}

export interface ProductDetailPageViewProps {
  product: Product
  sales: Sale[]
  salesLoading?: boolean
  onBack: () => void
  onEdit?: () => void
}

export function ProductDetailPageView({ product, sales, salesLoading = false, onBack, onEdit }: ProductDetailPageViewProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const read = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const outputSales = useMemo(
    () =>
      sales
        .filter(sale => countsAsOutput(sale.status) && productLines(sale, product.id).length > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales, product.id]
  )

  const totalUnits = outputSales.reduce(
    (sum, sale) => sum + productLines(sale, product.id).reduce((lineSum, line) => lineSum + (line.quantity || 0), 0),
    0
  )
  const totalRevenue = outputSales.reduce(
    (sum, sale) => sum + productLines(sale, product.id).reduce((lineSum, line) => lineSum + (line.total || 0), 0),
    0
  )
  const cost = Number(product.cost || 0)
  const price = Number(product.retailPrice ?? product.price ?? 0)
  const marginPct = (() => {
    if (cost <= 0) return null
    if (totalRevenue > 0) return ((totalRevenue - totalUnits * cost) / totalRevenue) * 100
    if (price > 0) return ((price - cost) / price) * 100
    return null
  })()

  const monthSeries = useMemo(() => outputMonthSeries(sales, product.id), [sales, product.id])
  const recentSales = outputSales.slice(0, 8)
  const storeStock = product.stock?.store || 0

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">{product.name}</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">{product.reference || 'Sin referencia'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.75} aria-hidden />
              {product.categoryName?.trim() || 'Sin categoría'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.75} aria-hidden />
              <time dateTime={product.createdAt}>
                {new Date(product.createdAt).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          <button type="button" onClick={onBack} className={detailGhostClass}>
            <ArrowLeft strokeWidth={1.75} />
            Volver
          </button>
          {onEdit ? (
            <button type="button" onClick={onEdit} className={detailPrimaryClass}>
              <Pencil strokeWidth={1.75} />
              Editar
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:grid-cols-4 sm:max-w-3xl">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Salida</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!salesLoading && totalUnits > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
          >
            {salesLoading ? '…' : `${totalUnits} und.`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Ingresos</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!salesLoading && totalRevenue > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
          >
            {salesLoading ? '…' : money.format(totalRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Stock</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            <StatusDot tone={stockTone(storeStock)} />
            {storeStock} und.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Margen</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={
              !salesLoading && marginPct != null
                ? { color: marginPct >= 0 ? REPORT_CHART_COLORS.tertiary : '#e11d48' }
                : undefined
            }
          >
            {salesLoading ? '…' : marginPct == null ? 'Sin costo' : `≈ ${Math.round(marginPct)}%`}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Salida por mes</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/50">
          Unidades vendidas en esta tienda · precio actual {money.format(price)}
        </p>
        <div className="mt-3">
          {salesLoading ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Cargando gráfica…</p>
          ) : monthSeries.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Este producto aún no tiene salidas.</p>
          ) : (
            <ReportBarChart
              data={monthSeries}
              categoryKey="label"
              series={[{ key: 'unidades', name: 'Unidades', color: REPORT_CHART_COLORS.primary }]}
              isDarkMode={isDarkMode}
              height={220}
              formatCompact={compactUnits}
              formatValue={value => `${Math.round(value)} und.`}
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Ventas</h2>
        {salesLoading ? (
          <p className="py-8 text-center text-[13px] text-zinc-500 dark:text-white/50">Cargando ventas…</p>
        ) : recentSales.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-zinc-500 dark:text-white/50">No hay ventas de este producto en la tienda.</p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                    <th className={thClass}>Factura</th>
                    <th className={thClass}>Fecha</th>
                    <th className={thClass}>Cliente</th>
                    <th className={cn(thClass, 'text-right')}>Cantidad</th>
                    <th className={cn(thClass, 'text-right')}>Total</th>
                    <th className="w-12 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => {
                    const lines = productLines(sale, product.id)
                    const units = lines.reduce((sum, line) => sum + (line.quantity || 0), 0)
                    const lineTotal = lines.reduce((sum, line) => sum + (line.total || 0), 0)
                    return (
                      <tr key={sale.id} className="border-b border-zinc-100 last:border-0 dark:border-white/[0.05]">
                        <td className={cn(tdClass, 'font-mono text-xs')}>{sale.invoiceNumber || '—'}</td>
                        <td className={cn(tdClass, 'whitespace-nowrap text-[13px]')}>
                          {new Date(sale.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className={cn(tdClass, 'max-w-[14rem] truncate')}>{sale.clientName?.trim() || 'Sin cliente'}</td>
                        <td className={cn(tdClass, 'text-right tabular-nums')}>{units}</td>
                        <td className={cn(tdClass, 'text-right font-medium tabular-nums')}>{money.format(lineTotal)}</td>
                        <td className="px-2 py-2 text-right">
                          <Link
                            href={`/sales/${sale.id}`}
                            aria-label={`Ver factura ${sale.invoiceNumber || sale.id}`}
                            className="ml-auto flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-white/[0.07] md:hidden">
              {recentSales.map(sale => {
                const lines = productLines(sale, product.id)
                const units = lines.reduce((sum, line) => sum + (line.quantity || 0), 0)
                return (
                  <li key={sale.id}>
                    <Link href={`/sales/${sale.id}`} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-zinc-500 dark:text-white/50">{sale.invoiceNumber || '—'}</p>
                        <p className="mt-0.5 truncate text-[13px] text-zinc-900 dark:text-white">{sale.clientName?.trim() || 'Sin cliente'}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-900 dark:text-white">{units} und.</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
