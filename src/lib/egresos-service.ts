import { supabaseAdmin } from './supabase'
import { Egreso } from '@/types'
import { getCurrentUserStoreId, isMainStoreUser, getCurrentUser } from './store-helper'
import type { EgresoPaymentMethod } from './egreso-concepts'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export type CreateEgresoInput = {
  concept: string
  conceptOther?: string
  description?: string
  amount: number
  expenseDate: string
  paymentMethod: EgresoPaymentMethod
  storeId?: string
}

export type UpdateEgresoInput = Partial<
  Pick<CreateEgresoInput, 'concept' | 'conceptOther' | 'description' | 'amount' | 'expenseDate' | 'paymentMethod'>
>

function resolveStoreId(explicit?: string | null): string {
  if (explicit) return explicit
  const fromUser = getCurrentUserStoreId()
  return fromUser || MAIN_STORE_ID
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

export class EgresosService {
  static async getEgresos(options?: {
    storeId?: string | null
    status?: 'active' | 'cancelled' | 'all'
    fromDate?: string
    toDate?: string
    concept?: string
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

      const storeId = resolveStoreId(input.storeId)
      const { data, error } = await supabaseAdmin
        .from('egresos')
        .insert({
          store_id: storeId,
          concept,
          concept_other: concept === 'otro' ? input.conceptOther!.trim() : null,
          description: input.description?.trim() || null,
          amount,
          expense_date: input.expenseDate || new Date().toISOString().slice(0, 10),
          payment_method: input.paymentMethod || 'cash',
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
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.concept !== undefined) patch.concept = input.concept
      if (input.conceptOther !== undefined) {
        patch.concept_other = input.concept === 'otro' || input.conceptOther ? input.conceptOther.trim() : null
      }
      if (input.description !== undefined) patch.description = input.description?.trim() || null
      if (input.amount !== undefined) {
        const amount = Number(input.amount)
        if (!amount || amount <= 0) return { success: false, error: 'El monto debe ser mayor a 0' }
        patch.amount = amount
      }
      if (input.expenseDate !== undefined) patch.expense_date = input.expenseDate
      if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod

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
