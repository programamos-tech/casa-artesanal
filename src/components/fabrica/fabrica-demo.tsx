'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ReportCallout, ReportTable, StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS, ReportBarChart } from '@/components/dashboard/report-bar-chart'
import type { FabricaScreen } from '@/components/fabrica/fabrica-nav'

/* ---------- Datos de ejemplo ---------- */

const STAGES = ['Corte', 'Tejido', 'Armado', 'Acabado', 'Control calidad']

type OrderStatus = 'borrador' | 'liberada' | 'en_proceso' | 'terminada'

type Order = {
  code: string
  product: string
  category: Category
  qty: number
  good: number
  status: OrderStatus
  stage?: string
  due: string
}

type Category = 'Sombreros' | 'Bolsos' | 'Hamacas' | 'Individuales'

const ORDERS: Order[] = [
  { code: 'OP-0144', product: 'Bolso tejido wayuu', category: 'Bolsos', qty: 30, good: 0, status: 'borrador', due: '20 oct' },
  { code: 'OP-0143', product: 'Mochila arhuaca', category: 'Bolsos', qty: 25, good: 0, status: 'liberada', due: '15 oct' },
  { code: 'OP-0142', product: 'Sombrero vueltiao 19v', category: 'Sombreros', qty: 60, good: 18, status: 'en_proceso', stage: 'Armado', due: '08 oct' },
  { code: 'OP-0141', product: 'Bolso tejido wayuu', category: 'Bolsos', qty: 40, good: 0, status: 'en_proceso', stage: 'Tejido', due: '10 oct' },
  { code: 'OP-0140', product: 'Hamaca sanjacintera', category: 'Hamacas', qty: 12, good: 4, status: 'en_proceso', stage: 'Acabado', due: '06 oct' },
  { code: 'OP-0139', product: 'Individual caña flecha', category: 'Individuales', qty: 120, good: 96, status: 'en_proceso', stage: 'Control calidad', due: '04 oct' },
  { code: 'OP-0138', product: 'Sombrero vueltiao 19v', category: 'Sombreros', qty: 50, good: 48, status: 'terminada', due: '30 sep' },
  { code: 'OP-0137', product: 'Individual caña flecha', category: 'Individuales', qty: 100, good: 97, status: 'terminada', due: '28 sep' },
]

const STATUS_META: Record<OrderStatus, { label: string; tone: ReportTone }> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  liberada: { label: 'Liberada', tone: 'info' },
  en_proceso: { label: 'En proceso', tone: 'warning' },
  terminada: { label: 'Terminada', tone: 'success' },
}

const PROCESS_BY_STAGE: Record<string, { code: string; product: string; pending: number }[]> = {
  Corte: [{ code: 'OP-0143', product: 'Mochila arhuaca', pending: 12 }],
  Tejido: [{ code: 'OP-0141', product: 'Bolso tejido wayuu', pending: 40 }],
  Armado: [
    { code: 'OP-0142', product: 'Sombrero vueltiao 19v', pending: 26 },
    { code: 'OP-0140', product: 'Hamaca sanjacintera', pending: 1 },
  ],
  Acabado: [
    { code: 'OP-0142', product: 'Sombrero vueltiao 19v', pending: 12 },
    { code: 'OP-0140', product: 'Hamaca sanjacintera', pending: 7 },
  ],
  'Control calidad': [{ code: 'OP-0139', product: 'Individual caña flecha', pending: 24 }],
}

const STAGE_WASTE = [1.2, 5.3, 2.1, 0.8, 1.6]
const STAGE_WASTE_EXPECTED = [1, 3, 2, 1, 1]

type Material = { n: string; u: string; stock: number; min: number; cost: number }

const MATERIALS: Material[] = [
  { n: 'Caña flecha', u: 'm', stock: 2450, min: 3000, cost: 1200 },
  { n: 'Tinte natural negro', u: 'L', stock: 4.5, min: 10, cost: 18000 },
  { n: 'Lona', u: 'm', stock: 22, min: 30, cost: 14000 },
  { n: 'Hilo de algodón', u: 'rollo', stock: 86, min: 40, cost: 9000 },
  { n: 'Fique', u: 'kg', stock: 38, min: 20, cost: 16000 },
  { n: 'Cremallera 20 cm', u: 'und', stock: 140, min: 100, cost: 1500 },
]

const MOVES = [
  { d: '02 oct', t: 'Consumo', m: 'Caña flecha', q: '−320 m', ref: 'OP-0142 · Tejido' },
  { d: '02 oct', t: 'Compra', m: 'Caña flecha', q: '+1.000 m', ref: 'Asoc. Tuchín' },
  { d: '01 oct', t: 'Merma', m: 'Hilo de algodón', q: '−2 rollos', ref: 'OP-0141 · Tejido' },
  { d: '01 oct', t: 'Ajuste', m: 'Fique', q: '−1,5 kg', ref: 'Conteo físico' },
  { d: '30 sep', t: 'Compra', m: 'Tinte natural negro', q: '+5 L', ref: 'Tintes del Sinú' },
]

type RecipeItem = { m: string; q: number; u: string; w: number; c: number }

const RECIPES: Record<string, { version: number; price: number; items: RecipeItem[] }> = {
  'Sombrero vueltiao 19v': {
    version: 2,
    price: 68000,
    items: [
      { m: 'Caña flecha', q: 19, u: 'm', w: 5, c: 1200 },
      { m: 'Tinte natural negro', q: 0.1, u: 'L', w: 3, c: 18000 },
      { m: 'Hilo de algodón', q: 0.05, u: 'rollo', w: 2, c: 9000 },
    ],
  },
  'Bolso tejido wayuu': {
    version: 3,
    price: 120000,
    items: [
      { m: 'Hilo de algodón', q: 1.2, u: 'rollo', w: 4, c: 9000 },
      { m: 'Lona', q: 0.4, u: 'm', w: 3, c: 14000 },
      { m: 'Cremallera 20 cm', q: 1, u: 'und', w: 1, c: 1500 },
    ],
  },
  'Hamaca sanjacintera': {
    version: 1,
    price: 260000,
    items: [
      { m: 'Hilo de algodón', q: 6, u: 'rollo', w: 3, c: 9000 },
      { m: 'Fique', q: 0.8, u: 'kg', w: 2, c: 16000 },
    ],
  },
  'Mochila arhuaca': {
    version: 1,
    price: 180000,
    items: [
      { m: 'Fique', q: 0.6, u: 'kg', w: 4, c: 16000 },
      { m: 'Hilo de algodón', q: 1.5, u: 'rollo', w: 3, c: 9000 },
      { m: 'Tinte natural negro', q: 0.05, u: 'L', w: 2, c: 18000 },
    ],
  },
  'Individual caña flecha': {
    version: 2,
    price: 18000,
    items: [
      { m: 'Caña flecha', q: 6, u: 'm', w: 4, c: 1200 },
      { m: 'Hilo de algodón', q: 0.02, u: 'rollo', w: 2, c: 9000 },
    ],
  },
}

const WASTE_ROWS = [
  { m: 'Caña flecha', s: 'Tejido', exp: '1.810 m', real: '1.906 m', diff: '+96 m', cost: 115200 },
  { m: 'Hilo de algodón', s: 'Tejido', exp: '14 rollos', real: '16 rollos', diff: '+2 rollos', cost: 18000 },
  { m: 'Lona', s: 'Corte', exp: '38 m', real: '39,5 m', diff: '+1,5 m', cost: 21000 },
  { m: 'Tinte natural negro', s: 'Acabado', exp: '9 L', real: '9,3 L', diff: '+0,3 L', cost: 5400 },
]

const PLAN_ROWS = [
  { p: 'Sombrero vueltiao 15v', parque: 5, piso2: 4, fab: 0, min: 30, prod: 0, mat: false },
  { p: 'Pulsera tejida', parque: 7, piso2: 5, fab: 0, min: 80, prod: 0, mat: true },
  { p: 'Abanico caña flecha', parque: 4, piso2: 2, fab: 0, min: 40, prod: 0, mat: true },
  { p: 'Sombrero vueltiao 19v', parque: 6, piso2: 3, fab: 7, min: 40, prod: 60, mat: true },
  { p: 'Bolso tejido wayuu', parque: 3, piso2: 5, fab: 0, min: 30, prod: 40, mat: true },
  { p: 'Hamaca sanjacintera', parque: 2, piso2: 1, fab: 0, min: 15, prod: 12, mat: true },
]

/* ---------- Formato y clases ---------- */

const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 })
const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const pct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const ghostBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white [&_svg]:size-3.5 [&_svg]:shrink-0'

const cardClass =
  'casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'

const columnClass = 'casa-artesanal-preserve-surface flex flex-col gap-2 rounded-xl bg-zinc-100/70 p-2 dark:bg-white/[0.03]'

const sectionTitleClass = 'text-sm font-semibold text-zinc-900 dark:text-white'

const mutedClass = 'text-xs text-zinc-500 dark:text-white/50'

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

/* ---------- Piezas pequeñas ---------- */

function Kpi({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: ReportTone }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-zinc-500 dark:text-white/50">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums tracking-tight',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          tone === 'danger' && 'text-rose-600 dark:text-rose-400',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
          (tone === 'neutral' || tone === 'info') && 'text-zinc-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] md:grid-cols-4">
      {children}
    </div>
  )
}

function StatusLabel({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-zinc-600 dark:text-white/70">
      <StatusDot tone={meta.tone} />
      {meta.label}
    </span>
  )
}

function Health({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px]">
      <StatusDot tone={ok ? 'success' : 'danger'} />
      {ok ? okText : badText}
    </span>
  )
}

function Progress({ value, total }: { value: number; total: number }) {
  const width = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100))
  return (
    <div className="casa-artesanal-preserve-surface h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/[0.08]">
      <div className="casa-artesanal-preserve-surface h-full rounded-full bg-zinc-900 dark:bg-white" style={{ width: `${width}%` }} />
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="casa-artesanal-preserve-surface inline-flex flex-wrap gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'casa-artesanal-preserve-surface rounded-md border px-3 py-1 text-[13px] transition-colors',
            value === o.value
              ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-8 flex-wrap items-center gap-3">
      <h2 className={cn(sectionTitleClass, 'flex-1')}>{title}</h2>
      {action}
    </div>
  )
}

function demoToast() {
  toast.info('Vista de demostración: no se guardan cambios.')
}

/* ---------- Pantallas ---------- */

function ResumenScreen() {
  const router = useRouter()
  const active = ORDERS.filter((o) => o.status === 'en_proceso')
  const wip = STAGES.map((s) => PROCESS_BY_STAGE[s].reduce((a, b) => a + b.pending, 0))
  const lowStock = MATERIALS.filter((m) => m.stock < m.min).length

  return (
    <div className="space-y-8">
      <KpiRow>
        <Kpi label="Órdenes en proceso" value={String(active.length)} />
        <Kpi label="Unidades en proceso" value={fmt(wip.reduce((a, b) => a + b, 0))} />
        <Kpi label="Merma del mes (meta 3%)" value="4,8%" tone="warning" />
        <Kpi label="Materiales bajo mínimo" value={String(lowStock)} tone="danger" />
      </KpiRow>

      <section>
        <SectionHead
          title="Dónde está la producción ahora"
          action={
            <Link href="/fabrica/procesos" className={ghostBtnClass}>
              Ver procesos
              <ChevronRight />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STAGES.map((s, i) => {
            const hot = STAGE_WASTE[i] > STAGE_WASTE_EXPECTED[i] + 1
            return (
              <Link
                key={s}
                href="/fabrica/procesos"
                className={cn(
                  cardClass,
                  'block px-3 py-3 transition-colors hover:border-zinc-300 dark:hover:border-white/[0.16]',
                  hot && 'border-amber-300 dark:border-amber-500/40'
                )}
              >
                <p className="truncate text-xs text-zinc-500 dark:text-white/50">
                  {i + 1}. {s}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-white">{wip[i]}</p>
                <p className={mutedClass}>und. en proceso</p>
                <p
                  className={cn(
                    'mt-2 text-[11px]',
                    hot ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-white/45'
                  )}
                >
                  Merma {pct(STAGE_WASTE[i])}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="Órdenes activas" />
          <ReportTable
            headers={['Orden', 'Producto', 'Etapa', 'Avance', 'Entrega']}
            rows={active.map((o) => [
              <span key="c" className="font-mono text-xs font-medium">
                {o.code}
              </span>,
              o.product,
              o.stage ?? '',
              <div key="p" className="flex w-32 items-center gap-2">
                <Progress value={o.good} total={o.qty} />
                <span className="text-xs text-zinc-500 dark:text-white/50">
                  {o.good}/{o.qty}
                </span>
              </div>,
              o.due,
            ])}
            rowTone={active.map((o) => (o.code === 'OP-0140' ? 'warning' : undefined))}
            onRowClick={(i) => router.push(`/fabrica/ordenes/${active[i].code}`)}
          />
        </section>
        <section>
          <SectionHead title="Alertas" />
          <div className="space-y-2">
            <ReportCallout tone="warning" title="Tejido está perdiendo material" onClick={() => router.push('/fabrica/mermas')}>
              Merma de 5,3% contra 3% esperado. Son 96 m de caña flecha este mes.
            </ReportCallout>
            <ReportCallout tone="danger" title="Caña flecha bajo mínimo" onClick={() => router.push('/fabrica/materiales')}>
              Quedan 2.450 m y las órdenes abiertas necesitan 1.900 m.
            </ReportCallout>
            <ReportCallout tone="info" title="OP-0140 entrega en 4 días" onClick={() => router.push('/fabrica/ordenes/OP-0140')}>
              Van 4 de 12 hamacas en Acabado.
            </ReportCallout>
          </div>
        </section>
      </div>
    </div>
  )
}

function OrderCard({ o }: { o: Order }) {
  const started = o.status === 'en_proceso' || o.status === 'terminada'
  return (
    <Link
      href={`/fabrica/ordenes/${o.code}`}
      className={cn(cardClass, 'block space-y-2 p-3 transition-colors hover:border-zinc-300 dark:hover:border-white/[0.16]')}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">{o.code}</span>
        <span className="ml-auto text-xs text-zinc-500 dark:text-white/45">{o.due}</span>
      </div>
      <p className="text-[13px] text-zinc-800 dark:text-zinc-200">{o.product}</p>
      {started ? (
        <>
          <Progress value={o.good} total={o.qty} />
          <p className={mutedClass}>
            {o.good} de {o.qty} und.{o.stage ? ` · ${o.stage}` : ''}
          </p>
        </>
      ) : (
        <p className={mutedClass}>{o.qty} und. planeadas</p>
      )}
    </Link>
  )
}

function OrdenesScreen() {
  const [category, setCategory] = useState<'all' | Category>('all')
  const cols: OrderStatus[] = ['borrador', 'liberada', 'en_proceso', 'terminada']
  const filtered = ORDERS.filter((o) => category === 'all' || o.category === category)

  return (
    <div className="space-y-4">
      <Segmented
        value={category}
        onChange={setCategory}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'Sombreros', label: 'Sombreros' },
          { value: 'Bolsos', label: 'Bolsos' },
          { value: 'Hamacas', label: 'Hamacas' },
          { value: 'Individuales', label: 'Individuales' },
        ]}
      />
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cols.map((c) => {
          const list = filtered.filter((o) => o.status === c)
          return (
            <div key={c} className={columnClass}>
              <div className="flex items-center px-1 py-0.5">
                <StatusLabel status={c} />
                <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-white/45">{list.length}</span>
              </div>
              {list.map((o) => (
                <OrderCard key={o.code} o={o} />
              ))}
              {list.length === 0 ? <p className="px-1 py-3 text-center text-xs text-zinc-400 dark:text-white/35">Sin órdenes</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type StageRow = { s: string; inQ: number; good: number; bad: number; state: 'Terminada' | 'En proceso' | 'Pendiente' }

const STAGES_OP_0142: StageRow[] = [
  { s: 'Corte', inQ: 60, good: 60, bad: 0, state: 'Terminada' },
  { s: 'Tejido', inQ: 60, good: 57, bad: 3, state: 'Terminada' },
  { s: 'Armado', inQ: 57, good: 30, bad: 1, state: 'En proceso' },
  { s: 'Acabado', inQ: 30, good: 18, bad: 0, state: 'En proceso' },
  { s: 'Control calidad', inQ: 18, good: 0, bad: 0, state: 'En proceso' },
]

function stageRowsFor(o: Order): StageRow[] {
  if (o.code === 'OP-0142') return STAGES_OP_0142
  const done = o.status === 'terminada'
  const idx = done ? STAGES.length : o.stage ? STAGES.indexOf(o.stage) : -1
  let flow = o.qty
  return STAGES.map((s, i) => {
    if (i < idx) {
      const bad = i === 1 ? (done ? o.qty - o.good : Math.round(o.qty * 0.04)) : 0
      const row: StageRow = { s, inQ: flow, good: flow - bad, bad, state: 'Terminada' }
      flow -= bad
      return row
    }
    if (i === idx) return { s, inQ: flow, good: o.good, bad: 0, state: 'En proceso' }
    return { s, inQ: 0, good: 0, bad: 0, state: 'Pendiente' }
  })
}

function consumptionFor(o: Order) {
  if (o.code === 'OP-0142') {
    return [
      { m: 'Caña flecha', u: 'm', exp: 1140, real: 1236, cost: 1200 },
      { m: 'Tinte natural negro', u: 'L', exp: 6, real: 6.3, cost: 18000 },
      { m: 'Hilo de algodón', u: 'rollo', exp: 3, real: 3, cost: 9000 },
    ]
  }
  if (o.status === 'borrador' || o.status === 'liberada') return []
  return (RECIPES[o.product]?.items ?? []).map((it) => {
    const exp = Math.round(it.q * o.qty * 10) / 10
    const real = it.m === 'Caña flecha' ? Math.round(exp * 1.08 * 10) / 10 : exp
    return { m: it.m, u: it.u, exp, real, cost: it.c }
  })
}

function DetalleScreen({ order }: { order: Order }) {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'done'>(order.status === 'terminada' ? 'done' : 'idle')
  const rows = stageRowsFor(order)
  const consumption = consumptionFor(order)
  const bad = rows.reduce((a, r) => a + r.bad, 0)
  const ready = order.good
  const inProcess = order.status === 'en_proceso' ? Math.max(0, order.qty - ready - bad) : 0

  return (
    <div className="space-y-8">
      <KpiRow>
        <Kpi label="Planeadas" value={fmt(order.qty)} />
        <Kpi label={order.status === 'terminada' ? 'Entraron a stock' : 'Listas para cerrar'} value={fmt(ready)} tone="success" />
        <Kpi label="En proceso" value={fmt(inProcess)} />
        <Kpi label={`Dañadas (${pct(order.qty ? (bad / order.qty) * 100 : 0)})`} value={fmt(bad)} tone={bad > 0 ? 'warning' : 'neutral'} />
      </KpiRow>

      <section>
        <SectionHead title="Avance por etapa" />
        <ReportTable
          headers={['Etapa', 'Entró', 'Salió bueno', 'Dañado', 'Pendiente', 'Estado']}
          align={['left', 'right', 'right', 'right', 'right', 'left']}
          rows={rows.map((r) => [
            r.s,
            r.state === 'Pendiente' ? '—' : fmt(r.inQ),
            r.state === 'Pendiente' ? '—' : fmt(r.good),
            r.bad > 0 ? (
              <span key="b" className="font-semibold text-amber-600 dark:text-amber-400">
                {r.bad}
              </span>
            ) : (
              '0'
            ),
            r.state === 'Pendiente' ? '—' : fmt(Math.max(0, r.inQ - r.good - r.bad)),
            r.state,
          ])}
          rowTone={rows.map((r) => (r.state === 'Terminada' ? 'success' : r.state === 'En proceso' ? 'warning' : 'neutral'))}
        />
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="Material: esperado según receta vs. real" />
          {consumption.length === 0 ? (
            <p className={cn(cardClass, 'px-4 py-6 text-center text-[13px] text-zinc-500 dark:text-white/50')}>
              Sin consumo todavía.
            </p>
          ) : (
            <ReportTable
              headers={['Material', 'Esperado', 'Real', 'Diferencia', 'Costo extra']}
              align={['left', 'right', 'right', 'right', 'right']}
              rows={consumption.map((c) => {
                const diff = c.real - c.exp
                return [
                  c.m,
                  `${fmt(c.exp)} ${c.u}`,
                  `${fmt(c.real)} ${c.u}`,
                  diff > 0 ? `+${fmt(Math.round(diff * 10) / 10)} (${pct((diff / c.exp) * 100)})` : '0',
                  diff > 0 ? cop(Math.round(diff * c.cost)) : '—',
                ]
              })}
              rowTone={consumption.map((c) => (c.real - c.exp > 0 ? 'warning' : 'success'))}
            />
          )}
        </section>

        <section className={cn(cardClass, 'p-4')}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className={cn(sectionTitleClass, 'flex-1')}>
              {order.status === 'borrador' ? 'Liberar orden' : order.status === 'liberada' ? 'Iniciar producción' : 'Cerrar orden'}
            </h2>
            <StatusLabel status={phase === 'done' ? 'terminada' : order.status} />
          </div>

          {order.status === 'borrador' || order.status === 'liberada' ? (
            <button type="button" className={headerPrimaryBtnClass} onClick={demoToast}>
              {order.status === 'borrador' ? 'Liberar a producción' : 'Pasar a Corte'}
            </button>
          ) : phase === 'idle' ? (
            <div className="space-y-3">
              <p className="text-[13px] text-zinc-600 dark:text-white/60">
                {ready} und. de {order.product} listas para entrar al stock de Fábrica.
              </p>
              <button type="button" className={headerPrimaryBtnClass} disabled={ready === 0} onClick={() => setPhase('confirm')}>
                Cerrar parcial ({ready} und.)
              </button>
            </div>
          ) : phase === 'confirm' ? (
            <div className="space-y-3">
              <ul className="space-y-1.5 text-[13px] text-zinc-700 dark:text-white/75">
                <li>
                  +{ready} {order.product} en stock de Fábrica
                </li>
                <li>Se descuentan los materiales consumidos</li>
                <li>Se registra la merma por etapa</li>
                <li>Queda en Actividades con tu usuario</li>
              </ul>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={headerPrimaryBtnClass}
                  onClick={() => {
                    setPhase('done')
                    toast.success(`${order.code} cerrada: +${ready} und. en Fábrica`)
                  }}
                >
                  Confirmar
                </button>
                <button type="button" className={ghostBtnClass} onClick={() => setPhase('idle')}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 text-[13px] text-zinc-700 dark:text-white/75">
              <StatusDot tone="success" />
              {ready} und. ingresadas al stock de Fábrica.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function ProcesosScreen() {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {STAGES.map((s, i) => {
        const list = PROCESS_BY_STAGE[s]
        const total = list.reduce((a, b) => a + b.pending, 0)
        return (
          <div key={s} className={columnClass}>
            <div className="flex items-center px-1 py-0.5">
              <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                {i + 1}. {s}
              </span>
              <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-white/45">{total} und.</span>
            </div>
            {list.map((o) => (
              <Link
                key={o.code + s}
                href={`/fabrica/ordenes/${o.code}`}
                className={cn(cardClass, 'block p-3 transition-colors hover:border-zinc-300 dark:hover:border-white/[0.16]')}
              >
                <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">{o.code}</p>
                <p className="mt-1 text-[13px] text-zinc-700 dark:text-zinc-300">{o.product}</p>
                <p className={cn(mutedClass, 'mt-1')}>{o.pending} pendientes</p>
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function MaterialesScreen() {
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const mats = MATERIALS.filter((m) => filter === 'all' || m.stock < m.min)
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[1.5fr_1fr]">
      <section className="min-w-0">
        <SectionHead
          title="Stock de materiales"
          action={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'low', label: 'Bajo mínimo' },
              ]}
            />
          }
        />
        <ReportTable
          headers={['Material', 'Stock', 'Mínimo', 'Costo unit.', 'Estado']}
          align={['left', 'right', 'right', 'right', 'left']}
          rows={mats.map((m) => [
            m.n,
            `${fmt(m.stock)} ${m.u}`,
            `${fmt(m.min)} ${m.u}`,
            cop(m.cost),
            <Health key="h" ok={m.stock >= m.min} okText="OK" badText="Bajo mínimo" />,
          ])}
        />
      </section>
      <section className="min-w-0">
        <SectionHead title="Últimos movimientos" />
        <ReportTable
          headers={['Fecha', 'Tipo', 'Material', 'Cant.', 'Origen']}
          align={['left', 'left', 'left', 'right', 'left']}
          rows={MOVES.map((m) => [m.d, m.t, m.m, m.q, m.ref])}
          rowTone={MOVES.map((m) => (m.t === 'Merma' ? 'warning' : m.t === 'Compra' ? 'success' : 'neutral'))}
        />
      </section>
    </div>
  )
}

function RecetasScreen() {
  const products = Object.keys(RECIPES)
  const [sel, setSel] = useState(products[0])
  const recipe = RECIPES[sel]
  const total = recipe.items.reduce((a, b) => a + b.q * b.c, 0)
  const margin = recipe.price > 0 ? Math.round(((recipe.price - total) / recipe.price) * 100) : 0

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col">
        {products.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSel(p)}
            className={cn(
              'casa-artesanal-preserve-surface shrink-0 rounded-md px-3 py-2 text-left text-[13px] transition-colors',
              sel === p
                ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-white/[0.08] dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-white/60 dark:hover:bg-white/[0.04] dark:hover:text-white'
            )}
          >
            {p}
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{sel}</h2>
            <p className={cn(mutedClass, 'mt-0.5')}>Receta versión {recipe.version} · cantidades por 1 unidad</p>
          </div>
          <button type="button" className={ghostBtnClass} onClick={demoToast}>
            Nueva versión
          </button>
        </div>

        <ReportTable
          headers={['Material', 'Cantidad por unidad', 'Merma esperada', 'Costo']}
          align={['left', 'right', 'right', 'right']}
          rows={recipe.items.map((b) => [b.m, `${fmt(b.q)} ${b.u}`, `${b.w}%`, cop(Math.round(b.q * b.c))])}
        />

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <Kpi label="Costo de materiales por unidad" value={cop(Math.round(total))} />
          <Kpi label="Precio de venta" value={cop(recipe.price)} />
          <Kpi label="Margen sobre materiales" value={`${margin}%`} tone="success" />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-zinc-900 dark:text-white">Ruta de producción</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {STAGES.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="casa-artesanal-preserve-surface rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-white/[0.06] dark:text-white/70">
                  {s}
                </span>
                {i < STAGES.length - 1 ? <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-white/25" aria-hidden /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MermasScreen() {
  const isDarkMode = useIsDarkMode()
  const data = STAGES.map((s, i) => ({ etapa: s, real: STAGE_WASTE[i], esperada: STAGE_WASTE_EXPECTED[i] }))
  const totalCost = WASTE_ROWS.reduce((a, r) => a + r.cost, 0)
  const asPct = (v: number) => `${String(v).replace('.', ',')}%`

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="Merma por etapa: real vs. esperada" />
          <ReportBarChart
            data={data}
            categoryKey="etapa"
            series={[
              { key: 'real', name: 'Merma real', color: REPORT_CHART_COLORS.primary },
              { key: 'esperada', name: 'Merma esperada (receta)', color: REPORT_CHART_COLORS.secondary },
            ]}
            isDarkMode={isDarkMode}
            height={240}
            showValues
            formatCompact={asPct}
            formatValue={asPct}
          />
        </section>
        <section className="space-y-4">
          <Kpi label="Costo de merma extra en el mes" value={cop(totalCost)} tone="danger" />
          <ReportCallout tone="warning" title="El problema está en Tejido">
            Pierde 2,3 puntos más de lo esperado, casi todo en caña flecha.
          </ReportCallout>
        </section>
      </div>
      <section>
        <SectionHead title="Detalle por material" />
        <ReportTable
          headers={['Material', 'Etapa', 'Esperado', 'Real', 'Diferencia', 'Costo']}
          align={['left', 'left', 'right', 'right', 'right', 'right']}
          rows={WASTE_ROWS.map((r) => [r.m, r.s, r.exp, r.real, r.diff, cop(r.cost)])}
          rowTone={WASTE_ROWS.map((r) => (r.cost > 50000 ? 'danger' : 'warning'))}
        />
      </section>
    </div>
  )
}

function PlaneacionScreen() {
  const [created, setCreated] = useState<Set<string>>(new Set())
  const rows = PLAN_ROWS.map((r) => ({ ...r, sug: Math.max(0, r.min - (r.parque + r.piso2 + r.fab) - r.prod) }))

  return (
    <ReportTable
      headers={['Producto', 'El Parque', '2 Piso', 'Fábrica', 'Mínimo', 'En producción', 'Sugerido', 'Material', '']}
      align={['left', 'right', 'right', 'right', 'right', 'right', 'right', 'left', 'right']}
      rows={rows.map((r) => [
        r.p,
        r.parque,
        r.piso2,
        r.fab,
        r.min,
        r.prod,
        r.sug > 0 ? (
          <span key="s" className="font-semibold">
            {r.sug}
          </span>
        ) : (
          'Cubierto'
        ),
        r.sug > 0 ? <Health key="h" ok={r.mat} okText="Alcanza" badText="Falta caña flecha" /> : '',
        r.sug > 0 ? (
          created.has(r.p) ? (
            <span key="b" className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-zinc-600 dark:text-white/60">
              <StatusDot tone="success" />
              Orden creada
            </span>
          ) : (
            <button
              key="b"
              type="button"
              disabled={!r.mat}
              className={r.mat ? headerPrimaryBtnClass : ghostBtnClass}
              onClick={() => {
                setCreated((prev) => new Set(prev).add(r.p))
                toast.success(`Orden creada: ${r.sug} und. de ${r.p}`)
              }}
            >
              Crear orden
            </button>
          )
        ) : (
          ''
        ),
      ])}
      rowTone={rows.map((r) => (r.sug === 0 ? 'success' : r.mat ? 'info' : 'danger'))}
    />
  )
}

function CounterButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="casa-artesanal-preserve-surface flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition-colors active:bg-zinc-200 dark:bg-white/[0.08] dark:text-white dark:active:bg-white/[0.14]"
    >
      {children}
    </button>
  )
}

function Counter({ label, value, setValue }: { label: string; value: number; setValue: (n: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] text-zinc-600 dark:text-white/60">{label}</p>
      <div className="flex items-center gap-3">
        <CounterButton label={`Restar ${label}`} onClick={() => setValue(Math.max(0, value - 1))}>
          <Minus className="h-5 w-5" />
        </CounterButton>
        <span className="flex-1 text-center text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">{value}</span>
        <CounterButton label={`Sumar ${label}`} onClick={() => setValue(value + 1)}>
          <Plus className="h-5 w-5" />
        </CounterButton>
      </div>
    </div>
  )
}

function OperarioScreen() {
  const [stage, setStage] = useState('Armado')
  const [pending, setPending] = useState<Record<string, number>>(() =>
    Object.fromEntries(STAGES.flatMap((s) => PROCESS_BY_STAGE[s].map((o) => [`${o.code}|${s}`, o.pending])))
  )
  const orders = PROCESS_BY_STAGE[stage]
  const [orderCode, setOrderCode] = useState(orders[0]?.code ?? '')
  const [good, setGood] = useState(10)
  const [bad, setBad] = useState(1)
  const [reason, setReason] = useState('material')
  const [saved, setSaved] = useState<{ good: number; bad: number } | null>(null)

  const current = orders.find((o) => o.code === orderCode) ?? orders[0]
  const key = current ? `${current.code}|${stage}` : ''
  const left = pending[key] ?? 0

  const pickStage = (s: string) => {
    setStage(s)
    setOrderCode(PROCESS_BY_STAGE[s][0]?.code ?? '')
    setSaved(null)
  }

  const register = () => {
    if (!current) return
    const g = Math.min(good, left)
    const b = Math.min(bad, left - g)
    setPending((prev) => ({ ...prev, [key]: Math.max(0, left - g - b) }))
    setSaved({ good: g, bad: b })
    setGood(0)
    setBad(0)
  }

  return (
    <div className="flex justify-center py-2">
      <div className="casa-artesanal-preserve-surface w-[340px] max-w-full rounded-[28px] border border-zinc-300 bg-zinc-100 p-2.5 dark:border-white/[0.12] dark:bg-[#111113]">
        <div className="casa-artesanal-preserve-surface flex min-h-[620px] flex-col gap-4 rounded-[20px] bg-white p-4 dark:bg-zinc-950">
          <div className="flex items-center text-xs text-zinc-500 dark:text-white/45">
            <span>Casa Artesanal · Fábrica</span>
            <span className="ml-auto">María</span>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] text-zinc-600 dark:text-white/60">Mi etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickStage(s)}
                  className={cn(
                    'casa-artesanal-preserve-surface rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                    stage === s
                      ? 'border-zinc-900 bg-zinc-900 font-semibold text-white dark:border-white dark:bg-white dark:text-zinc-900'
                      : 'border-zinc-200 text-zinc-600 dark:border-white/[0.12] dark:text-white/65'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {orders.map((o) => {
              const k = `${o.code}|${stage}`
              const activeOrder = current?.code === o.code
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setOrderCode(o.code)
                    setSaved(null)
                  }}
                  className={cn(
                    'casa-artesanal-preserve-surface block w-full rounded-xl border p-3 text-left transition-colors',
                    activeOrder
                      ? 'border-zinc-900 dark:border-white/70'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-white/[0.1] dark:hover:border-white/[0.2]'
                  )}
                >
                  <div className="flex items-center">
                    <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">{o.code}</span>
                    <span className="ml-auto text-xs text-zinc-500 dark:text-white/45">{pending[k] ?? 0} pendientes</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-white/60">
                    {o.product} · {stage}
                  </p>
                </button>
              )
            })}
          </div>

          <Counter
            label="Unidades buenas"
            value={good}
            setValue={(n) => {
              setGood(n)
              setSaved(null)
            }}
          />
          <Counter
            label="Unidades dañadas"
            value={bad}
            setValue={(n) => {
              setBad(n)
              setSaved(null)
            }}
          />

          {bad > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] text-zinc-600 dark:text-white/60">Motivo del daño</p>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-transparent pl-3 pr-8 text-[13px] text-zinc-800 focus:outline-none dark:border-white/[0.12] dark:text-white/85"
                >
                  <option value="material">Material defectuoso</option>
                  <option value="error">Error en el proceso</option>
                  <option value="maquina">Falla de herramienta</option>
                  <option value="otro">Otro</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
              </div>
            </div>
          ) : null}

          <div className="flex-1" />

          {saved ? (
            <ReportCallout tone="success" title="Avance registrado">
              {saved.good} {saved.good === 1 ? 'buena pasa' : 'buenas pasan'} a la siguiente etapa
              {saved.bad > 0 ? ` y ${saved.bad} ${saved.bad === 1 ? 'queda' : 'quedan'} como merma` : ''}.
            </ReportCallout>
          ) : null}

          <button
            type="button"
            onClick={register}
            disabled={!current || left === 0 || good + bad === 0}
            className="casa-artesanal-preserve-surface h-11 rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Registrar avance
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Página ---------- */

const SCREEN_HEAD: Record<Exclude<FabricaScreen, 'detalle'>, { title: string; subtitle: string; action?: string }> = {
  resumen: { title: 'Resumen de fábrica', subtitle: 'Producción, mermas y materiales de hoy.' },
  ordenes: { title: 'Órdenes de producción', subtitle: '8 órdenes · 4 en proceso', action: 'Nueva orden' },
  procesos: { title: 'Procesos en vivo', subtitle: 'Unidades en cada etapa ahora mismo.' },
  operario: { title: 'Vista operario', subtitle: 'Pantalla de celular para registrar avance en planta.' },
  materiales: { title: 'Materiales', subtitle: '6 materiales · 3 bajo mínimo', action: 'Registrar compra' },
  recetas: { title: 'Recetas', subtitle: 'Material por unidad de cada producto.', action: 'Nueva receta' },
  mermas: { title: 'Mermas', subtitle: 'Material perdido por etapa · septiembre 2026' },
  planeacion: { title: 'Qué producir', subtitle: 'Según el stock de las tiendas.' },
}

export function FabricaDemo({ screen, orderCode }: { screen: FabricaScreen; orderCode?: string }) {
  const order = useMemo(() => ORDERS.find((o) => o.code === orderCode), [orderCode])

  const head =
    screen === 'detalle'
      ? order
        ? { title: `${order.code} · ${order.product}`, subtitle: `${order.qty} und. · entrega ${order.due}` }
        : { title: 'Orden no encontrada', subtitle: orderCode ?? '' }
      : SCREEN_HEAD[screen]

  const action = 'action' in head ? head.action : undefined

  const content = (() => {
    switch (screen) {
      case 'resumen':
        return <ResumenScreen />
      case 'ordenes':
        return <OrdenesScreen />
      case 'detalle':
        return order ? <DetalleScreen key={order.code} order={order} /> : null
      case 'procesos':
        return <ProcesosScreen />
      case 'operario':
        return <OperarioScreen />
      case 'materiales':
        return <MaterialesScreen />
      case 'recetas':
        return <RecetasScreen />
      case 'mermas':
        return <MermasScreen />
      case 'planeacion':
        return <PlaneacionScreen />
    }
  })()

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">{head.title}</h1>
            <span className="casa-artesanal-preserve-surface shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-white/[0.06] dark:text-white/45">
              Demo
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">{head.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {screen === 'detalle' ? (
            <Link href="/fabrica/ordenes" className={ghostBtnClass}>
              <ArrowLeft />
              Volver
            </Link>
          ) : null}
          {action ? (
            <button type="button" className={headerPrimaryBtnClass} onClick={demoToast}>
              <Plus className="h-3.5 w-3.5" />
              {action}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{content}</div>
    </div>
  )
}
