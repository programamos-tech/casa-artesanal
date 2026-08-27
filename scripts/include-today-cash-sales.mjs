/**
 * Incluye ventas de hoy (facturadas antes de abrir caja) en el turno abierto,
 * retrocediendo opened_at al inicio del día en Colombia.
 *
 * Uso:
 *   node scripts/include-today-cash-sales.mjs --store 8ad34b95-e611-4117-a03d-b44627297ae4
 *   node scripts/include-today-cash-sales.mjs --store 8ad34b95-e611-4117-a03d-b44627297ae4 --apply
 *
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o .env.local).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const STORE2 = '8ad34b95-e611-4117-a03d-b44627297ae4'
const MAIN_STORE = '00000000-0000-0000-0000-000000000001'
const BOGOTA_TZ = 'America/Bogota'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

function getBogotaDateKey(isoOrDate = new Date()) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function getBogotaDayStartISO(isoOrDate = new Date()) {
  return `${getBogotaDateKey(isoOrDate)}T00:00:00-05:00`
}

function applySalesStoreFilter(query, storeId) {
  if (storeId === MAIN_STORE) {
    return query.or(`store_id.is.null,store_id.eq.${MAIN_STORE}`)
  }
  return query.eq('store_id', storeId)
}

function parseArgs(argv) {
  const apply = argv.includes('--apply')
  const storeIdx = argv.indexOf('--store')
  const storeId = storeIdx >= 0 ? argv[storeIdx + 1] : STORE2
  return { apply, storeId }
}

async function main() {
  const { apply, storeId } = parseArgs(process.argv.slice(2))
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: session, error: sessionError } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'open')
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) {
    console.log('No hay caja abierta en la tienda', storeId)
    return
  }

  const dayStart = getBogotaDayStartISO(session.opened_at)
  if (getBogotaDateKey(session.opened_at) !== getBogotaDateKey()) {
    console.log('La caja abierta no es de hoy; no se ajusta.')
    return
  }
  if (new Date(session.opened_at).getTime() <= new Date(dayStart).getTime()) {
    console.log('La apertura ya cubre todo el día.')
    return
  }

  let salesQuery = supabase
    .from('sales')
    .select('id, invoice_number, total, payment_method, status, created_at')
    .gte('created_at', dayStart)
    .lt('created_at', session.opened_at)
    .neq('status', 'cancelled')
    .neq('status', 'draft')
    .order('created_at', { ascending: true })

  salesQuery = applySalesStoreFilter(salesQuery, storeId)
  const { data: sales, error: salesError } = await salesQuery
  if (salesError) throw salesError

  const rows = (sales || []).filter((s) => String(s.payment_method || '') !== 'credit')
  console.log('Tienda:', storeId)
  console.log('Sesión:', session.id)
  console.log('Apertura actual:', session.opened_at)
  console.log('Nueva apertura:', dayStart)
  console.log('Ventas a incluir:', rows.length)
  for (const s of rows) {
    console.log(`  - ${s.invoice_number} · $${Number(s.total || 0).toLocaleString('es-CO')} · ${s.created_at}`)
  }

  if (!rows.length) {
    console.log('Nada que ajustar.')
    return
  }

  if (!apply) {
    console.log('\nDry-run. Ejecuta con --apply para aplicar.')
    return
  }

  const noteLine = `[${new Date().toISOString()}] Apertura ajustada al inicio del día para incluir ${rows.length} venta(s) facturadas antes de abrir caja.`
  const notes = session.notes?.trim() ? `${session.notes.trim()}\n${noteLine}` : noteLine

  const { data: updated, error: updateError } = await supabase
    .from('cash_sessions')
    .update({
      opened_at: dayStart,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .eq('status', 'open')
    .select('*')
    .single()

  if (updateError) throw updateError
  console.log('\nListo. opened_at =', updated.opened_at)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
