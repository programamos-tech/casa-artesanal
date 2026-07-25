import { supabaseAdmin } from './supabase'
import { getCurrentUserStoreId } from './store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type MoneyChannel =
  | 'cash'
  | 'nequi'
  | 'bancolombia'
  | 'transfer'
  | 'card'
  | 'other'

export const MONEY_CHANNEL_LABELS: Record<MoneyChannel, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
}

export type ChannelFlow = {
  channel: MoneyChannel
  label: string
  inAmount: number
  outAmount: number
  netAmount: number
}

export type MonthlyResult = {
  year: number
  month: number
  /** YYYY-MM */
  periodKey: string
  storeId: string
  fromDate: string
  toDate: string
  /** Dinero que entró (ventas cobradas + abonos). Sin facturado a crédito. */
  totalIn: number
  /** Dinero que salió (egresos de caja + cuenta). */
  totalOut: number
  /** Quedó = entró − salió */
  netAmount: number
  salesIn: number
  abonosIn: number
  egresosCajaOut: number
  egresosCuentaOut: number
  /** Facturado a crédito en el mes (informativo; no suma a “entró”). */
  salesCredit: number
  salesCount: number
  abonosCount: number
  egresosCount: number
  channels: ChannelFlow[]
}

function applyStoreFilter<T extends { or: Function; eq: Function }>(query: T, storeId: string): T {
  if (storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`) as T
  }
  return query.eq('store_id', storeId) as T
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** Primer y último día del mes (calendario local), YYYY-MM-DD. */
export function monthDateRange(year: number, month: number): { fromDate: string; toDate: string } {
  const fromDate = `${year}-${pad2(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const toDate = `${year}-${pad2(month)}-${pad2(lastDay)}`
  return { fromDate, toDate }
}

/** Rango ISO para created_at en zona Colombia (UTC−5). */
function colombiaCreatedAtBounds(fromDate: string, toDate: string) {
  return {
    fromIso: `${fromDate}T00:00:00.000-05:00`,
    toIso: `${toDate}T23:59:59.999-05:00`,
  }
}

function emptyChannels(): Record<MoneyChannel, { inAmount: number; outAmount: number }> {
  return {
    cash: { inAmount: 0, outAmount: 0 },
    nequi: { inAmount: 0, outAmount: 0 },
    bancolombia: { inAmount: 0, outAmount: 0 },
    transfer: { inAmount: 0, outAmount: 0 },
    card: { inAmount: 0, outAmount: 0 },
    other: { inAmount: 0, outAmount: 0 },
  }
}

function normalizeChannel(method: string): MoneyChannel {
  const m = String(method || '').toLowerCase()
  if (m === 'cash' || m === 'efectivo') return 'cash'
  if (m === 'nequi') return 'nequi'
  if (m === 'bancolombia') return 'bancolombia'
  if (m === 'transfer') return 'transfer'
  if (m === 'card') return 'card'
  return 'other'
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export class MonthlyResultService {
  static async getMonthlyResult(input: {
    year: number
    month: number
    storeId?: string | null
  }): Promise<MonthlyResult> {
    const year = input.year
    const month = input.month
    const storeId = input.storeId || getCurrentUserStoreId() || MAIN_STORE_ID
    const { fromDate, toDate } = monthDateRange(year, month)
    const { fromIso, toIso } = colombiaCreatedAtBounds(fromDate, toDate)
    const periodKey = `${year}-${pad2(month)}`
    const periodMonth = `${periodKey}-01`

    const channels = emptyChannels()
    let salesIn = 0
    let abonosIn = 0
    let egresosCajaOut = 0
    let egresosCuentaOut = 0
    let salesCredit = 0
    let salesCount = 0
    let abonosCount = 0
    let egresosCount = 0

    // ——— Ventas del mes ———
    let salesQuery = supabaseAdmin
      .from('sales')
      .select('id, total, payment_method, status, created_at, store_id')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .neq('status', 'cancelled')
      .neq('status', 'draft')

    salesQuery = applyStoreFilter(salesQuery, storeId)
    const { data: sales, error: salesError } = await salesQuery
    if (salesError) console.error('monthly result sales:', salesError)

    const saleRows = sales || []
    const mixedIds = saleRows.filter((s) => s.payment_method === 'mixed').map((s) => s.id)
    const mixedBySale = new Map<string, Array<{ type: string; amount: number }>>()

    if (mixedIds.length > 0) {
      const { data: payments } = await supabaseAdmin
        .from('sale_payments')
        .select('sale_id, payment_type, amount')
        .in('sale_id', mixedIds)

      for (const p of payments || []) {
        const list = mixedBySale.get(p.sale_id) || []
        list.push({ type: String(p.payment_type || ''), amount: Number(p.amount) || 0 })
        mixedBySale.set(p.sale_id, list)
      }
    }

    for (const sale of saleRows) {
      const total = Number(sale.total) || 0
      const method = String(sale.payment_method || '')

      if (method === 'credit') {
        salesCredit += total
        continue
      }

      salesCount += 1

      if (method === 'mixed') {
        const parts = mixedBySale.get(sale.id) || []
        for (const part of parts) {
          const ch = normalizeChannel(part.type)
          channels[ch].inAmount += part.amount
          salesIn += part.amount
        }
      } else if (method === 'warranty') {
        channels.other.inAmount += total
        salesIn += total
      } else {
        const ch = normalizeChannel(method)
        channels[ch].inAmount += total
        salesIn += total
      }
    }

    // ——— Abonos de crédito del mes ———
    let abonosQuery = supabaseAdmin
      .from('payment_records')
      .select('amount, payment_method, status, created_at, store_id')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .neq('status', 'cancelled')

    abonosQuery = applyStoreFilter(abonosQuery, storeId)
    const { data: abonos, error: abonosError } = await abonosQuery
    if (abonosError) console.error('monthly result abonos:', abonosError)

    for (const a of abonos || []) {
      const amount = Number(a.amount) || 0
      const ch = normalizeChannel(String(a.payment_method || ''))
      channels[ch].inAmount += amount
      abonosIn += amount
      abonosCount += 1
    }

    // ——— Egresos del mes ———
    // Caja: por expense_date en el mes.
    // Cuenta: por period_month del mes, o expense_date si no tiene period_month.
    let cajaQuery = supabaseAdmin
      .from('egresos')
      .select('id, amount, payment_method, status, expense_date, expense_kind, period_month, store_id')
      .eq('status', 'active')
      .eq('expense_kind', 'caja')
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate)
    cajaQuery = applyStoreFilter(cajaQuery, storeId)

    let cuentaPeriodQuery = supabaseAdmin
      .from('egresos')
      .select('id, amount, payment_method, status, expense_date, expense_kind, period_month, store_id')
      .eq('status', 'active')
      .eq('expense_kind', 'cuenta')
      .eq('period_month', periodMonth)
    cuentaPeriodQuery = applyStoreFilter(cuentaPeriodQuery, storeId)

    let cuentaDateQuery = supabaseAdmin
      .from('egresos')
      .select('id, amount, payment_method, status, expense_date, expense_kind, period_month, store_id')
      .eq('status', 'active')
      .eq('expense_kind', 'cuenta')
      .is('period_month', null)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate)
    cuentaDateQuery = applyStoreFilter(cuentaDateQuery, storeId)

    // Filas antiguas sin expense_kind (default caja en BD) ya van en cajaQuery.
    // Por si hubiera nulls legacy:
    let legacyQuery = supabaseAdmin
      .from('egresos')
      .select('id, amount, payment_method, status, expense_date, expense_kind, period_month, store_id')
      .eq('status', 'active')
      .is('expense_kind', null)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate)
    legacyQuery = applyStoreFilter(legacyQuery, storeId)

    const [cajaRes, cuentaPeriodRes, cuentaDateRes, legacyRes] = await Promise.all([
      cajaQuery,
      cuentaPeriodQuery,
      cuentaDateQuery,
      legacyQuery,
    ])

    if (cajaRes.error) console.error('monthly egresos caja:', cajaRes.error)
    if (cuentaPeriodRes.error) console.error('monthly egresos cuenta period:', cuentaPeriodRes.error)
    if (cuentaDateRes.error) console.error('monthly egresos cuenta date:', cuentaDateRes.error)

    const seen = new Set<string>()
    const egresoRows = [
      ...(cajaRes.data || []),
      ...(cuentaPeriodRes.data || []),
      ...(cuentaDateRes.data || []),
      ...(legacyRes.data || []),
    ].filter((e: { id: string }) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    for (const e of egresoRows) {
      const amount = Number(e.amount) || 0
      const ch = normalizeChannel(String(e.payment_method || ''))
      channels[ch].outAmount += amount
      egresosCount += 1
      if (String(e.expense_kind) === 'cuenta') egresosCuentaOut += amount
      else egresosCajaOut += amount
    }

    const channelList: ChannelFlow[] = (
      Object.keys(channels) as MoneyChannel[]
    ).map((channel) => {
      const inAmount = channels[channel].inAmount
      const outAmount = channels[channel].outAmount
      return {
        channel,
        label: MONEY_CHANNEL_LABELS[channel],
        inAmount,
        outAmount,
        netAmount: inAmount - outAmount,
      }
    })

    const totalIn = salesIn + abonosIn
    const totalOut = egresosCajaOut + egresosCuentaOut

    return {
      year,
      month,
      periodKey,
      storeId,
      fromDate,
      toDate,
      totalIn,
      totalOut,
      netAmount: totalIn - totalOut,
      salesIn,
      abonosIn,
      egresosCajaOut,
      egresosCuentaOut,
      salesCredit,
      salesCount,
      abonosCount,
      egresosCount,
      channels: channelList,
    }
  }

  /** Saldo disponible de un canal en el mes (entró − salió), para validar egresos de cuenta. */
  static async getChannelAvailability(input: {
    year: number
    month: number
    channel: MoneyChannel
    storeId?: string | null
    /** Al editar, no contar este egreso como ya salido. */
    excludeEgresoId?: string | null
  }): Promise<{
    channel: MoneyChannel
    label: string
    inAmount: number
    outAmount: number
    available: number
    periodKey: string
  }> {
    const result = await this.getMonthlyResult({
      year: input.year,
      month: input.month,
      storeId: input.storeId,
    })
    const row = result.channels.find((c) => c.channel === input.channel) || {
      channel: input.channel,
      label: MONEY_CHANNEL_LABELS[input.channel],
      inAmount: 0,
      outAmount: 0,
      netAmount: 0,
    }

    let available = row.netAmount
    if (input.excludeEgresoId) {
      const { data } = await supabaseAdmin
        .from('egresos')
        .select('id, amount, payment_method, expense_kind, period_month, expense_date, status')
        .eq('id', input.excludeEgresoId)
        .maybeSingle()

      if (data && data.status === 'active') {
        const method = String(data.payment_method || '')
        const ch =
          method === 'cash' || method === 'efectivo'
            ? 'cash'
            : method === 'nequi'
              ? 'nequi'
              : method === 'bancolombia'
                ? 'bancolombia'
                : method === 'transfer'
                  ? 'transfer'
                  : method === 'card'
                    ? 'card'
                    : 'other'
        const periodKey = `${input.year}-${pad2(input.month)}`
        const periodMonth = `${periodKey}-01`
        const appliesToMonth =
          (data.expense_kind === 'cuenta' &&
            (data.period_month === periodMonth ||
              (!data.period_month &&
                String(data.expense_date || '').slice(0, 7) === periodKey))) ||
          (data.expense_kind !== 'cuenta' &&
            String(data.expense_date || '').slice(0, 7) === periodKey)

        if (ch === input.channel && appliesToMonth) {
          available += Number(data.amount) || 0
        }
      }
    }

    return {
      channel: input.channel,
      label: row.label,
      inAmount: row.inAmount,
      outAmount: Math.max(0, row.inAmount - available),
      available: Math.max(0, Math.round(available)),
      periodKey: result.periodKey,
    }
  }
}
