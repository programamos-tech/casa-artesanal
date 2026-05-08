#!/usr/bin/env node
/**
 * Inserta clientes de prueba con @faker-js/faker (datos plausibles para CO).
 *
 * Uso:
 *   node scripts/seed-fake-clients.mjs           # 150 clientes
 *   node scripts/seed-fake-clients.mjs 500
 *   node scripts/seed-fake-clients.mjs 200 --store=UUID-DE-TIENDA
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (rol service_role del proyecto; en local: Supabase Studio → Settings → API)
 */
import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001'
const BATCH = 80

const TYPES = ['mayorista', 'minorista', 'consumidor_final', 'individual']
const STATUSES = ['active', 'active', 'active', 'active', 'inactive', 'suspended']

const CIUDADES = [
  ['Bogotá', 'Cundinamarca'],
  ['Medellín', 'Antioquia'],
  ['Cali', 'Valle del Cauca'],
  ['Barranquilla', 'Atlántico'],
  ['Cartagena', 'Bolívar'],
  ['Bucaramanga', 'Santander'],
  ['Pereira', 'Risaralda'],
  ['Manizales', 'Caldas'],
  ['Ibagué', 'Tolima'],
  ['Santa Marta', 'Magdalena'],
  ['Cúcuta', 'Norte de Santander'],
  ['Villavicencio', 'Meta'],
  ['Pasto', 'Nariño'],
  ['Neiva', 'Huila'],
  ['Armenia', 'Quindío'],
]

function parseArgs() {
  const argv = process.argv.slice(2)
  let count = 150
  let storeId = process.env.SEED_STORE_ID || DEFAULT_STORE_ID

  for (const a of argv) {
    if (a.startsWith('--store=')) {
      storeId = a.slice('--store='.length).trim()
    } else if (/^\d+$/.test(a)) {
      count = Math.min(5000, Math.max(1, parseInt(a, 10)))
    }
  }

  return { count, storeId }
}

function buildClientRow(i, runId, storeId) {
  const [city, state] = faker.helpers.arrayElement(CIUDADES)
  const first = faker.person.firstName()
  const last = faker.person.lastName()
  const name = `${first} ${last}`
  const slug = faker.helpers.slugify(`${first}-${last}`).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'cliente'
  const email = `${slug}-${runId}-${i}@faker.casa-artesanal.local`
  const document = `F${runId}${String(i).padStart(5, '0')}${faker.string.numeric(6)}`.slice(0, 50)
  const phone = `3${faker.string.numeric(9)}`
  const address = `${faker.location.street()} ${faker.number.int({ min: 1, max: 200 })}`

  return {
    name,
    email,
    phone,
    document,
    address,
    city,
    state,
    postal_code: String(faker.number.int({ min: 110001, max: 999999 })),
    country: 'Colombia',
    type: faker.helpers.arrayElement(TYPES),
    status: faker.helpers.arrayElement(STATUSES),
    is_active: faker.datatype.boolean(0.92),
    credit_limit: faker.number.float({ min: 0, max: 5_000_000, multipleOf: 0.01 }),
    current_debt: 0,
    store_id: storeId,
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error(
      'Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n' +
        'En Supabase local: supabase status → service_role key, o Dashboard → Project Settings → API.'
    )
    process.exit(1)
  }

  const { count, storeId } = parseArgs()
  const runId = `${Date.now().toString(36)}`.slice(-8).toUpperCase()

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Insertando ${count} clientes (tienda store_id=${storeId}, run=${runId})…`)

  let inserted = 0
  let errors = 0

  for (let offset = 0; offset < count; offset += BATCH) {
    const slice = Math.min(BATCH, count - offset)
    const rows = Array.from({ length: slice }, (_, j) => buildClientRow(offset + j + 1, runId, storeId))

    const { data, error } = await supabase.from('clients').insert(rows).select('id')

    if (error) {
      console.error('Lote falló:', error.message)
      errors += slice
      continue
    }

    inserted += data?.length ?? 0
    process.stdout.write(`\r  OK ${inserted}/${count}`)
  }

  console.log(`\nListo: ${inserted} insertados${errors ? `, ${errors} fallidos` : ''}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
