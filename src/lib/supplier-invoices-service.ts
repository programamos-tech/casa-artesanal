import { supabase } from './supabase'
import {
  Supplier,
  SupplierInvoice,
  SupplierInvoiceStatus,
  SupplierPaymentRecord,
  SaleCollectionOption,
  SupplierPaymentSourceChannel
} from '@/types'
import { getCurrentUserStoreId } from './store-helper'
import { EgresosService } from './egresos-service'
import { firstDayOfMonthISO } from './egreso-concepts'

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
  const saleJoin = row.sales as
    | { invoice_number?: string; client_name?: string }
    | null
    | undefined
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
    sourceSaleId: (row.source_sale_id as string) || undefined,
    sourceChannel: (row.source_channel as SupplierPaymentSourceChannel) || undefined,
    sourceSaleInvoiceNumber:
      (saleJoin && typeof saleJoin === 'object'
        ? saleJoin.invoice_number
        : undefined) || undefined,
    sourceSaleClientName:
      (saleJoin && typeof saleJoin === 'object' ? saleJoin.client_name : undefined) ||
      undefined,
    linkedEgresoId: (row.linked_egreso_id as string) || undefined,
    userId: row.user_id as string,
    userName: (row.user_name as string) || 'Usuario',
    storeId: (row.store_id as string) || undefined,
    status: (row.status as SupplierPaymentRecord['status']) || 'active',
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || undefined
  }
}

const SALE_COLLECTION_CHANNELS: SupplierPaymentSourceChannel[] = [
  'cash',
  'transfer',
  'nequi',
  'bancolombia',
  'card',
]

function isSaleCollectionChannel(v: string): v is SupplierPaymentSourceChannel {
  return (SALE_COLLECTION_CHANNELS as string[]).includes(v)
}

function channelToSupplierPaymentMethod(
  channel: SupplierPaymentSourceChannel
): 'cash' | 'transfer' {
  return channel === 'cash' ? 'cash' : 'transfer'
}

function channelLabel(channel: SupplierPaymentSourceChannel): string {
  switch (channel) {
    case 'cash':
      return 'Efectivo'
    case 'nequi':
      return 'Nequi'
    case 'bancolombia':
      return 'Bancolombia'
    case 'card':
      return 'Tarjeta'
    default:
      return 'Transferencia'
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
      .select('*, sales:source_sale_id(invoice_number, client_name)')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => mapPayment(r as Record<string, unknown>))
  }

  /**
   * Cobros de ventas recientes aún disponibles para destinar a un pago de proveedor.
   * Una venta mixta aparece como una opción por canal.
   */
  static async listAvailableSaleCollections(options?: {
    search?: string
    limit?: number
  }): Promise<SaleCollectionOption[]> {
    const limit = Math.min(Math.max(options?.limit ?? 30, 1), 80)
    const search = (options?.search || '').trim()

    const since = new Date()
    since.setDate(since.getDate() - 90)

    let salesQuery = supabase
      .from('sales')
      .select('id, invoice_number, client_name, total, payment_method, created_at, store_id, status')
      .gte('created_at', since.toISOString())
      .neq('status', 'cancelled')
      .neq('status', 'draft')
      .neq('payment_method', 'credit')
      .neq('payment_method', 'warranty')
      .neq('payment_method', 'pending')
      .order('created_at', { ascending: false })
      .limit(120)

    salesQuery = applyStoreFilter(salesQuery)

    if (search) {
      const escaped = search.replace(/[%_,]/g, '')
      if (escaped) {
        salesQuery = salesQuery.or(
          `invoice_number.ilike.%${escaped}%,client_name.ilike.%${escaped}%`
        )
      }
    }

    const { data: sales, error: salesError } = await salesQuery
    if (salesError) throw salesError

    const saleRows = (sales || []) as Array<Record<string, unknown>>
    if (saleRows.length === 0) return []

    const saleIds = saleRows.map((s) => s.id as string)
    const mixedIds = saleRows
      .filter((s) => String(s.payment_method) === 'mixed')
      .map((s) => s.id as string)

    const mixedBySale = new Map<string, Array<{ type: string; amount: number }>>()
    if (mixedIds.length > 0) {
      const { data: payments, error: payErr } = await supabase
        .from('sale_payments')
        .select('sale_id, payment_type, amount')
        .in('sale_id', mixedIds)
      if (payErr) throw payErr
      for (const p of payments || []) {
        const list = mixedBySale.get(p.sale_id) || []
        list.push({
          type: String(p.payment_type || ''),
          amount: Number(p.amount) || 0,
        })
        mixedBySale.set(p.sale_id, list)
      }
    }

    const { data: usedRows, error: usedErr } = await supabase
      .from('supplier_payment_records')
      .select('source_sale_id, source_channel, amount, status')
      .in('source_sale_id', saleIds)
      .eq('status', 'active')
    if (usedErr) throw usedErr

    const usedByKey = new Map<string, number>()
    for (const u of usedRows || []) {
      const sid = u.source_sale_id as string
      const ch = String(u.source_channel || '')
      if (!sid || !isSaleCollectionChannel(ch)) continue
      const key = `${sid}:${ch}`
      usedByKey.set(key, (usedByKey.get(key) || 0) + (Number(u.amount) || 0))
    }

    const optionsOut: SaleCollectionOption[] = []

    for (const sale of saleRows) {
      const saleId = sale.id as string
      const method = String(sale.payment_method || '')
      const invoiceNumber = String(sale.invoice_number || '').trim() || saleId.slice(0, 8)
      const clientName = String(sale.client_name || 'Cliente')
      const createdAt = String(sale.created_at || '')

      const parts: Array<{ channel: SupplierPaymentSourceChannel; amount: number }> = []

      if (method === 'mixed') {
        for (const part of mixedBySale.get(saleId) || []) {
          if (!isSaleCollectionChannel(part.type)) continue
          if (part.amount <= 0) continue
          parts.push({ channel: part.type, amount: part.amount })
        }
      } else if (isSaleCollectionChannel(method)) {
        parts.push({ channel: method, amount: Number(sale.total) || 0 })
      }

      for (const part of parts) {
        const used = usedByKey.get(`${saleId}:${part.channel}`) || 0
        const available = Math.max(0, part.amount - used)
        if (available < 1) continue
        optionsOut.push({
          saleId,
          invoiceNumber,
          clientName,
          createdAt,
          channel: part.channel,
          collectedAmount: part.amount,
          usedAmount: used,
          availableAmount: available,
        })
      }
    }

    return optionsOut.slice(0, limit)
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
    /** Destinar cobro de esta venta al abono (crea egreso de cuenta). */
    sourceSaleId?: string
    sourceChannel?: SupplierPaymentSourceChannel
  }): Promise<SupplierPaymentRecord> {
    const inv = await this.getInvoiceById(input.invoiceId)
    if (!inv) throw new Error('Factura no encontrada')
    if (inv.status === 'cancelled') throw new Error('La factura está anulada')
    const pending = inv.totalAmount - inv.paidAmount
    if (input.amount > pending + 0.01) {
      throw new Error('El abono supera el saldo pendiente')
    }

    let paymentMethod = input.paymentMethod
    let cashAmount: number | null = null
    let transferAmount: number | null = null
    let sourceSaleId: string | null = null
    let sourceChannel: SupplierPaymentSourceChannel | null = null
    let saleMeta: {
      invoiceNumber: string
      clientName: string
      createdAt: string
    } | null = null

    if (input.sourceSaleId) {
      if (!input.sourceChannel || !isSaleCollectionChannel(input.sourceChannel)) {
        throw new Error('Indica el canal del cobro de la venta')
      }
      sourceSaleId = input.sourceSaleId
      sourceChannel = input.sourceChannel
      paymentMethod = channelToSupplierPaymentMethod(sourceChannel)

      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .select('id, invoice_number, client_name, total, payment_method, status, store_id, created_at')
        .eq('id', sourceSaleId)
        .maybeSingle()
      if (saleErr) throw saleErr
      if (!sale) throw new Error('La venta seleccionada no existe')
      if (sale.status === 'cancelled' || sale.status === 'draft') {
        throw new Error('La venta no está disponible')
      }

      const method = String(sale.payment_method || '')
      let collected = 0
      if (method === 'mixed') {
        const { data: parts, error: partsErr } = await supabase
          .from('sale_payments')
          .select('payment_type, amount')
          .eq('sale_id', sourceSaleId)
          .eq('payment_type', sourceChannel)
        if (partsErr) throw partsErr
        collected = (parts || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
      } else if (method === sourceChannel) {
        collected = Number(sale.total) || 0
      } else {
        throw new Error('El canal no coincide con el método de pago de la venta')
      }

      const { data: usedRows, error: usedErr } = await supabase
        .from('supplier_payment_records')
        .select('amount')
        .eq('source_sale_id', sourceSaleId)
        .eq('source_channel', sourceChannel)
        .eq('status', 'active')
      if (usedErr) throw usedErr
      const used = (usedRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
      const available = Math.max(0, collected - used)
      if (input.amount > available + 0.01) {
        throw new Error(
          `Ese cobro solo tiene ${available.toLocaleString('es-CO')} COP disponibles para destinar`
        )
      }

      saleMeta = {
        invoiceNumber: String(sale.invoice_number || '').trim() || sourceSaleId.slice(0, 8),
        clientName: String(sale.client_name || 'Cliente'),
        createdAt: String(sale.created_at || ''),
      }
    } else if (paymentMethod === 'mixed') {
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
    const autoNote =
      sourceSaleId && sourceChannel && saleMeta
        ? `Cobro venta ${saleMeta.invoiceNumber} · ${channelLabel(sourceChannel)} · ${saleMeta.clientName}`
        : null
    const notes =
      [input.notes?.trim(), autoNote].filter(Boolean).join(' · ') || null

    const baseRow: Record<string, unknown> = {
      invoice_id: input.invoiceId,
      store_id: storeId,
      amount: input.amount,
      payment_date: input.paymentDate || new Date().toISOString(),
      payment_method: paymentMethod,
      notes,
      image_url: input.imageUrl?.trim() || null,
      user_id: input.userId,
      user_name: input.userName,
      status: 'active',
      source_sale_id: sourceSaleId,
      source_channel: sourceChannel,
    }
    if (paymentMethod === 'mixed' && cashAmount != null && transferAmount != null) {
      baseRow.cash_amount = cashAmount
      baseRow.transfer_amount = transferAmount
    }

    const { data, error } = await supabase
      .from('supplier_payment_records')
      .insert([baseRow])
      .select('*, sales:source_sale_id(invoice_number, client_name)')
      .single()
    if (error) throw new Error(supabaseErrorMessage(error))

    const payment = mapPayment(data as Record<string, unknown>)

    if (sourceSaleId && sourceChannel) {
      const expenseDate = (input.paymentDate || new Date().toISOString()).slice(0, 10)
      // El egreso cuenta en el mes en que entró el cobro de la venta (no en el mes del abono).
      const saleDate = saleMeta?.createdAt
        ? new Date(saleMeta.createdAt)
        : new Date(`${expenseDate}T12:00:00`)
      const periodMonth = firstDayOfMonthISO(
        Number.isNaN(saleDate.getTime()) ? new Date(`${expenseDate}T12:00:00`) : saleDate
      )
      const egresoRes = await EgresosService.createEgreso(
        {
          concept: 'pago_proveedor',
          description: `Abono proveedor ${inv.supplierName || ''} · factura ${inv.invoiceNumber} · cobro venta ${saleMeta?.invoiceNumber || ''}`.trim(),
          amount: input.amount,
          expenseDate,
          paymentMethod: sourceChannel,
          expenseKind: 'cuenta',
          periodMonth,
          storeId,
        },
        input.userId,
        input.userName
      )

      if (!egresoRes.success || !egresoRes.egreso) {
        await supabase.from('supplier_payment_records').delete().eq('id', payment.id)
        throw new Error(
          egresoRes.error ||
            'No se pudo registrar el egreso de cuenta ligado al cobro de la venta'
        )
      }

      const { error: linkErr } = await supabase
        .from('supplier_payment_records')
        .update({ linked_egreso_id: egresoRes.egreso.id })
        .eq('id', payment.id)
      if (linkErr) {
        console.error('No se pudo vincular egreso al abono:', linkErr)
      }
      payment.linkedEgresoId = egresoRes.egreso.id
    }

    return payment
  }
}
