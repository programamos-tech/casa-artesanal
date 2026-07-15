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
  { section: string; tag: string; icon: LucideIcon; sectionClass: string; tagClass: string }
> = {
  client: {
    section: 'Clientes',
    tag: 'Cliente',
    icon: Users,
    sectionClass: 'text-blue-600 dark:text-blue-400',
    tagClass: 'text-blue-600 dark:text-blue-400',
  },
  product: {
    section: 'Productos',
    tag: 'Producto',
    icon: Package,
    sectionClass: 'text-emerald-600 dark:text-emerald-400',
    tagClass: 'text-emerald-600 dark:text-emerald-400',
  },
  sale: {
    section: 'Ventas',
    tag: 'Venta',
    icon: Receipt,
    sectionClass: 'text-violet-600 dark:text-violet-400',
    tagClass: 'text-violet-600 dark:text-violet-400',
  },
  credit: {
    section: 'Créditos',
    tag: 'Crédito',
    icon: CreditCard,
    sectionClass: 'text-orange-600 dark:text-orange-400',
    tagClass: 'text-orange-600 dark:text-orange-400',
  },
  supplier_invoice: {
    section: 'Facturas proveedor',
    tag: 'Factura',
    icon: FileText,
    sectionClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    tagClass: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  transfer: {
    section: 'Traslados',
    tag: 'Traslado',
    icon: Truck,
    sectionClass: 'text-teal-600 dark:text-teal-400',
    tagClass: 'text-teal-600 dark:text-teal-400',
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
        'absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40',
        className
      )}
    >
      {searching ? (
        <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Buscando…</p>
      ) : hits.length === 0 && query.trim().length >= minLen ? (
        <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Sin resultados</p>
      ) : (
        grouped.map((group, gi) => (
          <div key={group.kind}>
            {gi > 0 ? <div className="mx-3 my-1 border-t border-zinc-100 dark:border-zinc-800" /> : null}
            <p
              className={cn(
                'px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide',
                group.meta.sectionClass
              )}
            >
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
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800/80',
                          group.meta.sectionClass
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {hit.title}
                        </span>
                        {productParts ? (
                          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {productParts.meta}
                            </span>
                            {productParts.stock ? (
                              <span className="inline-flex shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {productParts.stock}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {hit.subtitle}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
                          group.meta.tagClass
                        )}
                      >
                        {group.meta.tag}
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
