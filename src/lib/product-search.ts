/** Utilidades de búsqueda de productos (POS / inventario). */

const SEARCH_STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'y',
  'o',
  'en',
  'para',
  'con',
  'por',
  'a',
  'al',
  'the',
])

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&')
}

/** Código de referencia típico: "315", "001", "A12". */
export function isReferenceLikeQuery(query: string): boolean {
  const q = query.trim()
  if (!q) return false
  return /^\d{1,6}$/.test(q) || /^[A-Za-z]{1,4}\d{1,6}$/i.test(q)
}

/** Longitud mínima para disparar búsqueda en servidor. */
export function minSearchLength(query: string): number {
  return isReferenceLikeQuery(query) ? 1 : 2
}

/** Variantes de referencia numérica (315, 0315, etc.) para match exacto rápido. */
export function referenceExactVariants(query: string): string[] {
  const q = query.trim()
  if (!/^\d{1,6}$/.test(q)) return [q]
  const variants = new Set<string>([q, String(Number(q))])
  for (let width = q.length; width <= 4; width++) {
    variants.add(q.padStart(width, '0'))
  }
  return [...variants]
}

/** Parte la consulta en tokens útiles (ignora conectores cortos). */
export function tokenizeProductSearch(query: string): string[] {
  const raw = query
    .trim()
    .split(/[\s,.;:/\\|_\-+]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const tokens = raw.filter((t) => {
    const lower = t.toLowerCase()
    if (SEARCH_STOPWORDS.has(lower)) return false
    if (/^\d+$/.test(t)) return true
    return t.length >= 2
  })

  if (tokens.length === 0 && query.trim()) {
    return [query.trim()]
  }

  // Evitar filtros PostgREST demasiado pesados
  return tokens.slice(0, 6)
}

type SearchableProduct = {
  name?: string | null
  reference?: string | null
  brand?: string | null
}

export function productMatchesSearch(product: SearchableProduct, query: string): boolean {
  const tokens = tokenizeProductSearch(query)
  if (tokens.length === 0) return true

  const haystack = normalizeSearchText(
    `${product.name || ''} ${product.reference || ''} ${product.brand || ''}`
  )

  return tokens.every((token) => haystack.includes(normalizeSearchText(token)))
}

export function scoreProductSearch(product: SearchableProduct, query: string): number {
  const q = normalizeSearchText(query)
  const tokens = tokenizeProductSearch(query)
  const name = normalizeSearchText(product.name || '')
  const reference = normalizeSearchText(product.reference || '')
  const brand = normalizeSearchText(product.brand || '')

  let score = 0

  if (reference === q) score += 1000
  else if (reference.startsWith(q)) score += 520
  else if (reference.includes(q)) score += 260

  if (name.startsWith(q)) score += 320
  else if (name.includes(q)) score += 140

  if (brand.startsWith(q)) score += 80
  else if (brand.includes(q)) score += 40

  for (const token of tokens) {
    const t = normalizeSearchText(token)
    if (!t) continue
    if (reference === t) score += 90
    else if (reference.startsWith(t)) score += 45
    else if (reference.includes(t)) score += 25

    if (name.startsWith(t)) score += 35
    else if (name.includes(t)) score += 18

    if (brand.includes(t)) score += 8
  }

  // Preferir nombres más cortos cuando el score es similar (más específicos)
  score -= Math.min(name.length, 120) * 0.05

  return score
}

export function compareProductsBySearchRelevance(
  a: SearchableProduct,
  b: SearchableProduct,
  query: string
): number {
  return scoreProductSearch(b, query) - scoreProductSearch(a, query)
}
