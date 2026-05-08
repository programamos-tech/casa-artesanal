'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
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

export function CartDrawer() {
  const {
    lines,
    drawerOpen,
    closeDrawer,
    subtotal,
    setQty,
    removeLine,
    clearCart
  } = useTiendaCart()

  if (!drawerOpen) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] bg-zinc-900/40 backdrop-blur-[2px] transition-opacity"
        aria-label="Cerrar carrito"
        onClick={closeDrawer}
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl',
          'animate-in slide-in-from-right duration-200'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tienda-cart-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
            <h2 id="tienda-cart-title" className="text-lg font-semibold text-zinc-900">
              Tu carrito
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={closeDrawer}>
            <X className="h-5 w-5 text-zinc-500" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-14 w-14 text-zinc-200" strokeWidth={1} />
              <p className="mt-4 text-sm font-medium text-zinc-600">Aún no agregas productos</p>
              <p className="mt-1 text-xs text-zinc-400">Explora el catálogo y pulsa Agregar</p>
              <Button className="mt-6" variant="outline" onClick={closeDrawer} asChild>
                <Link href="/tienda">Ver productos</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.lineId}
                  className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.name}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-300">
                        <ShoppingBag className="h-8 w-8" strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-zinc-900">{line.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">{line.reference}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                      {formatCOP(line.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:bg-zinc-50"
                          onClick={() => setQty(line.lineId, line.quantity - 1)}
                          aria-label="Menos"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:bg-zinc-50"
                          onClick={() => setQty(line.lineId, line.quantity + 1)}
                          aria-label="Más"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeLine(line.lineId)}
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-zinc-100 bg-white px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Subtotal referencial</span>
              <span className="text-lg font-bold tabular-nums text-zinc-900">{formatCOP(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              El pago y la entrega se coordinan en tienda o con tu asesor ZONA T.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  clearCart()
                  closeDrawer()
                }}
              >
                Vaciar carrito
              </Button>
              <Button variant="outline" className="h-11 w-full" onClick={closeDrawer} asChild>
                <Link href="/tienda">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
