import { supabaseAdmin } from './supabase'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import { getCurrentUserStoreId, getCurrentUser } from './store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export function getCashRegisterStoreId(): string {
  return getCurrentUserStoreId() || MAIN_STORE_ID
}

function mapRow(row: any): CashSession {
  return {
    id: row.id,
    storeId: row.store_id,
    status: row.status,
    openingCash: Number(row.opening_cash) || 0,
    openedAt: row.opened_at,
    openedBy: row.opened_by ?? null,
    openedByName: row.opened_by_name || '',
    closedAt: row.closed_at ?? null,
    closedBy: row.closed_by ?? null,
    closedByName: row.closed_by_name ?? null,
    salesCash: Number(row.sales_cash) || 0,
    salesTransfer: Number(row.sales_transfer) || 0,
    salesNequi: Number(row.sales_nequi) || 0,
    salesBancolombia: Number(row.sales_bancolombia) || 0,
    salesCard: Number(row.sales_card) || 0,
    salesOther: Number(row.sales_other) || 0,
    salesCredit: Number(row.sales_credit) || 0,
    creditAbonosCash: Number(row.credit_abonos_cash) || 0,
    creditAbonosOther: Number(row.credit_abonos_other) || 0,
    egresosCash: Number(row.egresos_cash) || 0,
    egresosOther: Number(row.egresos_other) || 0,
    salesCount: Number(row.sales_count) || 0,
    egresosCount: Number(row.egresos_count) || 0,
    totalIngresos: Number(row.total_ingresos) || 0,
    totalEgresos: Number(row.total_egresos) || 0,
    expectedCash: Number(row.expected_cash) || 0,
    countedCash: row.counted_cash != null ? Number(row.counted_cash) : null,
    difference: row.difference != null ? Number(row.difference) : null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function emptySummary(openingCash = 0): CashSessionLiveSummary {
  return {
    salesCash: 0,
    salesTransfer: 0,
    salesNequi: 0,
    salesBancolombia: 0,
    salesCard: 0,
    salesOther: 0,
    salesCredit: 0,
    creditAbonosCash: 0,
    creditAbonosOther: 0,
    egresosCash: 0,
    egresosOther: 0,
    salesCount: 0,
    egresosCount: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    expectedCash: openingCash,
  }
}

function applySalesStoreFilter<T extends { or: Function; eq: Function }>(query: T, storeId: string): T {
  if (storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`) as T
  }
  return query.eq('store_id', storeId) as T
}

export class CashSessionsService {
  static async getOpenSession(storeId?: string | null): Promise<CashSession | null> {
    const sid = storeId || getCashRegisterStoreId()
    const { data, error } = await supabaseAdmin
      .from('cash_sessions')
      .select('*')
      .eq('store_id', sid)
      .eq('status', 'open')
      .maybeSingle()

    if (error) {
      console.error('Error getOpenSession:', error)
      return null
    }
    return data ? mapRow(data) : null
  }

  static async hasOpenSession(storeId?: string | null): Promise<boolean> {
    const open = await this.getOpenSession(storeId)
    return Boolean(open)
  }

  static async getSessions(options?: {
    storeId?: string | null
    limit?: number
  }): Promise<CashSession[]> {
    const sid = options?.storeId || getCashRegisterStoreId()
    let query = supabaseAdmin
      .from('cash_sessions')
      .select('*')
      .eq('store_id', sid)
      .order('opened_at', { ascending: false })
      .limit(options?.limit ?? 30)

    const { data, error } = await query
    if (error) {
      console.error('Error getSessions:', error)
      return []
    }
    return (data || []).map(mapRow)
  }

  static async openSession(input: {
    openingCash: number
    notes?: string
    storeId?: string
    userId?: string
    userName?: string
  }): Promise<{ success: boolean; session?: CashSession; error?: string }> {
    const user = getCurrentUser()
    const sid = input.storeId || getCashRegisterStoreId()
    const openingCash = Math.max(0, Math.round(Number(input.openingCash) || 0))

    const existing = await this.getOpenSession(sid)
    if (existing) {
      return { success: false, error: 'Ya hay una caja abierta en esta tienda. Ciérrala antes de abrir otra.' }
    }

    const { data, error } = await supabaseAdmin
      .from('cash_sessions')
      .insert({
        store_id: sid,
        status: 'open',
        opening_cash: openingCash,
        opened_at: new Date().toISOString(),
        opened_by: input.userId || user?.id || null,
        opened_by_name: input.userName || user?.name || 'Usuario',
        notes: input.notes?.trim() || null,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('Error openSession:', error)
      return { success: false, error: error?.message || 'No se pudo abrir la caja' }
    }

    return { success: true, session: mapRow(data) }
  }

  /** Calcula ingresos/egresos de la ventana de la sesión (hasta ahora o closedAt). */
  static async computeLiveSummary(
    session: Pick<CashSession, 'storeId' | 'openedAt' | 'openingCash' | 'closedAt'>
  ): Promise<CashSessionLiveSummary> {
    const from = session.openedAt
    const to = session.closedAt || new Date().toISOString()
    const storeId = session.storeId
    const summary = emptySummary(session.openingCash)

    try {
      // Ventas completadas en la ventana
      let salesQuery = supabaseAdmin
        .from('sales')
        .select('id, total, payment_method, status, created_at, store_id')
        .gte('created_at', from)
        .lte('created_at', to)
        .neq('status', 'cancelled')
        .neq('status', 'draft')

      salesQuery = applySalesStoreFilter(salesQuery, storeId)
      const { data: sales, error: salesError } = await salesQuery
      if (salesError) {
        console.error('cash summary sales:', salesError)
      }

      const saleRows = sales || []
      summary.salesCount = saleRows.length
      const mixedIds = saleRows.filter((s) => s.payment_method === 'mixed').map((s) => s.id)

      const mixedCashBySale = new Map<string, number>()
      const mixedOtherBySale = new Map<string, Record<string, number>>()

      if (mixedIds.length > 0) {
        const { data: payments } = await supabaseAdmin
          .from('sale_payments')
          .select('sale_id, payment_type, amount')
          .in('sale_id', mixedIds)

        for (const p of payments || []) {
          const amt = Number(p.amount) || 0
          const type = String(p.payment_type || '')
          if (type === 'cash') {
            mixedCashBySale.set(p.sale_id, (mixedCashBySale.get(p.sale_id) || 0) + amt)
          } else {
            const bag = mixedOtherBySale.get(p.sale_id) || {}
            bag[type] = (bag[type] || 0) + amt
            mixedOtherBySale.set(p.sale_id, bag)
          }
        }
      }

      for (const sale of saleRows) {
        const total = Number(sale.total) || 0
        const method = String(sale.payment_method || '')

        if (method === 'cash') {
          summary.salesCash += total
        } else if (method === 'nequi') {
          summary.salesNequi += total
        } else if (method === 'bancolombia') {
          summary.salesBancolombia += total
        } else if (method === 'transfer') {
          summary.salesTransfer += total
        } else if (method === 'card') {
          summary.salesCard += total
        } else if (method === 'credit') {
          summary.salesCredit += total
        } else if (method === 'mixed') {
          summary.salesCash += mixedCashBySale.get(sale.id) || 0
          const bag = mixedOtherBySale.get(sale.id) || {}
          for (const [type, amt] of Object.entries(bag)) {
            if (type === 'nequi') summary.salesNequi += amt
            else if (type === 'bancolombia') summary.salesBancolombia += amt
            else if (type === 'transfer') summary.salesTransfer += amt
            else if (type === 'card') summary.salesCard += amt
            else summary.salesOther += amt
          }
        } else if (method === 'warranty') {
          summary.salesOther += total
        } else {
          summary.salesOther += total
        }
      }

      // Abonos a créditos en la ventana
      let abonosQuery = supabaseAdmin
        .from('payment_records')
        .select('amount, payment_method, cash_amount, transfer_amount, status, created_at, store_id, payment_date')
        .or(`and(created_at.gte.${from},created_at.lte.${to}),and(payment_date.gte.${from.slice(0, 10)},payment_date.lte.${to.slice(0, 10)})`)

      abonosQuery = applySalesStoreFilter(abonosQuery, storeId)
      const { data: abonos } = await abonosQuery

      for (const a of abonos || []) {
        if (a.status === 'cancelled') continue
        const created = a.created_at || `${a.payment_date}T12:00:00.000Z`
        if (created < from || created > to) continue
        const method = String(a.payment_method || '')
        const amount = Number(a.amount) || 0
        if (method === 'cash') {
          summary.creditAbonosCash += amount
        } else if (method === 'mixed') {
          summary.creditAbonosCash += Number(a.cash_amount) || 0
          summary.creditAbonosOther += Number(a.transfer_amount) || Math.max(0, amount - (Number(a.cash_amount) || 0))
        } else {
          summary.creditAbonosOther += amount
        }
      }

      // Egresos activos en la ventana (por created_at o expense_date)
      let egresosQuery = supabaseAdmin
        .from('egresos')
        .select('amount, payment_method, status, created_at, expense_date, store_id')
        .eq('status', 'active')
        .gte('created_at', from)
        .lte('created_at', to)

      egresosQuery = applySalesStoreFilter(egresosQuery, storeId)
      const { data: egresos } = await egresosQuery

      for (const e of egresos || []) {
        const amount = Number(e.amount) || 0
        summary.egresosCount += 1
        if (String(e.payment_method) === 'cash') {
          summary.egresosCash += amount
        } else {
          summary.egresosOther += amount
        }
      }

      summary.totalIngresos =
        summary.salesCash +
        summary.salesNequi +
        summary.salesBancolombia +
        summary.salesTransfer +
        summary.salesCard +
        summary.salesOther +
        summary.salesCredit +
        summary.creditAbonosCash +
        summary.creditAbonosOther

      summary.totalEgresos = summary.egresosCash + summary.egresosOther

      summary.expectedCash =
        session.openingCash +
        summary.salesCash +
        summary.creditAbonosCash -
        summary.egresosCash

      return summary
    } catch (error) {
      console.error('Error computeLiveSummary:', error)
      return summary
    }
  }

  static async closeSession(input: {
    sessionId: string
    countedCash: number
    notes?: string
    userId?: string
    userName?: string
  }): Promise<{ success: boolean; session?: CashSession; error?: string }> {
    const user = getCurrentUser()
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('cash_sessions')
      .select('*')
      .eq('id', input.sessionId)
      .single()

    if (fetchError || !row) {
      return { success: false, error: 'Sesión de caja no encontrada' }
    }
    if (row.status !== 'open') {
      return { success: false, error: 'Esta caja ya está cerrada' }
    }

    const session = mapRow(row)
    const closedAt = new Date().toISOString()
    const live = await this.computeLiveSummary({ ...session, closedAt })
    const countedCash = Math.max(0, Math.round(Number(input.countedCash) || 0))
    const difference = countedCash - live.expectedCash

    const { data, error } = await supabaseAdmin
      .from('cash_sessions')
      .update({
        status: 'closed',
        closed_at: closedAt,
        closed_by: input.userId || user?.id || null,
        closed_by_name: input.userName || user?.name || 'Usuario',
        sales_cash: live.salesCash,
        sales_transfer: live.salesTransfer,
        sales_nequi: live.salesNequi,
        sales_bancolombia: live.salesBancolombia,
        sales_card: live.salesCard,
        sales_other: live.salesOther,
        sales_credit: live.salesCredit,
        credit_abonos_cash: live.creditAbonosCash,
        credit_abonos_other: live.creditAbonosOther,
        egresos_cash: live.egresosCash,
        egresos_other: live.egresosOther,
        sales_count: live.salesCount,
        egresos_count: live.egresosCount,
        total_ingresos: live.totalIngresos,
        total_egresos: live.totalEgresos,
        expected_cash: live.expectedCash,
        counted_cash: countedCash,
        difference,
        notes: input.notes?.trim() || session.notes || null,
        updated_at: closedAt,
      })
      .eq('id', input.sessionId)
      .eq('status', 'open')
      .select('*')
      .single()

    if (error || !data) {
      console.error('Error closeSession:', error)
      return { success: false, error: error?.message || 'No se pudo cerrar la caja' }
    }

    return { success: true, session: mapRow(data) }
  }
}
