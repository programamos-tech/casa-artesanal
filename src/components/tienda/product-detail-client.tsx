'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Store,
  Warehouse
} from 'lucide-react'
import type { PublicProductDetail } from '@/lib/public-catalog'
import { getMockProductSocial } from '@/lib/tienda-product-mocks'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { TiendaHeader } from '@/components/tienda/tienda-header'
import { TiendaFooter } from '@/components/tienda/tienda-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

function formatUnits(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

function RatingStars({ rating, className }: { rating: number; className?: string }) {
  const r = Math.min(5, Math.max(0, rating))
  return (
    <div className={cn('flex gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= r + 1e-9
        return (
          <Star
            key={i}
            className={cn(
              'h-5 w-5 sm:h-6 sm:w-6',
              filled ? 'fill-amber-400 text-amber-400' : 'fill-zinc-100 text-zinc-200'
            )}
            strokeWidth={filled ? 0 : 1.25}
          />
        )
      })}
    </div>
  )
}

export function ProductDetailClient({ product }: { product: PublicProductDetail }) {
  const { addLine } = useTiendaCart()
  const [qty, setQty] = useState(1)
  const out = product.status === 'out_of_stock' || !product.inStock
  const hasImg = Boolean(product.imageUrl)

  const social = useMemo(() => getMockProductSocial(product.id), [product.id])

  const mainHasUnits = product.stockWarehouse + product.stockStoreFloor > 0
  const locationCount = (mainHasUnits ? 1 : 0) + product.microStores.length

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <TiendaHeader />

      <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8 xl:px-10 2xl:px-14">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/tienda" className="hover:text-emerald-700">
            Catálogo
          </Link>
          <span aria-hidden>/</span>
          {product.categoryName && (
            <>
              <span className="text-zinc-400">{product.categoryName}</span>
              <span aria-hidden>/</span>
            </>
          )}
          <span className="line-clamp-1 font-medium text-zinc-800">{product.name}</span>
        </nav>

        <Link
          href="/tienda"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div
            className={cn(
              'relative aspect-square w-full overflow-hidden rounded-3xl border border-zinc-100 bg-zinc-50',
              'shadow-inner'
            )}
          >
            {hasImg ? (
              <Image
                src={product.imageUrl!}
                alt={product.name}
                fill
                className="object-contain p-6 sm:p-10"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-200">
                <Package className="h-32 w-32" strokeWidth={1} />
              </div>
            )}
            {out && (
              <span className="absolute left-4 top-4 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                Agotado
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {product.categoryName && (
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{product.categoryName}</p>
            )}
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{product.name}</h1>
            {product.brand?.trim() && <p className="mt-2 text-base text-zinc-500">{product.brand}</p>}
            <p className="mt-3 font-mono text-sm text-zinc-400">Referencia · {product.reference}</p>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <RatingStars rating={social.avgRating} className="shrink-0" />
                <div>
                  <p className="text-lg font-bold tabular-nums text-zinc-900">{social.avgRating.toFixed(1)}</p>
                  <p className="text-xs text-zinc-500">{formatUnits(social.reviewCount)} opiniones</p>
                </div>
              </div>
              {!out && locationCount > 0 && (
                <Badge className="w-fit border-0 bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-600">
                  En {locationCount} punto{locationCount === 1 ? '' : 's'} de la red
                </Badge>
              )}
            </div>

            <p className="mt-8 text-4xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-5xl">
              {formatCOP(product.price)}
            </p>
            <p className="mt-2 text-xs text-zinc-500">Precio referencial en COP</p>

            {!out && (
              <p className="mt-3 text-sm text-zinc-600">
                <span className="font-semibold text-zinc-800">{formatUnits(product.totalUnits)}</span> unidades
                disponibles en inventario consolidado (referencial).
              </p>
            )}

            {product.description?.trim() && (
              <div className="mt-8 border-t border-zinc-100 pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Descripción</h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-10 flex flex-col gap-4 border-t border-zinc-100 pt-8 sm:flex-row sm:items-center">
              <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-zinc-600 hover:bg-white"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Menos"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="min-w-[3rem] text-center text-lg font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-zinc-600 hover:bg-white"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="Más"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <Button
                type="button"
                disabled={out}
                className="h-12 flex-1 rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 sm:min-w-[240px]"
                onClick={() => {
                  if (out) return
                  addLine({
                    productId: product.id,
                    name: product.name,
                    reference: product.reference,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: qty
                  })
                  setQty(1)
                }}
              >
                <ShoppingBag className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Agregar al carrito
              </Button>
            </div>

            <p className="mt-6 rounded-xl bg-emerald-50/80 p-4 text-sm leading-relaxed text-emerald-900">
              Compra segura: revisa disponibilidad y formas de pago con nuestro equipo en tienda o por canales
              oficiales ZONA T.
            </p>
          </div>
        </div>

        <div className="mt-14 space-y-10">
          <Card className="border-zinc-200 bg-white shadow-sm dark:border-zinc-200 dark:bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900 dark:text-zinc-900">
                <Warehouse className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                Disponibilidad por tienda
              </CardTitle>
              <p className="text-sm font-normal text-zinc-500 dark:text-zinc-500">
                Stock referencial en tiempo casi real. La reserva definitiva se confirma en punto de venta.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-hidden rounded-xl border border-zinc-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="hidden px-4 py-3 sm:table-cell">Detalle</th>
                      <th className="px-4 py-3 text-right">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr className="bg-white">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <Store className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.5} />
                          <div>
                            <p className="font-semibold text-zinc-900">{product.mainStoreName}</p>
                            <p className="text-xs text-zinc-500">Sede principal</p>
                            {product.mainStoreCity && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                                <MapPin className="h-3 w-3" aria-hidden />
                                {product.mainStoreCity}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 text-zinc-600 sm:table-cell">
                        <p>Bodega · {formatUnits(product.stockWarehouse)}</p>
                        <p className="mt-1">Mostrador · {formatUnits(product.stockStoreFloor)}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono text-base font-bold tabular-nums text-zinc-900">
                          {formatUnits(product.stockWarehouse + product.stockStoreFloor)}
                        </span>
                        <p className="mt-1 text-xs text-zinc-400 sm:hidden">
                          Bod. {formatUnits(product.stockWarehouse)} · Mostr.{' '}
                          {formatUnits(product.stockStoreFloor)}
                        </p>
                      </td>
                    </tr>
                    {product.microStores.map((m) => (
                      <tr key={m.storeId} className="bg-white">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
                            <div>
                              <p className="font-semibold text-zinc-900">{m.name}</p>
                              <p className="text-xs text-zinc-500">Microtienda</p>
                              {m.city && (
                                <p className="mt-1 text-xs text-zinc-400">{m.city}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 text-zinc-600 sm:table-cell">
                          Stock en tienda
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-mono text-base font-bold tabular-nums text-zinc-900">
                            {formatUnits(m.quantity)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {product.totalUnits < 1 && (
                <p className="mt-4 text-center text-sm text-zinc-500">
                  Sin unidades reportadas en red. Consulta próximas entradas en tienda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white shadow-sm dark:border-zinc-200 dark:bg-white">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900 dark:text-zinc-900">
                <MessageCircle className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                Opiniones de clientes
              </CardTitle>
              <p className="text-sm font-normal text-zinc-500 dark:text-zinc-500">
                Calificaciones y comentarios de demostración para ilustrar la ficha del producto.
              </p>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center rounded-2xl border border-zinc-100 bg-zinc-50/80 px-8 py-6 sm:min-w-[200px]">
                  <p className="text-5xl font-bold tabular-nums text-zinc-900">{social.avgRating.toFixed(1)}</p>
                  <RatingStars rating={social.avgRating} className="mt-2 justify-center" />
                  <p className="mt-2 text-center text-xs text-zinc-500">
                    {formatUnits(social.reviewCount)} valoraciones
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = social.starBreakdown[idx]
                    const pct = social.reviewCount > 0 ? Math.round((count / social.reviewCount) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-3 tabular-nums text-zinc-500">{star}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-amber-400/90"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right tabular-nums text-zinc-400">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <ul className="space-y-4">
                {social.reviews.map((rev) => (
                  <li
                    key={rev.id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={rev.rating} className="scale-90" />
                      {rev.verified && (
                        <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                          Compra verificada
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-zinc-400">{rev.dateLabel}</span>
                    </div>
                    <p className="mt-2 font-medium text-zinc-900">{rev.author}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{rev.text}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <TiendaFooter />
    </div>
  )
}
