/**
 * Reseñas y calificaciones de demostración para el detalle público del producto.
 * Sustituir por datos reales cuando exista módulo de opiniones.
 */

export type MockProductReview = {
  id: string
  author: string
  rating: number
  dateLabel: string
  text: string
  verified: boolean
}

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const POOL: Omit<MockProductReview, 'id' | 'dateLabel'>[] = [
  {
    author: 'María G.',
    rating: 5,
    text: 'Excelente atención en tienda y el producto llegó en perfecto estado. Lo recomiendo.',
    verified: true
  },
  {
    author: 'Carlos R.',
    rating: 5,
    text: 'Muy buena relación calidad-precio. El asesor me explicó la garantía sin problema.',
    verified: true
  },
  {
    author: 'Andrea M.',
    rating: 4,
    text: 'Cumple con lo esperado. Solo tardó un poco en conseguirse en mi sucursal, pero valió la pena.',
    verified: true
  },
  {
    author: 'Jorge L.',
    rating: 5,
    text: 'Compro seguido en ZONA T; siempre encuentro referencias claras y stock confiable.',
    verified: false
  },
  {
    author: 'Lucía P.',
    rating: 4,
    text: 'Buen embalaje y factura en regla. Volvería a comprar el mismo modelo.',
    verified: true
  },
  {
    author: 'Diego S.',
    rating: 5,
    text: 'Producto original, buen precio frente a otras tiendas de la zona.',
    verified: true
  },
  {
    author: 'Valentina H.',
    rating: 4,
    text: 'Me ayudaron a comparar con otro modelo; quedé contenta con la compra.',
    verified: false
  }
]

export type MockProductSocial = {
  avgRating: number
  reviewCount: number
  /** Conteo por estrella 5→1 (demostración) */
  starBreakdown: [number, number, number, number, number]
  reviews: MockProductReview[]
}

export function getMockProductSocial(productId: string): MockProductSocial {
  const h = hashId(productId)
  const reviewCount = 32 + (h % 214)
  const avgRating = Math.round((4.2 + (h % 8) * 0.1) * 10) / 10

  const pick = (offset: number) => POOL[(h + offset) % POOL.length]
  const nReviews = 4 + (h % 3)
  const reviews: MockProductReview[] = []
  const days = ['Hace 2 días', 'Hace 1 semana', 'Hace 2 semanas', 'Hace 3 semanas', 'Hace 1 mes']
  for (let i = 0; i < nReviews; i++) {
    const base = pick(i * 7)
    reviews.push({
      id: `${productId}-r${i}`,
      author: base.author,
      rating: base.rating,
      text: base.text,
      verified: base.verified,
      dateLabel: days[(h + i) % days.length]
    })
  }

  const c5 = Math.max(0, Math.floor(reviewCount * (0.52 + (h % 5) * 0.02)))
  const c4 = Math.max(0, Math.floor(reviewCount * 0.24))
  const c3 = Math.max(0, Math.floor(reviewCount * 0.12))
  const c2 = Math.max(0, Math.floor(reviewCount * 0.06))
  const starBreakdown: [number, number, number, number, number] = [c5, c4, c3, c2, 0]
  starBreakdown[4] = Math.max(0, reviewCount - c5 - c4 - c3 - c2)

  return { avgRating, reviewCount, starBreakdown, reviews }
}
