import { supabase } from './supabase'
import {
  Supplier,
  SupplierInvoice,
  SupplierInvoiceStatus,
  SupplierPaymentRecord
} from '@/types'
import { getCurrentUserStoreId, getCurrentUser } from './store-helper'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

/** URL pública completa o ruta dentro del bucket `supplier-invoices` (p. ej. invoices/xxx.jpg). */
function resolveSupplierInvoiceImageUrl(raw: unknown): string | undefined {
  if (raw == null) return undefined
  const s = String(raw).trim()
  if (!s) return undefined
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '').replace(/^supplier-invoices\//, '')
  if (!path) return undefined
  const { data } = supabase.storage.from('supplier-invoices').getPublicUrl(path)
  return data.publicUrl
}

function supabaseErrorMessage(err: {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string
}): string {
  const parts = [err.message, err.details, err.hint].filter(
    (x): x is string => Boolean(x && String(x).trim())
  )
  let msg = parts.join(' — ')
  if (err.code === '23503') {
    msg += (msg ? ' ' : '') + 'El usuario no coincide con un registro válido en la base de datos (FK user_id).'
  }
  if (err.code === '23514') {
    msg +=
      (msg ? ' ' : '') +
      'Algún valor no cumple las reglas de la base de datos. Si usas método Mixto, aplica las migraciones 20260328120000 y 20260328130000 en Supabase.'
  }
  if (/cash_amount|transfer_amount/i.test(msg)) {
    msg +=
      (msg ? ' ' : '') +
      'Aplica la migración 20260328130000_supplier_payment_cash_transfer_amounts.sql (columnas de desglose mixto).'
  }
  return msg.trim() || 'Error al guardar en la base de datos'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStoreFilter(query: any) {
  const storeId = getCurrentUserStoreId()
  if (!storeId || storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return query.eq('store_id', storeId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterQueryByStoreForId(query: any) {
  const storeId = getCurrentUserStoreId()
  if (!storeId || storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return query.eq('store_id', storeId)
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    name: row.name as string,
    contact: (row.contact as string) || undefined,
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    document: (row.document as string) || undefined,
    storeId: (row.store_id as string) || MAIN_STORE_ID,
    isActive: row.is_active !== false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

function parseInvoiceDocumentRefs(row: Record<string, unknown>): string[] {
  const raw = row.document_urls
  if (raw != null && Array.isArray(raw)) {
    const arr = raw
      .map((x) => (typeof x === 'string' ? x.trim() : String(x).trim()))
      .filter(Boolean)
      .slice(0, 5)
    if (arr.length > 0) return arr
  }
  const legacy = row.image_url
  if (legacy != null && String(legacy).trim()) {
    return [String(legacy).trim()]
  }
  return []
}

function mapInvoice(
  row: Record<string, unknown>,
  supplierName?: string
): SupplierInvoice {
  const suppliers = row.suppliers as { id?: string; name?: string } | null | undefined
  const name =
    supplierName ||
    (suppliers && typeof suppliers === 'object' ? suppliers.name : undefined)
  const attachmentRefs = parseInvoiceDocumentRefs(row)
  const attachmentUrls = attachmentRefs
    .map((r) => resolveSupplierInvoiceImageUrl(r) || (/^https?:\/\//i.test(r) ? r : undefined))
    .filter((u): u is string => Boolean(u))
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierName: name,
    storeId: (row.store_id as string) || MAIN_STORE_ID,
    invoiceNumber: String(row.invoice_number ?? ''),
    issueDate: (row.issue_date as string)?.slice?.(0, 10) || String(row.issue_date),
    dueDate: row.due_date
      ? (row.due_date as string).slice?.(0, 10) || String(row.due_date)
      : undefined,
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount ?? 0),
    status: row.status as SupplierInvoiceStatus,
    attachmentRefs,
    attachmentUrls,
    imageUrl: attachmentUrls[0],
    notes: (row.notes as string) || undefined,
    cancellationReason: (row.cancellation_reason as string) || undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

function mapPayment(row: Record<string, unknown>): SupplierPaymentRecord {
  const cash = row.cash_amount
  const transfer = row.transfer_amount
  return {
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    amount: Number(row.amount),
    paymentDate: row.payment_date as string,
    paymentMethod: row.payment_method as SupplierPaymentRecord['paymentMethod'],
    cashAmount:
      cash != null && cash !== '' ? Number(cash) : undefined,
    transferAmount:
      transfer != null && transfer !== '' ? Number(transfer) : undefined,
    notes: (row.notes as string) || undefined,
    imageUrl: resolveSupplierInvoiceImageUrl(row.image_url),
    userId: row.user_id as string,
    userName: (row.user_name as string) || 'Usuario',
    storeId: (row.store_id as string) || undefined,
    status: (row.status as SupplierPaymentRecord['status']) || 'active',
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || undefined
  }
}

export class SupplierInvoicesService {
  static async getSuppliers(activeOnly = true): Promise<Supplier[]> {
    let query = supabase.from('suppliers').select('*').order('name', { ascending: true })
    query = applyStoreFilter(query)
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    const { data, error } = await query
    if (error) throw error
    return (data || []).map((r) => mapSupplier(r as Record<string, unknown>))
  }

  static async createSupplier(
    input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Supplier> {
    const storeId = input.storeId || getCurrentUserStoreId() || MAIN_STORE_ID
    const { data, error } = await supabase
      .from('suppliers')
      .insert([
        {
          name: input.name,
          contact: input.contact ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          document: input.document ?? null,
          store_id: storeId,
          is_active: input.isActive !== false
        }
      ])
      .select('*')
      .single()
    if (error) throw error
    return mapSupplier(data as Record<string, unknown>)
  }

  static async updateSupplier(
    id: string,
    patch: Partial<
      Pick<
        Supplier,
        'name' | 'contact' | 'phone' | 'email' | 'document' | 'isActive'
      >
    >
  ): Promise<Supplier> {
    const row: Record<string, unknown> = {}
    if (patch.name != null) row.name = patch.name
    if (patch.contact !== undefined) row.contact = patch.contact || null
    if (patch.phone !== undefined) row.phone = patch.phone || null
    if (patch.email !== undefined) row.email = patch.email || null
    if (patch.document !== undefined) row.document = patch.document || null
    if (patch.isActive !== undefined) row.is_active = patch.isActive
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('suppliers')
      .update(row)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapSupplier(data as Record<string, unknown>)
  }

  static async getInvoices(): Promise<SupplierInvoice[]> {
    let query = supabase
      .from('supplier_invoices')
      .select('*, suppliers(id, name)')
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false })
    query = applyStoreFilter(query)
    const { data, error } = await query
    if (error) throw error
    return (data || []).map((r) =>
      mapInvoice(r as Record<string, unknown>)
    )
  }

  static async getInvoiceById(id: string): Promise<SupplierInvoice | null> {
    let query = supabase
      .from('supplier_invoices')
      .select('*, suppliers(id, name)')
      .eq('id', id)
    query = filterQueryByStoreForId(query)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (!data) return null
    return mapInvoice(data as Record<string, unknown>)
  }

  static async createInvoice(input: {
    supplierId: string
    invoiceNumber: string
    issueDate: string
    dueDate?: string
    totalAmount: number
    /** Rutas `invoices/…` o URLs absolutas, máximo 5. */
    documentUrls?: string[]
    notes?: string
    createdBy?: string
  }): Promise<SupplierInvoice> {
    const storeId = getCurrentUserStoreId() || MAIN_STORE_ID
    const docs = (input.documentUrls || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
    const { data, error } = await supabase
      .from('supplier_invoices')
      .insert([
        {
          supplier_id: input.supplierId,
          store_id: storeId,
          invoice_number: input.invoiceNumber,
          issue_date: input.issueDate,
          due_date: input.dueDate || null,
          total_amount: input.totalAmount,
          paid_amount: 0,
          status: 'pending',
          image_url: docs[0] ?? null,
          document_urls: docs.length ? docs : [],
          notes: input.notes || null,
          created_by: input.createdBy || null
        }
      ])
      .select('*, suppliers(id, name)')
      .single()
    if (error) throw error
    return mapInvoice(data as Record<string, unknown>)
  }

  static async updateInvoice(
    id: string,
    patch: Partial<{
      invoiceNumber: string
      issueDate: string
      dueDate: string | null
      totalAmount: number
      documentUrls: string[] | null
      notes: string | null
    }>
  ): Promise<SupplierInvoice> {
    const current = await this.getInvoiceById(id)
    if (!current) throw new Error('Factura no encontrada')
    if (current.status === 'cancelled') throw new Error('No se puede editar una factura anulada')
    if (
      patch.totalAmount != null &&
      patch.totalAmount < current.paidAmount - 0.01
    ) {
      throw new Error('El total no puede ser menor a lo ya abonado')
    }
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.invoiceNumber != null) row.invoice_number = patch.invoiceNumber
    if (patch.issueDate != null) row.issue_date = patch.issueDate
    if (patch.dueDate !== undefined) row.due_date = patch.dueDate
    if (patch.totalAmount != null) row.total_amount = patch.totalAmount
    if (patch.documentUrls !== undefined) {
      const docs = (patch.documentUrls || [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
      row.document_urls = docs.length ? docs : []
      row.image_url = docs[0] ?? null
    }
    if (patch.notes !== undefined) row.notes = patch.notes
    const { data, error } = await supabase
      .from('supplier_invoices')
      .update(row)
      .eq('id', id)
      .select('*, suppliers(id, name)')
      .single()
    if (error) throw error
    return mapInvoice(data as Record<string, unknown>)
  }

  static async cancelInvoice(
    id: string,
    reason: string
  ): Promise<SupplierInvoice> {
    const inv = await this.getInvoiceById(id)
    if (!inv) throw new Error('Factura no encontrada')
    const trimmed = reason.trim()
    if (!trimmed) {
      throw new Error('Indica el motivo de la anulación')
    }
    const { data, error } = await supabase
      .from('supplier_invoices')
      .update({
        status: 'cancelled',
        cancellation_reason: trimmed,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, suppliers(id, name)')
      .single()
    if (error) throw error
    return mapInvoice(data as Record<string, unknown>)
  }

  static async getPaymentHistory(invoiceId: string): Promise<SupplierPaymentRecord[]> {
    const { data, error } = await supabase
      .from('supplier_payment_records')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => mapPayment(r as Record<string, unknown>))
  }

  static async addPayment(input: {
    invoiceId: string
    amount: number
    paymentMethod: SupplierPaymentRecord['paymentMethod']
    cashAmount?: number
    transferAmount?: number
    paymentDate?: string
    notes?: string
    imageUrl?: string | null
    userId: string
    userName: string
  }): Promise<SupplierPaymentRecord> {
    const inv = await this.getInvoiceById(input.invoiceId)
    if (!inv) throw new Error('Factura no encontrada')
    if (inv.status === 'cancelled') throw new Error('La factura está anulada')
    const pending = inv.totalAmount - inv.paidAmount
    if (input.amount > pending + 0.01) {
      throw new Error('El abono supera el saldo pendiente')
    }
    let cashAmount: number | null = null
    let transferAmount: number | null = null
    if (input.paymentMethod === 'mixed') {
      const c = input.cashAmount ?? 0
      const t = input.transferAmount ?? 0
      if (c <= 0 || t <= 0) {
        throw new Error('En mixto indica efectivo y transferencia (ambos mayores a 0)')
      }
      if (Math.abs(c + t - input.amount) > 0.01) {
        throw new Error('Efectivo + transferencia debe igualar el monto del abono')
      }
      cashAmount = c
      transferAmount = t
    }
    const storeId = inv.storeId || getCurrentUserStoreId() || MAIN_STORE_ID
    const baseRow: Record<string, unknown> = {
      invoice_id: input.invoiceId,
      store_id: storeId,
      amount: input.amount,
      payment_date: input.paymentDate || new Date().toISOString(),
      payment_method: input.paymentMethod,
      notes: input.notes || null,
      image_url: input.imageUrl?.trim() || null,
      user_id: input.userId,
      user_name: input.userName,
      status: 'active'
    }
    if (input.paymentMethod === 'mixed' && cashAmount != null && transferAmount != null) {
      baseRow.cash_amount = cashAmount
      baseRow.transfer_amount = transferAmount
    }
    const { data, error } = await supabase
      .from('supplier_payment_records')
      .insert([baseRow])
      .select('*')
      .single()
    if (error) throw new Error(supabaseErrorMessage(error))
    return mapPayment(data as Record<string, unknown>)
  }
}
