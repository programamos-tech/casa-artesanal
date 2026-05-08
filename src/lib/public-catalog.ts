import { supabaseAdmin } from '@/lib/supabase'

/** Tienda principal del sistema (catálogo / bodega). */
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Solo URLs absolutas del Storage del proyecto (o rutas relativas resueltas contra Supabase).
 * Evita que `next/image` rompa el render con hosts fuera de `remotePatterns`.
 */
export function normalizePublicProductImageUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let s = raw.trim()
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    if (s.startsWith('/') && baseUrl) {
      s = new URL(s, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
    }
    const u = new URL(s)
    const pathOk =
      u.pathname.includes('/storage/v1/object/public/') ||
      u.pathname.includes('/storage/v1/object/sign/')
    if (!pathOk) return null
    if (baseUrl) {
      try {
        const bu = new URL(baseUrl)
        if (u.hostname === bu.hostname && u.protocol === bu.protocol) return s
      } catch {
        /* ignore */
      }
    }
    if (
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost') &&
      u.port === '54321'
    ) {
      return s
    }
    return null
  } catch {
    return null
  }
}

export type PublicCatalogProduct = {
  id: string
  name: string
  reference: string
  description: string
  price: number
  brand: string
  imageUrl: string | null
  categoryName: string | null
  inStock: boolean
  status: string
}

/** Punto de venta con unidades disponibles (público, sin costos). */
export type PublicStoreAvailability = {
  storeId: string
  name: string
  city: string | null
  quantity: number
  isMain: boolean
}

export type PublicProductDetail = PublicCatalogProduct & {
  stockWarehouse: number
  stockStoreFloor: number
  mainStoreName: string
  mainStoreCity: string | null
  /** Microtiendas con stock > 0 (la principal va en stockWarehouse / stockStoreFloor). */
  microStores: PublicStoreAvailability[]
  /** Suma bodega + mostrador principal + microtiendas. */
  totalUnits: number
}

const MAX_ROWS = 800

/**
 * Catálogo público: solo columnas seguras (sin costo ni datos internos).
 * Tienda principal: stock bodega + local.
 */
export async function getPublicCatalogProducts(): Promise<PublicCatalogProduct[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, reference, description, price, brand, image_url, stock_warehouse, stock_store, status, category_id'
    )
    .in('status', ['active', 'out_of_stock'])
    .order('name', { ascending: true })
    .limit(MAX_ROWS)

  if (error || !data?.length) {
    return []
  }

  const catIds = [...new Set(data.map((p: { category_id?: string | null }) => p.category_id).filter(Boolean))] as string[]
  let catMap = new Map<string, string>()
  if (catIds.length > 0) {
    const { data: cats } = await supabaseAdmin.from('categories').select('id, name').in('id', catIds)
    if (cats) {
      catMap = new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]))
    }
  }

  return data.map((row: Record<string, unknown>) => {
    const wh = Number(row.stock_warehouse ?? 0)
    const st = Number(row.stock_store ?? 0)
    const total = wh + st
    const cid = row.category_id as string | null | undefined
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      reference: String(row.reference ?? ''),
      description: String(row.description ?? ''),
      price: Number(row.price ?? 0),
      brand: String(row.brand ?? ''),
      imageUrl: normalizePublicProductImageUrl(row.image_url ? String(row.image_url) : null),
      categoryName: cid ? catMap.get(cid)?.trim() || null : null,
      inStock: total > 0,
      status: String(row.status ?? 'active')
    }
  })
}

export async function getPublicProductDetailById(id: string): Promise<PublicProductDetail | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !id?.trim()) {
    return null
  }

  const pid = id.trim()

  const { data: row, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, reference, description, price, brand, image_url, stock_warehouse, stock_store, status, category_id'
    )
    .eq('id', pid)
    .in('status', ['active', 'out_of_stock'])
    .maybeSingle()

  if (error || !row) {
    return null
  }

  const r = row as Record<string, unknown>
  const cid = r.category_id as string | null | undefined
  let categoryName: string | null = null
  if (cid) {
    const { data: cat } = await supabaseAdmin.from('categories').select('name').eq('id', cid).maybeSingle()
    categoryName = (cat as { name?: string } | null)?.name?.trim() || null
  }

  const wh = Math.max(0, Number(r.stock_warehouse ?? 0))
  const st = Math.max(0, Number(r.stock_store ?? 0))
  const status = String(r.status ?? 'active')

  const { data: mainStoreRow } = await supabaseAdmin
    .from('stores')
    .select('name, city')
    .eq('id', MAIN_STORE_ID)
    .maybeSingle()

  const mainStoreName = String((mainStoreRow as { name?: string } | null)?.name ?? 'ZONA T').trim() || 'ZONA T'
  const mainStoreCity =
    (mainStoreRow as { city?: string | null } | null)?.city != null
      ? String((mainStoreRow as { city: string }).city).trim() || null
      : null

  const microStores: PublicStoreAvailability[] = []
  try {
    const { data: stockRows, error: stockErr } = await supabaseAdmin
      .from('store_stock')
      .select('quantity, store_id')
      .eq('product_id', pid)
      .gt('quantity', 0)

    if (stockErr) {
      console.error('[getPublicProductDetailById] store_stock:', stockErr.message)
    } else {
      const rows = (stockRows ?? []) as { quantity?: number; store_id?: string }[]
      const storeIds = [
        ...new Set(
          rows
            .map((r) => String(r.store_id ?? ''))
            .filter((id) => id && id !== MAIN_STORE_ID)
        )
      ]

      const storeMap = new Map<
        string,
        { name: string; city: string | null; is_active: boolean; deleted_at: string | null }
      >()

      if (storeIds.length > 0) {
        const { data: storesData, error: storesErr } = await supabaseAdmin
          .from('stores')
          .select('id, name, city, is_active, deleted_at')
          .in('id', storeIds)

        if (storesErr) {
          console.error('[getPublicProductDetailById] stores:', storesErr.message)
        } else {
          for (const row of storesData ?? []) {
            const rec = row as {
              id: string
              name?: string
              city?: string | null
              is_active?: boolean
              deleted_at?: string | null
            }
            storeMap.set(String(rec.id), {
              name: String(rec.name ?? 'Tienda').trim() || 'Tienda',
              city: rec.city != null ? String(rec.city).trim() || null : null,
              is_active: Boolean(rec.is_active),
              deleted_at: rec.deleted_at != null ? String(rec.deleted_at) : null
            })
          }
        }
      }

      for (const sr of rows) {
        const sid = String(sr.store_id ?? '')
        if (!sid || sid === MAIN_STORE_ID) continue
        const q = Math.max(0, Math.floor(Number(sr.quantity ?? 0)))
        if (q < 1) continue
        const stInfo = storeMap.get(sid)
        if (!stInfo?.is_active || stInfo.deleted_at) continue
        microStores.push({
          storeId: sid,
          name: stInfo.name,
          city: stInfo.city,
          quantity: q,
          isMain: false
        })
      }
    }
  } catch (e) {
    console.error('[getPublicProductDetailById] micro stock exception:', e)
  }

  microStores.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'es'))

  const microTotal = microStores.reduce((s, m) => s + m.quantity, 0)
  const totalUnits = wh + st + microTotal
  const inStock = status !== 'out_of_stock' && totalUnits > 0

  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    reference: String(r.reference ?? ''),
    description: String(r.description ?? ''),
    price: Number(r.price ?? 0),
    brand: String(r.brand ?? ''),
    imageUrl: normalizePublicProductImageUrl(r.image_url ? String(r.image_url) : null),
    categoryName,
    inStock,
    status,
    stockWarehouse: wh,
    stockStoreFloor: st,
    mainStoreName,
    mainStoreCity,
    microStores,
    totalUnits
  }
}
