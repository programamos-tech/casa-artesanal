'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import type { PublicCatalogProduct } from '@/lib/public-catalog'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { TiendaHeader } from '@/components/tienda/tienda-header'
import { TiendaFooter } from '@/components/tienda/tienda-footer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

function ProductCard({ product }: { product: PublicCatalogProduct }) {
  const { addLine } = useTiendaCart()
  const out = product.status === 'out_of_stock' || !product.inStock
  const hasImg = Boolean(product.imageUrl)

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:rounded-2xl',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-500/5'
      )}
    >
      <Link
        href={`/tienda/p/${product.id}`}
        className="relative block w-full overflow-hidden bg-zinc-50 aspect-[3/2] sm:aspect-[4/3]"
      >
        {hasImg ? (
          <Image
            src={product.imageUrl!}
            alt={product.name}
            fill
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02] sm:p-4"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 16vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-300">
            <Package className="h-10 w-10 sm:h-16 sm:w-16" strokeWidth={1} aria-hidden />
          </div>
        )}
        {out && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
            Agotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:gap-2 sm:p-4">
        {product.categoryName && (
          <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-[10px] sm:tracking-wider">
            {product.categoryName}
          </p>
        )}
        <Link href={`/tienda/p/${product.id}`}>
          <h2 className="line-clamp-2 text-xs font-semibold leading-tight text-zinc-900 group-hover:text-emerald-800 sm:min-h-[2.5rem] sm:text-sm sm:leading-snug">
            {product.name}
          </h2>
        </Link>
        {product.brand?.trim() && (
          <p className="truncate text-[10px] text-zinc-500 sm:text-xs">{product.brand}</p>
        )}
        <p className="hidden font-mono text-[11px] text-zinc-400 sm:block">Ref. {product.reference}</p>
        {product.description?.trim() && (
          <p className="hidden line-clamp-2 text-xs leading-relaxed text-zinc-600 sm:block">{product.description}</p>
        )}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-zinc-100 pt-2 sm:gap-2 sm:pt-3">
          <p className="text-sm font-bold tabular-nums text-zinc-900 sm:text-lg">{formatCOP(product.price)}</p>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              type="button"
              size="sm"
              disabled={out}
              className="h-8 flex-1 rounded-full bg-emerald-600 px-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 sm:h-9 sm:text-sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (out) return
                addLine({
                  productId: product.id,
                  name: product.name,
                  reference: product.reference,
                  price: product.price,
                  imageUrl: product.imageUrl,
                  quantity: 1
                })
              }}
            >
              Agregar
            </Button>
            <Link
              href={`/tienda/p/${product.id}`}
              aria-label="Ver detalle"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-none transition-colors hover:bg-zinc-50 sm:h-9 sm:w-auto sm:px-3'
              )}
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export function CatalogStorefront({ products }: { products: PublicCatalogProduct[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        p.reference.toLowerCase().includes(t) ||
        p.brand.toLowerCase().includes(t) ||
        (p.categoryName?.toLowerCase().includes(t) ?? false) ||
        p.description.toLowerCase().includes(t)
    )
  }, [products, q])

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <TiendaHeader showSearch searchValue={q} onSearchChange={setQ} />

      <main className="w-full flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-14">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-20 text-center">
            <Package className="mx-auto h-14 w-14 text-zinc-300" strokeWidth={1} />
            <p className="mt-4 text-sm font-medium text-zinc-700">Catálogo no disponible por ahora</p>
            <p className="mt-1 text-xs text-zinc-500">Vuelve más tarde o visita nuestra tienda física.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl lg:text-3xl">Catálogo</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  <span className="font-semibold text-zinc-800">{filtered.length}</span>
                  {filtered.length === 1 ? ' producto' : ' productos'}
                  {q.trim() ? ' encontrados' : ' disponibles'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {filtered.length === 0 && q.trim() && (
              <p className="mt-16 text-center text-sm text-zinc-500">
                No hay resultados para «{q.trim()}».
              </p>
            )}
          </>
        )}
      </main>

      <TiendaFooter />
    </div>
  )
}
