'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CashSession } from '@/types'
import type { CashCloseReportInput, CashCloseSaleLine } from '@/lib/cash-close-whatsapp'
import {
  cashSessionDifferenceTone,
  getCashSessionDifferenceView,
} from '@/lib/cash-sessions-service'
import { paymentLabel, formatDateTimeCo } from '@/lib/cash-close-whatsapp'
import { StatusDot } from '@/components/dashboard/report-ui'
import { PaymentMethodLabel, getPaymentMethodMeta } from '@/components/sales/payment-method-label'
import { cashMoney as money } from './cash-ui'

const detailGhostClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white [&_svg]:size-3.5 [&_svg]:shrink-0'

const panelClass =
  'casa-artesanal-card-surface flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'

const metaSepClass = 'text-zinc-300 dark:text-white/20'

function formatTimeCo(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}

function formatDateCo(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
}

function MethodLabel({ method, className }: { method: string; className?: string }) {
  if (getPaymentMethodMeta(method)) return <PaymentMethodLabel method={method} className={className} />
  return <span className={cn('text-zinc-600 dark:text-zinc-300', className)}>{paymentLabel(method)}</span>
}

function CuadreSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-5 py-3.5 last:border-b-0 dark:border-white/[0.06]">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">{title}</h3>
        {hint ? <span className="text-xs text-zinc-400 dark:text-white/40">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function CuadreLine({
  sign,
  label,
  value,
  variant = 'normal',
  valueClassName,
  aside,
}: {
  sign?: '+' | '−' | '='
  label: ReactNode
  value: ReactNode
  variant?: 'normal' | 'total' | 'muted'
  valueClassName?: string
  aside?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-2 py-1 text-[13px]',
        variant === 'total' && 'mt-1 border-t border-zinc-200 pt-2 dark:border-white/[0.1]'
      )}
    >
      <span className="w-3 shrink-0 text-center tabular-nums text-zinc-400 dark:text-white/35">{sign ?? ''}</span>
      <span
        className={cn(
          'min-w-0 flex-1 text-zinc-600 dark:text-white/65',
          variant === 'total' && 'font-semibold text-zinc-900 dark:text-white',
          variant === 'muted' && 'text-zinc-400 dark:text-white/40'
        )}
      >
        {label}
      </span>
      {aside ? <span className="shrink-0 text-xs text-zinc-500 dark:text-white/50">{aside}</span> : null}
      <span
        className={cn(
          'shrink-0 tabular-nums text-zinc-900 dark:text-white',
          variant === 'total' ? 'text-[15px] font-semibold' : 'font-medium',
          variant === 'muted' && 'text-zinc-400 dark:text-white/40',
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SaleRow({ sale }: { sale: CashCloseSaleLine }) {
  const [open, setOpen] = useState(false)
  const hasItems = sale.items.length > 0
  return (
    <li className="border-b border-zinc-100 last:border-b-0 dark:border-white/[0.06]">
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        aria-expanded={hasItems ? open : undefined}
        className={cn(
          'casa-artesanal-preserve-surface flex w-full items-start gap-2 px-4 py-2 text-left transition-colors',
          hasItems ? 'hover:bg-zinc-50 dark:hover:bg-white/[0.03]' : 'cursor-default'
        )}
      >
        <ChevronDown
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform dark:text-white/35',
            open && 'rotate-180',
            !hasItems && 'invisible'
          )}
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-white">{sale.clientName}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-white/50">
            <span className="font-mono">{sale.invoiceNumber}</span>
            {' · '}
            {formatTimeCo(sale.createdAt)}
            {sale.sellerName ? ` · ${sale.sellerName}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">{money(sale.total)}</p>
          <MethodLabel method={sale.paymentMethod} className="mt-0.5 text-xs" />
        </div>
      </button>
      {open && hasItems ? (
        <ul className="space-y-0.5 pb-2.5 pl-[2.375rem] pr-4 text-xs text-zinc-500 dark:text-white/50">
          {sale.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {item.productName} <span className="text-zinc-400 dark:text-white/35">×{item.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{money(item.total)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

type MovementsTab = 'sales' | 'egresos'

interface CashCloseDetailPageViewProps {
  session: CashSession
  report: CashCloseReportInput
}

export function CashCloseDetailPageView({ session, report }: CashCloseDetailPageViewProps) {
  const [tab, setTab] = useState<MovementsTab>('sales')
  const diffView = getCashSessionDifferenceView(session)
  const dayNet = (report.salesCash || 0) + (report.creditAbonosCash || 0) - (report.egresosCash || 0)
  const usedFromOpening = Math.min(report.openingCash || 0, Math.max(0, -dayNet))
  const sameDay = formatDateCo(report.openedAt) === formatDateCo(report.closedAt)
  const shiftLabel = sameDay
    ? `${formatDateCo(report.openedAt)} · ${formatTimeCo(report.openedAt)} → ${formatTimeCo(report.closedAt)}`
    : `${formatDateTimeCo(report.openedAt)} → ${formatDateTimeCo(report.closedAt)}`
  const openedBy = report.openedByName || '—'
  const closedBy = report.closedByName || '—'
  const note = report.notes?.trim()
  const salesTotal = report.sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
  const egresosTotal = report.egresos.reduce((sum, e) => sum + (e.amount || 0), 0)

  const digitalLines = [
    { label: 'Nequi', value: report.salesNequi },
    { label: 'Bancolombia', value: report.salesBancolombia },
    { label: 'Transferencia', value: report.salesTransfer },
    { label: 'Tarjeta', value: report.salesCard },
    { label: 'Otros medios', value: report.salesOther },
    { label: 'Abonos', value: report.creditAbonosOther },
  ].filter((l) => (l.value || 0) !== 0)
  const digitalTotal = digitalLines.reduce((sum, l) => sum + (l.value || 0), 0)

  const tabs: Array<{ id: MovementsTab; label: string; count: number; total: number }> = [
    { id: 'sales', label: 'Ventas', count: report.sales.length, total: salesTotal },
    { id: 'egresos', label: 'Egresos', count: report.egresos.length, total: egresosTotal },
  ]

  return (
    <div className="py-4 max-xl:pb-1 md:py-6 lg:flex lg:h-[calc(100dvh-7.5rem-var(--cash-stale-alert-h,0px))] lg:min-h-[34rem] lg:flex-col xl:h-[calc(100dvh-4rem-var(--cash-stale-alert-h,0px))]">
      <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
            Cierre de caja
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-500 dark:text-white/50">
            <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-white/80">
              <StatusDot tone="neutral" />
              Cerrada
            </span>
            <span className={metaSepClass}>·</span>
            <span>{report.storeName}</span>
            <span className={metaSepClass}>·</span>
            <span className="tabular-nums">{shiftLabel}</span>
            <span className={metaSepClass}>·</span>
            {openedBy === closedBy ? (
              <span className="text-zinc-700 dark:text-white/80">{openedBy}</span>
            ) : (
              <span>
                Abrió <span className="text-zinc-700 dark:text-white/80">{openedBy}</span>, cerró{' '}
                <span className="text-zinc-700 dark:text-white/80">{closedBy}</span>
              </span>
            )}
          </p>
          {note ? (
            <p className="mt-1 truncate text-[13px] text-zinc-500 dark:text-white/50" title={note}>
              <span className="text-zinc-400 dark:text-white/40">Nota:</span> {note}
            </p>
          ) : null}
        </div>
        <Link href="/caja" className={detailGhostClass}>
          <ArrowLeft strokeWidth={1.75} />
          Volver
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className={panelClass}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <CuadreSection title="Efectivo">
              <CuadreLine sign="+" label="Ventas en efectivo" value={money(report.salesCash)} />
              <CuadreLine sign="+" label="Abonos en efectivo" value={money(report.creditAbonosCash)} />
              <CuadreLine sign="−" label="Egresos en efectivo" value={money(report.egresosCash)} />
              <CuadreLine sign="=" label="Efectivo esperado" value={money(report.expectedCash)} variant="total" />
              <CuadreLine label="Efectivo contado" value={money(report.countedCash)} />
              <CuadreLine
                label={diffView.kind === 'remaining' ? 'Quedó en caja' : 'Diferencia'}
                aside={
                  <span className={cn('font-medium', cashSessionDifferenceTone(diffView.kind))}>{diffView.label}</span>
                }
                value={money(diffView.amount)}
                valueClassName={cn('font-semibold', cashSessionDifferenceTone(diffView.kind))}
              />
              {usedFromOpening > 0 && (
                <CuadreLine label="Tomado del fondo inicial" value={money(usedFromOpening)} variant="muted" />
              )}
              <CuadreLine label="Fondo inicial" value={money(report.openingCash)} variant="muted" />
            </CuadreSection>

            <CuadreSection title="Digital">
              {digitalLines.length === 0 ? (
                <p className="py-1 pl-5 text-[13px] text-zinc-400 dark:text-white/40">—</p>
              ) : (
                <>
                  {digitalLines.map((l) => (
                    <CuadreLine key={l.label} sign="+" label={l.label} value={money(l.value)} />
                  ))}
                  <CuadreLine sign="=" label="Total digital" value={money(digitalTotal)} variant="total" />
                </>
              )}
              {(report.egresosOther || 0) > 0 && (
                <CuadreLine sign="−" label="Egresos por otros medios" value={money(report.egresosOther)} />
              )}
            </CuadreSection>

            <CuadreSection title="Total del turno">
              <CuadreLine
                label="Ingresos"
                value={money(report.totalIngresos)}
                valueClassName="text-emerald-600 dark:text-emerald-400"
              />
              <CuadreLine
                label="Egresos"
                value={money(report.totalEgresos)}
                valueClassName="text-rose-600 dark:text-rose-400"
              />
              {(report.salesCredit || 0) > 0 && (
                <CuadreLine
                  label="Facturado a crédito"
                  value={money(report.salesCredit)}
                  variant="muted"
                />
              )}
            </CuadreSection>
          </div>
        </section>

        <section className={panelClass}>
          <div className="shrink-0 border-b border-zinc-200 p-2 dark:border-zinc-800">
            <div
              role="tablist"
              aria-label="Movimientos del turno"
              className="casa-artesanal-preserve-surface grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
            >
              {tabs.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'casa-artesanal-preserve-surface flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-[13px] transition-colors',
                      active
                        ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                        : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/55 dark:hover:text-white'
                    )}
                  >
                    <span>
                      {t.label} <span className="font-normal text-zinc-400 dark:text-white/40">({t.count})</span>
                    </span>
                    <span className="tabular-nums">{money(t.total)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {tab === 'sales' ? (
              report.sales.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-zinc-400 dark:text-white/40">
                  Sin ventas en este turno.
                </p>
              ) : (
                <ul>
                  {report.sales.map((sale, index) => (
                    <SaleRow key={`${sale.invoiceNumber}-${index}`} sale={sale} />
                  ))}
                </ul>
              )
            ) : report.egresos.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-zinc-400 dark:text-white/40">
                Sin egresos en este turno.
              </p>
            ) : (
              <ul>
                {report.egresos.map((e, index) => (
                  <li
                    key={`${e.createdAt}-${index}`}
                    className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-2 last:border-b-0 dark:border-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-white">{e.concept}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-white/50" title={e.description || undefined}>
                        {formatTimeCo(e.createdAt)}
                        {e.description ? ` · ${e.description}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {money(e.amount)}
                      </p>
                      <MethodLabel method={e.paymentMethod} className="mt-0.5 text-xs" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
