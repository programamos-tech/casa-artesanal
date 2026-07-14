'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  FileText,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import { StoreBadge } from '@/components/ui/store-badge'
import type { CashSession } from '@/types'
import type { CashCloseReportInput } from '@/lib/cash-close-whatsapp'
import { moneyCop, paymentLabel, formatDateTimeCo } from '@/lib/cash-close-whatsapp'

function money(n: number) {
  return moneyCop(n)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  )
}

interface CashCloseDetailPageViewProps {
  session: CashSession
  report: CashCloseReportInput
}

export function CashCloseDetailPageView({ session, report }: CashCloseDetailPageViewProps) {
  const diff = report.difference || 0

  return (
    <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
      <div className="flex flex-wrap items-start gap-3 px-1">
        <Link
          href="/caja"
          aria-label="Volver a caja"
          className="inline-flex h-10 w-10 shrink-0 -ml-1 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
              Detalle de cierre de caja
            </h1>
            <StoreBadge />
            <Badge className="border-0 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              Cerrada
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {report.storeName} · {formatDateTimeCo(report.openedAt)} → {formatDateTimeCo(report.closedAt)}
          </p>
        </div>
      </div>

      <Card className={cn(cardShell)}>
        <CardHeader className="border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wallet className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
            Resumen del turno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Abrió">{report.openedByName || '—'}</Field>
            <Field label="Cerró">{report.closedByName || '—'}</Field>
            <Field label="Apertura">{formatDateTimeCo(report.openedAt)}</Field>
            <Field label="Cierre">{formatDateTimeCo(report.closedAt)}</Field>
          </dl>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile icon={Banknote} label="Fondo inicial" value={money(report.openingCash)} />
            <SummaryTile icon={ArrowUpCircle} label="Ingresos" value={money(report.totalIngresos)} tone="income" />
            <SummaryTile icon={ArrowDownCircle} label="Egresos" value={money(report.totalEgresos)} tone="expense" />
            <SummaryTile icon={Wallet} label="Efectivo esperado" value={money(report.expectedCash)} tone="cash" />
          </div>

          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Efectivo contado</p>
              <p className="text-lg font-semibold tabular-nums">{money(report.countedCash)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Diferencia</p>
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  diff === 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : diff > 0
                      ? 'text-sky-700 dark:text-sky-400'
                      : 'text-red-600 dark:text-red-400'
                )}
              >
                {money(diff)}
                <span className="ml-2 text-xs font-medium">
                  {diff === 0 ? 'Cuadra' : diff > 0 ? 'Sobra' : 'Falta'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ventas / egresos</p>
              <p className="text-lg font-semibold tabular-nums">
                {report.salesCount} / {report.egresosCount}
              </p>
            </div>
          </div>

          {report.notes?.trim() && (
            <div className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nota</p>
              <p className="mt-1 text-zinc-800 dark:text-zinc-200">{report.notes}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Ingresos por medio
              </p>
              <Line label="Efectivo" value={money(report.salesCash)} />
              <Line label="Nequi" value={money(report.salesNequi)} />
              <Line label="Bancolombia" value={money(report.salesBancolombia)} />
              <Line label="Transferencia" value={money(report.salesTransfer)} />
              <Line label="Tarjeta" value={money(report.salesCard)} />
              <Line label="Crédito facturado" value={money(report.salesCredit)} />
              <Line label="Otros" value={money(report.salesOther)} />
              <Line label="Abonos crédito (efectivo)" value={money(report.creditAbonosCash)} />
              <Line label="Abonos crédito (otros)" value={money(report.creditAbonosOther)} />
            </div>
            <div className="space-y-1.5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Egresos por medio
              </p>
              <Line label="Efectivo" value={money(report.egresosCash)} />
              <Line label="Otros medios" value={money(report.egresosOther)} />
              <p className="pt-3 text-xs text-zinc-500">
                Efectivo esperado = fondo + ventas/abonos en efectivo − egresos en efectivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardShell)}>
        <CardHeader className="border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
            Ventas del turno ({report.sales.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.sales.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500 md:p-6">Sin ventas en este turno.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {report.sales.map((sale, index) => (
                <div key={`${sale.invoiceNumber}-${index}`} className="p-4 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {sale.invoiceNumber} · {sale.clientName}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDateTimeCo(sale.createdAt)}
                        {sale.sellerName ? ` · ${sale.sellerName}` : ''}
                        {' · '}
                        {paymentLabel(sale.paymentMethod)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {money(sale.total)}
                    </p>
                  </div>
                  {sale.items.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {sale.items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>
                            {item.productName}{' '}
                            <span className="text-zinc-400">×{item.quantity}</span>
                          </span>
                          <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
                            {money(item.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn(cardShell)}>
        <CardHeader className="border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4 text-rose-600" strokeWidth={1.75} />
            Egresos del turno ({report.egresos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.egresos.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500 md:p-6">Sin egresos en este turno.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {report.egresos.map((e, index) => (
                <div
                  key={`${e.createdAt}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-2 p-4 md:px-6"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{e.concept}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatDateTimeCo(e.createdAt)} · {paymentLabel(e.paymentMethod)}
                      {e.description ? ` · ${e.description}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                    {money(e.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-zinc-400">Sesión {session.id}</p>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone?: 'neutral' | 'income' | 'expense' | 'cash'
}) {
  const tones = {
    neutral: 'text-zinc-600 dark:text-zinc-400',
    income: 'text-emerald-600 dark:text-emerald-400',
    expense: 'text-rose-600 dark:text-rose-400',
    cash: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className={cn('h-4 w-4', tones[tone])} strokeWidth={1.75} />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  )
}
