'use client'

import { DatePicker } from '@/components/ui/date-picker'

const inlinePickerClass =
  'w-[8.5rem] shrink-0 sm:w-[9.25rem] [&_button]:min-h-11 [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none [&_button]:px-2 [&_button]:text-xs sm:[&_button]:text-sm'

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
