'use client'

import { cn } from '@/lib/utils'
import { CopIntegerInput } from '@/components/sales/cop-integer-input'

interface SaleLinePriceInputProps {
  itemId: string
  unitPrice: number
  listPrice: number
  label: string
  formatCurrency: (amount: number) => string
  onPriceChange: (itemId: string, price: number) => void
  isWholesale?: boolean
  hasError?: boolean
}

export function SaleLinePriceInput({
  itemId,
  unitPrice,
  listPrice,
  label,
  formatCurrency,
  onPriceChange,
  isWholesale,
  hasError,
}: SaleLinePriceInputProps) {
  const isAboveList = unitPrice > listPrice

  return (
    <>
      <CopIntegerInput
        value={unitPrice}
        onValueChange={price => onPriceChange(itemId, price)}
        title="Puedes subir el precio. Para rebajar, usa el campo Descuento."
        aria-label={label}
        className={cn(
          'h-9 w-36 rounded-md border bg-white px-2.5 text-base tabular-nums text-zinc-900 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100',
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 dark:border-red-700'
            : isAboveList
              ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/25 dark:border-emerald-700'
              : isWholesale
                ? 'border-blue-300 focus:border-blue-400 focus:ring-blue-400/25 dark:border-blue-700'
                : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400/25 dark:border-zinc-600'
        )}
      />
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {label}: {formatCurrency(listPrice)}
        {isAboveList ? (
          <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-400">
            (+{formatCurrency(unitPrice - listPrice)})
          </span>
        ) : null}
      </p>
    </>
  )
}
