import { supabaseAdmin } from './supabase'
import { Egreso, EgresoKind } from '@/types'
import { getCurrentUserStoreId, isMainStoreUser, getCurrentUser } from './store-helper'
import type { EgresoPaymentMethod } from './egreso-concepts'
import { firstDayOfMonthISO, getEgresoPaymentLabel } from './egreso-concepts'
import { MonthlyResultService } from './monthly-result-service'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type CreateEgresoInput = {
  concept: string
  conceptOther?: string
  description?: string
  amount: number
  expenseDate: string
  paymentMethod: EgresoPaymentMethod
  expenseKind?: EgresoKind
  periodMonth?: string | null
  storeId?: string
}

export type UpdateEgresoInput = Partial<
  Pick<
    CreateEgresoInput,
    | 'concept'
    | 'conceptOther'
    | 'description'
    | 'amount'
    | 'expenseDate'
    | 'paymentMethod'
    | 'expenseKind'
    | 'periodMonth'
  >
>

function resolveStoreId(explicit?: string | null): string {
  if (explicit) return explicit
  const fromUser = getCurrentUserStoreId()
  return fromUser || MAIN_STORE_ID
}

function normalizeKind(kind?: string | null): EgresoKind {
  return kind === 'cuenta' ? 'cuenta' : 'caja'
}

function mapRow(row: any): Egreso {
  return {
    id: row.id,
    storeId: row.store_id,
    concept: row.concept,
    conceptOther: row.concept_other ?? null,
    description: row.description ?? null,
    amount: Number(row.amount) || 0,
    expenseDate: row.expense_date,
    paymentMethod: row.payment_method,
    expenseKind: normalizeKind(row.expense_kind),
    periodMonth: row.period_month ?? null,
    status: row.status,
    createdBy: row.created_by ?? null,
    createdByName: row.created_by_name || '',
    cancelledBy: row.cancelled_by ?? null,
    cancelledByName: row.cancelled_by_name ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyStoreFilter<T extends { or: Function; eq: Function }>(query: T, storeId: string): T {
  if (storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`) as T
  }
  return query.eq('store_id', storeId) as T
}

function periodParts(periodMonth: string): { year: number; month: number } {
  const [y, m] = periodMonth.slice(0, 10).split('-').map(Number)
  return { year: y || new Date().getFullYear(), month: m || 1 }
}

function methodToChannel(method: string): import('./monthly-result-service').MoneyChannel {
  const m = String(method || '').toLowerCase()
  if (m === 'cash' || m === 'efectivo') return 'cash'
  if (m === 'nequi') return 'nequi'
  if (m === 'bancolombia') return 'bancolombia'
  if (m === 'transfer') return 'transfer'
  if (m === 'card') return 'card'
  return 'other'
}

export class EgresosService {
  static async getEgresos(options?: {
    storeId?: string | null
    status?: 'active' | 'cancelled' | 'all'
    fromDate?: string
    toDate?: string
    concept?: string
    expenseKind?: EgresoKind | 'all'
  }): Promise<Egreso[]> {
    try {
      const storeId = resolveStoreId(options?.storeId)
      let query = supabaseAdmin
        .from('egresos')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      query = applyStoreFilter(query, storeId)

      const status = options?.status ?? 'active'
      if (status !== 'all') {
        query = query.eq('status', status)
      }
      if (options?.fromDate) {
        query = query.gte('expense_date', options.fromDate)
      }
      if (options?.toDate) {
        query = query.lte('expense_date', options.toDate)
      }
      if (options?.concept && options.concept !== 'all') {
        query = query.eq('concept', options.concept)
      }
      if (options?.expenseKind && options.expenseKind !== 'all') {
        query = query.eq('expense_kind', options.expenseKind)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching egresos:', error)
        return []
      }
      return (data || []).map(mapRow)
    } catch (e) {
      console.error('Error in getEgresos:', e)
      return []
    }
  }

  /** Total de egresos activos en un rango (para reportes). */
  static async getEgresosSummaryByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: string | null
  ): Promise<{ totalAmount: number; count: number; items: Egreso[] }> {
    const from = startDate.toISOString().slice(0, 10)
    const to = endDate.toISOString().slice(0, 10)
    const items = await this.getEgresos({
      storeId,
      status: 'active',
      fromDate: from,
      toDate: to,
    })
    const totalAmount = items.reduce((sum, e) => sum + e.amount, 0)
    return { totalAmount, count: items.length, items }
  }

  static async createEgreso(
    input: CreateEgresoInput,
    userId: string,
    userName?: string
  ): Promise<{ success: boolean; egreso?: Egreso; error?: string }> {
    try {
      const concept = input.concept?.trim()
      if (!concept) return { success: false, error: 'Selecciona un concepto' }
      const amount = Number(input.amount)
      if (!amount || amount <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }
      if (concept === 'otro' && !input.conceptOther?.trim()) {
        return { success: false, error: 'Describe en qué se gastó (Otro)' }
      }

      const expenseKind = normalizeKind(input.expenseKind)
      const paymentMethod = (input.paymentMethod ||
        (expenseKind === 'cuenta' ? 'bancolombia' : 'cash')) as EgresoPaymentMethod

      const periodMonth =
        expenseKind === 'cuenta'
          ? (input.periodMonth?.slice(0, 10) || firstDayOfMonthISO()).replace(
              /^(\d{4}-\d{2})-\d{2}$/,
              '$1-01'
            )
          : null

      const storeId = resolveStoreId(input.storeId)

      if (expenseKind === 'cuenta' && periodMonth) {
        const { year, month } = periodParts(periodMonth)
        const channel = methodToChannel(paymentMethod)
        const avail = await MonthlyResultService.getChannelAvailability({
          year,
          month,
          channel,
          storeId,
        })
        if (amount > avail.available + 0.5) {
          const label = getEgresoPaymentLabel(paymentMethod)
          return {
            success: false,
            error: `No hay suficiente dinero en ${label} este mes para ese monto. Elige otro canal o baja el valor.`,
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from('egresos')
        .insert({
          store_id: storeId,
          concept,
          concept_other: concept === 'otro' ? input.conceptOther!.trim() : null,
          description: input.description?.trim() || null,
          amount,
          expense_date: input.expenseDate || new Date().toISOString().slice(0, 10),
          payment_method: paymentMethod,
          expense_kind: expenseKind,
          period_month: periodMonth,
          status: 'active',
          created_by: userId,
          created_by_name: userName || 'Usuario',
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating egreso:', error)
        return { success: false, error: error.message || 'No se pudo crear el egreso' }
      }
      return { success: true, egreso: mapRow(data) }
    } catch (e) {
      console.error('Error in createEgreso:', e)
      return { success: false, error: 'Error inesperado al crear el egreso' }
    }
  }

  static async updateEgreso(
    id: string,
    input: UpdateEgresoInput
  ): Promise<{ success: boolean; egreso?: Egreso; error?: string }> {
    try {
      const { data: current, error: fetchError } = await supabaseAdmin
        .from('egresos')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle()

      if (fetchError || !current) {
        return { success: false, error: 'Egreso no encontrado' }
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.concept !== undefined) patch.concept = input.concept
      if (input.conceptOther !== undefined) {
        patch.concept_other =
          input.concept === 'otro' || input.conceptOther ? input.conceptOther.trim() : null
      }
      if (input.description !== undefined) patch.description = input.description?.trim() || null
      if (input.amount !== undefined) {
        const amount = Number(input.amount)
        if (!amount || amount <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }
        patch.amount = amount
      }
      if (input.expenseDate !== undefined) patch.expense_date = input.expenseDate
      if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod
      if (input.expenseKind !== undefined) patch.expense_kind = normalizeKind(input.expenseKind)

      const nextKind = normalizeKind(
        (patch.expense_kind as string) || current.expense_kind || 'caja'
      )
      const nextMethod = String(
        patch.payment_method || current.payment_method || 'cash'
      ) as EgresoPaymentMethod
      const nextAmount = Number(patch.amount ?? current.amount) || 0

      if (input.periodMonth !== undefined || input.expenseKind !== undefined) {
        if (nextKind === 'cuenta') {
          const raw = input.periodMonth ?? current.period_month ?? firstDayOfMonthISO()
          patch.period_month = String(raw).slice(0, 10).replace(/^(\d{4}-\d{2})-\d{2}$/, '$1-01')
        } else {
          patch.period_month = null
        }
      }

      const nextPeriod =
        nextKind === 'cuenta'
          ? String(patch.period_month || current.period_month || firstDayOfMonthISO()).slice(0, 10)
          : null

      if (nextKind === 'cuenta' && nextPeriod) {
        const { year, month } = periodParts(nextPeriod)
        const channel = methodToChannel(nextMethod)
        const avail = await MonthlyResultService.getChannelAvailability({
          year,
          month,
          channel,
          storeId: current.store_id,
          excludeEgresoId: id,
        })
        if (nextAmount > avail.available + 0.5) {
          const label = getEgresoPaymentLabel(nextMethod)
          return {
            success: false,
            error: `No hay suficiente dinero en ${label} este mes para ese monto. Elige otro canal o baja el valor.`,
          }
        }
      }

      if (patch.concept === 'otro' && !(patch.concept_other as string)?.trim()) {
        return { success: false, error: 'Describe en qué se gastó (Otro)' }
      }

      const { data, error } = await supabaseAdmin
        .from('egresos')
        .update(patch)
        .eq('id', id)
        .eq('status', 'active')
        .select('*')
        .single()

      if (error) {
        console.error('Error updating egreso:', error)
        return { success: false, error: error.message || 'No se pudo actualizar' }
      }
      return { success: true, egreso: mapRow(data) }
    } catch (e) {
      console.error('Error in updateEgreso:', e)
      return { success: false, error: 'Error inesperado al actualizar' }
    }
  }

  static async cancelEgreso(
    id: string,
    userId: string,
    userName?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('egresos')
        .update({
          status: 'cancelled',
          cancelled_by: userId,
          cancelled_by_name: userName || 'Usuario',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'active')

      if (error) {
        console.error('Error cancelling egreso:', error)
        return { success: false, error: error.message || 'No se pudo anular' }
      }
      return { success: true }
    } catch (e) {
      console.error('Error in cancelEgreso:', e)
      return { success: false, error: 'Error inesperado al anular' }
    }
  }
}

export function getEgresosStoreIdForCurrentUser(): string {
  const user = getCurrentUser()
  if (user && isMainStoreUser(user)) return MAIN_STORE_ID
  return getCurrentUserStoreId() || MAIN_STORE_ID
}
