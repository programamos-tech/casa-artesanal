'use client'

import {
  Truck,
  CreditCard,
  FileText,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { GlobalSearchHit, GlobalSearchKind } from '@/lib/global-search-service'
import { minSearchLength } from '@/lib/product-search'
import { cn } from '@/lib/utils'

const KIND_META: Record<
  GlobalSearchKind,
  { section: string; tag: string; icon: LucideIcon }
> = {
  client: {
    section: 'Clientes',
    tag: 'Cliente',
    icon: Users,
  },
  product: {
    section: 'Productos',
    tag: 'Producto',
    icon: Package,
  },
  sale: {
    section: 'Ventas',
    tag: 'Venta',
    icon: Receipt,
  },
  credit: {
    section: 'Créditos',
    tag: 'Crédito',
    icon: CreditCard,
  },
  supplier_invoice: {
    section: 'Facturas proveedor',
    tag: 'Factura',
    icon: FileText,
  },
  transfer: {
    section: 'Traslados',
    tag: 'Traslado',
    icon: Truck,
  },
}

const SECTION_ORDER: GlobalSearchKind[] = [
  'product',
  'client',
  'sale',
  'credit',
  'supplier_invoice',
  'transfer',
]

function splitProductSubtitle(subtitle: string): { meta: string; stock: string | null } {
  const stockIdx = subtitle.search(/ · Stock(?:\s| local)/i)
  if (stockIdx === -1) return { meta: subtitle, stock: null }
  return {
    meta: subtitle.slice(0, stockIdx),
    stock: subtitle.slice(stockIdx + 3),
  }
}

type Props = {
  hits: GlobalSearchHit[]
  searching: boolean
  query: string
  onSelect: (hit: GlobalSearchHit) => void
  className?: string
}

export function GlobalSearchDropdown({ hits, searching, query, onSelect, className }: Props) {
  const grouped = SECTION_ORDER.map(kind => ({
    kind,
    meta: KIND_META[kind],
    items: hits.filter(h => h.kind === kind),
  })).filter(g => g.items.length > 0)

  const minLen = minSearchLength(query)

  return (
    <div
      className={cn(
        'casa-artesanal-preserve-surface fixed inset-x-3 top-[calc(3.5rem+6px)] z-50 md:absolute md:inset-x-auto md:left-0 md:top-[calc(100%+6px)] md:w-[min(28rem,calc(100vw-2rem))] max-h-[min(26rem,70vh)] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-white/[0.08] dark:bg-[#111113] dark:shadow-black/50',
        className
      )}
    >
      {searching ? (
        <p className="px-3.5 py-3 text-[13px] text-zinc-500 dark:text-white/50">Buscando…</p>
      ) : hits.length === 0 && query.trim().length >= minLen ? (
        <p className="px-3.5 py-3 text-[13px] text-zinc-500 dark:text-white/50">Sin resultados</p>
      ) : (
        grouped.map((group, gi) => (
          <div key={group.kind}>
            {gi > 0 ? <div className="my-1 border-t border-zinc-100 dark:border-white/[0.06]" /> : null}
            <p className="px-3.5 pb-1 pt-2 text-[11px] font-medium text-zinc-400 dark:text-white/40">
              {group.meta.section}
            </p>
            <ul>
              {group.items.map(hit => {
                const Icon = group.meta.icon
                const productParts =
                  hit.kind === 'product' ? splitProductSubtitle(hit.subtitle) : null
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(hit)}
                      className="casa-artesanal-preserve-surface flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-zinc-400 dark:text-white/40"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-white">
                          {hit.title}
                        </span>
                        {productParts ? (
                          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-xs text-zinc-500 dark:text-white/50">
                              {productParts.meta}
                            </span>
                            {productParts.stock ? (
                              <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-700 dark:text-white/75">
                                {productParts.stock}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="block truncate text-xs text-zinc-500 dark:text-white/50">
                            {hit.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
