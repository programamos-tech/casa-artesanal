import { supabase } from './supabase'
import { getCurrentUser, getCurrentUserStoreId, canAccessAllStores } from './store-helper'
import {
  compareProductsBySearchRelevance,
  escapeIlike,
  minSearchLength,
} from './product-search'
import { ProductsService } from './products-service'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
const PER_SECTION = 4
const PRODUCT_SECTION = 8

export type GlobalSearchKind =
  | 'client'
  | 'product'
  | 'sale'
  | 'credit'
  | 'transfer'
  | 'supplier_invoice'

export interface GlobalSearchHit {
  kind: GlobalSearchKind
  id: string
  title: string
  subtitle: string
  href: string
}

export interface GlobalSearchModules {
  clients?: boolean
  products?: boolean
  sales?: boolean
  credits?: boolean
  transfers?: boolean
  supplier_invoices?: boolean
}

function applySalesStoreFilter<T extends { eq: (col: string, val: string) => T; or: (expr: string) => T }>(
  query: T,
  storeId: string | null | undefined,
  user: ReturnType<typeof getCurrentUser>
): T {
  if (storeId && !canAccessAllStores(user)) {
    return query.eq('store_id', storeId)
  }
  return query
}

function applyClientsStoreFilter<T extends { eq: (col: string, val: string) => T; or: (expr: string) => T }>(
  query: T,
  storeId: string | null | undefined
): T {
  if (!storeId || storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return query.eq('store_id', storeId)
}

function applyMainOrMicroStoreFilter<T extends { eq: (col: string, val: string) => T; or: (expr: string) => T }>(
  query: T,
  storeId: string | null | undefined
): T {
  if (!storeId || storeId === MAIN_STORE_ID) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
  }
  return query.eq('store_id', storeId)
}

function formatStockCount(n: number): string {
  return Number(n || 0).toLocaleString('es-CO')
}

export class GlobalSearchService {
  static async search(term: string, modules: GlobalSearchModules): Promise<GlobalSearchHit[]> {
    const clean = term.trim()
    if (!clean || clean.length < minSearchLength(clean)) return []

    const user = getCurrentUser()
    const storeId = getCurrentUserStoreId()
    const allowOtherModules = clean.length >= 2
    const pattern = `%${escapeIlike(clean)}%`

    const tasks: Promise<GlobalSearchHit[]>[] = []

    if (modules.products) {
      tasks.push(this.searchProducts(clean, storeId))
    }
    if (allowOtherModules && modules.clients) {
      tasks.push(this.searchClients(pattern, storeId))
    }
    if (allowOtherModules && modules.sales) {
      tasks.push(this.searchSales(pattern, storeId, user))
    }
    if (allowOtherModules && modules.credits) {
      tasks.push(this.searchCredits(pattern, storeId))
    }
    if (allowOtherModules && modules.supplier_invoices) {
      tasks.push(this.searchSupplierInvoices(pattern, storeId))
    }
    if (allowOtherModules && modules.transfers) {
      tasks.push(this.searchTransfers(pattern, storeId))
    }

    const groups = await Promise.all(tasks)
    return groups.flat()
  }

  private static async searchClients(pattern: string, storeId: string | null | undefined): Promise<GlobalSearchHit[]> {
    let query = supabase
      .from('clients')
      .select('id, name, document')
      .or(`name.ilike.${pattern},email.ilike.${pattern},document.ilike.${pattern}`)
    query = applyClientsStoreFilter(query, storeId)
    const { data, error } = await query.order('name').limit(PER_SECTION)
    if (error || !data) return []
    return data.map(row => ({
      kind: 'client' as const,
      id: row.id,
      title: row.name,
      subtitle: row.document ? `Doc. ${row.document}` : 'Sin documento',
      href: `/clients/${row.id}`,
    }))
  }

  /** Productos: tokens + referencia rápida, siempre con stock de la tienda actual. */
  private static async searchProducts(
    term: string,
    storeId: string | null | undefined
  ): Promise<GlobalSearchHit[]> {
    const products = await ProductsService.searchProducts(term, undefined, storeId)
    const isMainStore = !storeId || storeId === MAIN_STORE_ID

    return [...products]
      .sort((a, b) => compareProductsBySearchRelevance(a, b, term))
      .slice(0, PRODUCT_SECTION)
      .map((p) => {
        const ref = p.reference?.trim() ? `Ref. ${p.reference}` : 'Sin referencia'
        const stockLabel = isMainStore
          ? `Stock local ${formatStockCount(p.stock?.store ?? 0)} · Bodega ${formatStockCount(p.stock?.warehouse ?? 0)}`
          : `Stock ${formatStockCount(p.stock?.store ?? 0)}`
        return {
          kind: 'product' as const,
          id: p.id,
          title: p.name,
          subtitle: `${ref} · ${stockLabel}`,
          href: `/inventory/products?edit=${encodeURIComponent(p.id)}`,
        }
      })
  }

  private static async searchSales(
    pattern: string,
    storeId: string | null | undefined,
    user: ReturnType<typeof getCurrentUser>
  ): Promise<GlobalSearchHit[]> {
    const raw = pattern.replace(/%/g, '')
    const numeric = raw.replace(/#/g, '')
    const isNumber = numeric.length > 0 && !Number.isNaN(Number(numeric))

    let query = supabase.from('sales').select('id, invoice_number, client_name, total, status')
    query = applySalesStoreFilter(query, storeId, user)

    if (isNumber) {
      const padded = numeric.padStart(3, '0')
      query = query.or(
        `invoice_number.eq.#${padded},invoice_number.ilike.%${numeric}%,client_name.ilike.${pattern}`
      )
    } else {
      query = query.ilike('client_name', pattern)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(PER_SECTION)
    if (error || !data) return []

    return data.map(row => ({
      kind: 'sale' as const,
      id: row.id,
      title: row.client_name || 'Cliente final',
      subtitle: row.invoice_number
        ? `Factura ${row.invoice_number}`
        : `Total $${Number(row.total || 0).toLocaleString('es-CO')}`,
      href: `/sales/${row.id}`,
    }))
  }

  private static async searchCredits(pattern: string, storeId: string | null | undefined): Promise<GlobalSearchHit[]> {
    let query = supabase
      .from('credits')
      .select('id, client_id, client_name, invoice_number, pending_amount, status')
      .or(`client_name.ilike.${pattern},invoice_number.ilike.${pattern}`)
    query = applyMainOrMicroStoreFilter(query, storeId)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(PER_SECTION)
    if (error || !data) return []

    return data.map(row => {
      const pending = Number(row.pending_amount || 0)
      const inv = row.invoice_number ? `Factura ${row.invoice_number}` : 'Crédito'
      const pendLabel =
        pending > 0 ? ` · pend. $${pending.toLocaleString('es-CO')}` : ` · ${row.status || 'al día'}`
      return {
        kind: 'credit' as const,
        id: row.id,
        title: row.client_name || 'Cliente',
        subtitle: `${inv}${pendLabel}`,
        href: `/payments/${row.client_id}/credit/${row.id}`,
      }
    })
  }

  private static async searchSupplierInvoices(
    pattern: string,
    storeId: string | null | undefined
  ): Promise<GlobalSearchHit[]> {
    let query = supabase
      .from('supplier_invoices')
      .select('id, invoice_number, suppliers(name)')
      .or(`invoice_number.ilike.${pattern},notes.ilike.${pattern}`)
    query = applyMainOrMicroStoreFilter(query, storeId)
    const { data, error } = await query.order('issue_date', { ascending: false }).limit(PER_SECTION)
    if (error || !data) return []

    return data.map(row => {
      const supplier = row.suppliers as { name?: string } | null
      return {
        kind: 'supplier_invoice' as const,
        id: row.id,
        title: String(row.invoice_number || 'Factura'),
        subtitle: supplier?.name ? `Proveedor: ${supplier.name}` : 'Proveedor',
        href: `/purchases/invoices/${row.id}`,
      }
    })
  }

  private static async searchTransfers(
    pattern: string,
    storeId: string | null | undefined
  ): Promise<GlobalSearchHit[]> {
    let query = supabase
      .from('stock_transfers')
      .select('id, transfer_number, status')
      .ilike('transfer_number', pattern)

    if (storeId && storeId !== MAIN_STORE_ID) {
      query = query.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(PER_SECTION)
    if (error || !data) return []

    return data.map(row => ({
      kind: 'transfer' as const,
      id: row.id,
      title: row.transfer_number || 'Traslado',
      subtitle: row.status ? String(row.status) : 'Traslado',
      href: `/inventory/transfers/${row.id}`,
    }))
  }
}
