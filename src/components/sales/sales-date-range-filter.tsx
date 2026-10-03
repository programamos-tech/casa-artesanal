'use client'

import { DatePicker } from '@/components/ui/date-picker'

const inlinePickerClass =
  'w-[7.25rem] shrink-0 sm:w-[8rem] [&_button]:h-8 [&_button]:min-h-8 [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:text-[13px] [&_button]:shadow-none'

interface SalesDateRangeFilterProps {
  start: Date | null
  end: Date | null
  onStartChange: (date: Date | null) => void
  onEndChange: (date: Date | null) => void
}

export function SalesDateRangeFilter({
  start,
  end,
  onStartChange,
  onEndChange,
}: SalesDateRangeFilterProps) {
  return (
    <div className="flex shrink-0 items-stretch">
      <DatePicker
        selectedDate={start}
        onDateSelect={onStartChange}
        placeholder="Desde"
        ariaLabel="Fecha desde"
        className={inlinePickerClass}
      />
      <span
        className="flex w-6 shrink-0 items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500"
        aria-hidden
      >
        —
      </span>
      <DatePicker
        selectedDate={end}
        onDateSelect={onEndChange}
        placeholder="Hasta"
        ariaLabel="Fecha hasta"
        minDate={start ?? undefined}
        className={inlinePickerClass}
      />
    </div>
  )
}
