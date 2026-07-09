'use client'

import { cn } from '@/lib/utils'
import type { SaleDiscountType } from '@/lib/sale-discount'
import { CopIntegerInput } from '@/components/sales/cop-integer-input'

const inputClass =
  'h-9 w-32 rounded-md border border-zinc-200 bg-white px-2.5 text-base tabular-nums text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

interface SaleLineDiscountFieldsProps {
  discount: number
  discountType: SaleDiscountType
  onDiscountChange: (value: number) => void
  onDiscountTypeChange: (type: SaleDiscountType) => void
  className?: string
  stacked?: boolean
  hideLabel?: boolean
  hasError?: boolean
  label?: string
}

export function SaleLineDiscountFields({
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  className,
  stacked = false,
  hideLabel = false,
  hasError = false,
  label = 'Descuento',
}: SaleLineDiscountFieldsProps) {
  const handleDiscountChange = (numericValue: number) => {
    if (numericValue < 0) return
    const capped = discountType === 'percentage' ? Math.min(100, numericValue) : numericValue
    onDiscountChange(capped)
  }

  const controls = (
    <div className={cn('flex h-9 items-center gap-2', hideLabel && className)}>
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-600">
        <button
          type="button"
          onClick={() => onDiscountTypeChange('amount')}
          className={cn(
            'px-2.5 py-1.5 text-sm font-medium transition-colors',
            discountType === 'amount'
              ? 'bg-violet-600 text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          )}
        >
          $
        </button>
        <button
          type="button"
          onClick={() => onDiscountTypeChange('percentage')}
          className={cn(
            'border-l border-zinc-200 px-2.5 py-1.5 text-sm font-medium transition-colors dark:border-zinc-600',
            discountType === 'percentage'
              ? 'bg-violet-600 text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          )}
        >
          %
        </button>
      </div>
      <CopIntegerInput
        value={discount}
        onValueChange={handleDiscountChange}
        placeholder={discountType === 'percentage' ? '0 %' : '0'}
        aria-label="Descuento"
        className={cn(
          inputClass,
          hasError && 'border-red-400 focus:border-red-500 focus:ring-red-500/25 dark:border-red-700'
        )}
      />
    </div>
  )

  if (hideLabel) {
    return controls
  }

  if (stacked) {
    return (
      <div className={cn('flex min-w-[10.5rem] flex-col gap-1.5', className)}>
        <span className="text-sm font-medium leading-5 text-zinc-600 dark:text-zinc-400">{label}</span>
        {controls}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {controls}
    </div>
  )
}
