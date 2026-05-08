'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search, ShoppingBag } from 'lucide-react'
import { useTiendaCart } from '@/contexts/tienda-cart-context'
import { cn } from '@/lib/utils'

type TiendaHeaderProps = {
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export function TiendaHeader({ showSearch, searchValue = '', onSearchChange }: TiendaHeaderProps) {
  const { itemCount, openDrawer } = useTiendaCart()

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white shadow-sm">
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        <div className="flex items-center gap-3">
          <Link href="/tienda" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
            <Image
              src="/logo2.png"
              alt="ZONA T"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              priority
              unoptimized
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">ZONA T</p>
              <p className="text-xs text-zinc-500">Tienda en línea</p>
            </div>
          </Link>

          {showSearch && (
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Buscar productos, referencia, marca…"
                className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Buscar en catálogo"
              />
            </div>
          )}

          <button
            type="button"
            onClick={openDrawer}
            aria-label={itemCount > 0 ? `Carrito, ${itemCount} artículos` : 'Abrir carrito'}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-2.5 rounded-full border-2 border-emerald-600 bg-white pl-1.5 pr-4',
              'shadow-sm shadow-emerald-900/[0.06]',
              'transition-all duration-200',
              'hover:border-emerald-700 hover:bg-gradient-to-r hover:from-emerald-50/90 hover:to-yellow-50/70 hover:shadow-md hover:shadow-emerald-600/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                'bg-gradient-to-br from-yellow-300 via-yellow-300 to-yellow-400',
                'text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
                'ring-1 ring-yellow-500/35'
              )}
              aria-hidden
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-emerald-900 sm:inline">Carrito</span>
            {itemCount > 0 && (
              <span
                className={cn(
                  'absolute -right-0.5 -top-0.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full',
                  'bg-emerald-600 px-1 text-[11px] font-bold tabular-nums text-white',
                  'ring-[3px] ring-yellow-200 shadow-sm'
                )}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>

        {showSearch && onSearchChange && (
          <div className="relative md:hidden">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar productos…"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Buscar en catálogo"
            />
          </div>
        )}
      </div>
    </header>
  )
}
