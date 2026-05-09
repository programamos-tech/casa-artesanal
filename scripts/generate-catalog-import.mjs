/**
 * Lee el CSV de catálogo y genera migración SQL (categorías + productos).
 * Uso: node scripts/generate-catalog-import.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v5 as uuidv5 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const CSV_REL = 'public/seguroooo 100%_! - seguroooo 100%_!.csv'
const OUT_SQL = path.join(ROOT, 'supabase/migrations/20260511140000_import_csv_catalog_products.sql')
const OUT_REF_CSV = path.join(ROOT, 'supabase/catalog_import_referencias.csv')

const NS_CAT = '6ba7b811-9dad-11d1-80b4-00c04fd430c8' // namespace dedicado (generado)

function parseCSV(text) {
  const rows = []
  let i = 0,
    q = false,
    c = '',
    row = []
  while (i < text.length) {
    const ch = text[i++]
    if (q) {
      if (ch === '"') {
        if (text[i] === '"') {
          c += '"'
          i++
        } else q = false
      } else c += ch
    } else {
      if (ch === '"') q = true
      else if (ch === ',') {
        row.push(c)
        c = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i] === '\n') i++
        row.push(c)
        if (row.some((x) => x !== '')) rows.push(row)
        row = []
        c = ''
      } else c += ch
    }
  }
  if (c.length || row.length) {
    row.push(c)
    rows.push(row)
  }
  return rows
}

function normalizeCategory(raw) {
  const s = raw.trim()
  const lower = s.toLowerCase()
  const fixes = {
    aceso: 'Acceso',
    cuadros: 'Cuadros',
    manilla: 'Manilla',
    monedero: 'Monedero',
  }
  if (fixes[lower]) return fixes[lower]
  return s
}

function catPrefix(norm) {
  const map = {
    Mochila: 'MOCH',
    Bolsos: 'BOLS',
    Monedero: 'MONE',
    Billetera: 'BILL',
    Arete: 'ARET',
    Alpargatas: 'ALPA',
    'Alpargata 150': 'A150',
    Correas: 'CORR',
    Ponchos: 'PONC',
    Mulera: 'MULE',
    Manilla: 'MANI',
    Imanes: 'IMAN',
    Cuchara: 'CUCH',
    Cuadros: 'CUAD',
    Chivas: 'CHIV',
    Tinteros: 'TINT',
    Acceso: 'ACCE',
    Abanicos: 'ABAN',
    Hamaca: 'HAMA',
    Llavero: 'LLAV',
    Gazas: 'GAZA',
  }
  if (map[norm]) return map[norm]
  return norm
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'CAT'
}

function parsePrice(cell) {
  const s = String(cell ?? '').trim()
  if (!s) return null
  // Separador de miles colombiano (ej. 1.200.000) → pesos completos
  const hasThousandDots = /\d{1,3}(\.\d{3})+/.test(s)
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  if (hasThousandDots || n >= 10000) return n
  // Resto del listado: valores en miles de pesos (35 → 35.000 COP)
  return n * 1000
}

function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'"
}

function sellingPrice(cost) {
  if (cost <= 0) return 0
  // Entero en COP sin error de float (35 % sobre costo)
  return Math.ceil((cost * 135) / 100)
}

const raw = fs.readFileSync(path.join(ROOT, CSV_REL), 'utf8')
const rows = parseCSV(raw)
const header = rows[0]
if (!header || header[0] !== 'Categoría') {
  console.error('CSV inesperado', header)
  process.exit(1)
}

const data = []
for (let r = 1; r < rows.length; r++) {
  const [catRaw, nameRaw, priceRaw] = rows[r]
  if (!catRaw?.trim() || !nameRaw?.trim()) continue
  const cost = parsePrice(priceRaw)
  if (cost == null) {
    console.warn('Fila sin precio válido, omitida:', rows[r])
    continue
  }
  data.push({
    categoryRaw: catRaw.trim(),
    categoryNorm: normalizeCategory(catRaw),
    name: nameRaw.trim(),
    cost,
    price: sellingPrice(cost),
  })
}

const categories = [...new Set(data.map((d) => d.categoryNorm))].sort((a, b) => a.localeCompare(b))

const catId = (name) => uuidv5(`cat:${name}`, NS_CAT)

const MAIN_STORE = '00000000-0000-0000-0000-000000000001'

const counters = Object.fromEntries(categories.map((c) => [c, 0]))

const productLines = []
for (const row of data) {
  counters[row.categoryNorm]++
  const seq = counters[row.categoryNorm]
  const prefix = catPrefix(row.categoryNorm)
  const ref = `CA-${prefix}-${String(seq).padStart(3, '0')}`
  productLines.push({
    ...row,
    reference: ref,
    categoryId: catId(row.categoryNorm),
  })
}

let sql = `-- Importación catálogo CSV (Categoría / Producto / Precio compra)
-- Origen: public/seguroooo 100%_! - seguroooo 100%_!.csv
-- Precio CSV: miles de pesos salvo cifras con puntos de miles (ej. 1.200.000 = COP completos).
-- Referencias: CA-{categoría}-{###} (ej. CA-MOCH-001). Precio venta sugerido = ceil(cost * 1.35).
-- Stock inicial: 0 bodega / 0 local. Idempotente por reference (ON CONFLICT).

`

sql += `INSERT INTO public.categories (id, name, description, status, store_id)\nVALUES\n`
sql +=
  categories
    .map(
      (n) =>
        `  (${sqlStr(catId(n))}::uuid, ${sqlStr(n)}, ${sqlStr('Catálogo importado CSV Casa Artesanal')}, 'active', ${sqlStr(MAIN_STORE)}::uuid)`
    )
    .join(',\n') +
  `\nON CONFLICT (id) DO NOTHING;\n\n`

sql += `INSERT INTO public.products (name, description, category_id, brand, reference, price, cost, stock_warehouse, stock_store, status)\nVALUES\n`

sql +=
  productLines
    .map(
      (p) =>
        `  (${sqlStr(p.name)}, NULL, ${sqlStr(p.categoryId)}::uuid, ${sqlStr('Artesanal')}, ${sqlStr(p.reference)}, ${p.price.toFixed(2)}, ${p.cost.toFixed(2)}, 0, 0, 'active')`
    )
    .join(',\n')

sql += `\nON CONFLICT (reference) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  cost = EXCLUDED.cost,
  price = EXCLUDED.price,
  updated_at = now();\n`

fs.writeFileSync(OUT_SQL, sql, 'utf8')

const escCsv = (v) => {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}
const refLines = [
  ['referencia', 'categoria', 'producto', 'costo_cop', 'precio_venta_sugerido_cop'].join(','),
  ...productLines.map((p) =>
    [escCsv(p.reference), escCsv(p.categoryNorm), escCsv(p.name), p.cost, p.price].join(',')
  ),
]
fs.writeFileSync(OUT_REF_CSV, refLines.join('\n') + '\n', 'utf8')

console.log('Wrote', OUT_SQL)
console.log('Wrote', OUT_REF_CSV)
console.log('Categories:', categories.length, 'Products:', productLines.length)
