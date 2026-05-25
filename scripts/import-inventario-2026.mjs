/**
 * Genera SQL para reemplazar el catálogo desde:
 * public/inventario 2026 nuevo sistema - Hoja 1.csv
 *
 * Uso: node scripts/import-inventario-2026.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v5 as uuidv5 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const CSV_PATH = path.join(ROOT, 'public/inventario 2026 nuevo sistema - Hoja 1.csv')
const OUT_SQL = path.join(ROOT, 'scripts/sql/import-inventario-2026.sql')
const OUT_PRICES_SQL = path.join(ROOT, 'scripts/sql/update-inventario-2026-prices.sql')

const NS_CAT = 'a3f2c8e1-9b4d-4e6f-8a1c-202605221200'
const MAIN_STORE = '00000000-0000-0000-0000-000000000001'

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
        if (row.some(x => x !== '')) rows.push(row)
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

function parsePrice(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return Number.parseInt(s.replace(/\./g, ''), 10)
  }
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

function titleWords(s) {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return t
  return t
    .split(' ')
    .map(w => {
      if (!w) return w
      if (w.length <= 3 && /^[a-z]/.test(w)) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'"
}

function catId(name) {
  return uuidv5(`cat:${name.toLowerCase()}`, NS_CAT)
}

const raw = fs.readFileSync(CSV_PATH, 'utf8')
const table = parseCSV(raw)
const header = table[0].map(h => h.trim().toLowerCase())
const idx = {
  codigo: header.indexOf('codigo'),
  categoria: header.indexOf('categoria'),
  producto: header.indexOf('producto'),
  retail: header.indexOf('precio cliente final'),
  wholesale: header.indexOf('precio mayorista'),
  cantidad: header.indexOf('cantidad'),
}

const products = []
const skipped = []

for (let r = 1; r < table.length; r++) {
  const row = table[r]
  let cod = (row[idx.codigo] || '').trim()
  let prod = (row[idx.producto] || '').trim()
  const cat = (row[idx.categoria] || '').trim()
  if (!cod) continue
  if (!prod || !cat) {
    skipped.push({ cod, reason: 'sin categoría o producto' })
    continue
  }

  // Sin valor en el Excel → 0 (no inferir desde nombre ni copiar el otro precio)
  const retail = parsePrice(row[idx.retail]) ?? 0
  const wholesale = parsePrice(row[idx.wholesale]) ?? 0

  const catName = titleWords(cat)
  const name = titleWords(`${catName} ${prod}`)
  const reference = String(Number.parseInt(cod, 10)).padStart(3, '0')
  const qtyRaw = (row[idx.cantidad] || '').trim()
  let stock = 0
  if (qtyRaw) {
    const n = Number.parseInt(qtyRaw.replace(/\./g, ''), 10)
    stock = Number.isFinite(n) ? n : 0
  }

  products.push({
    reference,
    name,
    catName,
    categoryId: catId(catName),
    retail,
    wholesale,
    stock,
  })
}

const categories = [...new Map(products.map(p => [p.catName, p.categoryId])).entries()].sort((a, b) =>
  a[0].localeCompare(b[0], 'es')
)

let sql = `-- Inventario 2026 — importación catálogo
-- Origen: public/inventario 2026 nuevo sistema - Hoja 1.csv
-- Referencia = código CSV con ceros a la izquierda (001, 002, …)
-- Nombre = categoría + producto | stock_store = cantidad | bodega = 0
-- Precio vacío en Excel → retail_price / wholesale_price = 0

BEGIN;

-- Limpieza inventario y catálogo activo (conserva productos ligados a ventas históricas)
DELETE FROM public.transfer_items;
DELETE FROM public.store_stock;

UPDATE public.products
SET status = 'discontinued', stock_store = 0, stock_warehouse = 0, updated_at = now()
WHERE id IN (SELECT DISTINCT product_id FROM public.sale_items WHERE product_id IS NOT NULL);

DELETE FROM public.products
WHERE id NOT IN (
  SELECT DISTINCT product_id FROM public.sale_items WHERE product_id IS NOT NULL
);

DELETE FROM public.categories c
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id);

`

sql += `INSERT INTO public.categories (id, name, description, status, store_id)\nVALUES\n`
sql +=
  categories
    .map(
      ([name, id]) =>
        `  (${sqlStr(id)}::uuid, ${sqlStr(name)}, ${sqlStr('Catálogo inventario 2026')}, 'active', ${sqlStr(MAIN_STORE)}::uuid)`
    )
    .join(',\n') + `\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  status = 'active',\n  updated_at = now();\n\n`

sql += `INSERT INTO public.products (
  name, description, category_id, brand, reference,
  price, retail_price, wholesale_price, cost,
  stock_warehouse, stock_store, status
)\nVALUES\n`

sql +=
  products
    .map(p => {
      const cost = 0
      return `  (${sqlStr(p.name)}, NULL, ${sqlStr(p.categoryId)}::uuid, ${sqlStr('Artesanal')}, ${sqlStr(p.reference)}, ${p.retail.toFixed(2)}, ${p.retail.toFixed(2)}, ${p.wholesale.toFixed(2)}, ${cost.toFixed(2)}, 0, ${p.stock}, 'active')`
    })
    .join(',\n')

sql += `\nON CONFLICT (reference) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  cost = EXCLUDED.cost,
  stock_warehouse = EXCLUDED.stock_warehouse,
  stock_store = EXCLUDED.stock_store,
  status = 'active',
  updated_at = now();

COMMIT;
`

const pricesSql = `-- Actualizar precios inventario 2026 (vacío en Excel = 0)
-- Origen: public/inventario 2026 nuevo sistema - Hoja 1.csv

BEGIN;

${products
  .map(
    p =>
      `UPDATE public.products SET price = ${p.retail.toFixed(2)}, retail_price = ${p.retail.toFixed(2)}, wholesale_price = ${p.wholesale.toFixed(2)}, updated_at = now() WHERE reference = ${sqlStr(p.reference)};`
  )
  .join('\n')}

COMMIT;
`

fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true })
fs.writeFileSync(OUT_SQL, sql, 'utf8')
fs.writeFileSync(OUT_PRICES_SQL, pricesSql, 'utf8')

const zeroRetail = products.filter(p => p.retail === 0).length
const zeroWholesale = products.filter(p => p.wholesale === 0).length

console.log('SQL:', OUT_SQL)
console.log('Precios:', OUT_PRICES_SQL)
console.log('Categorías:', categories.length)
console.log('Productos:', products.length)
console.log('Sin precio cliente final (0):', zeroRetail)
console.log('Sin precio mayorista (0):', zeroWholesale)
if (skipped.length) {
  console.log('Omitidos:', skipped.length)
  console.log(skipped.slice(0, 10))
}
