'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const POPOVER_W = 280
const POPOVER_H_EST = 360

/** Mismo lenguaje que selects / inputs de la app (zinc, sin gris genérico). */
const triggerClass =
  'flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-300/90 bg-white px-3 py-2.5 text-left text-sm text-zinc-800 shadow-sm transition-colors hover:border-zinc-400/90 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:border-zinc-500'

const triggerFocusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/35 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-zinc-950'

interface DatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date | null) => void
  placeholder?: string
  className?: string
  minDate?: Date
  /** Accesibilidad cuando no hay etiqueta visible junto al control */
  ariaLabel?: string
}

export function DatePicker({
  selectedDate,
  onDateSelect,
  placeholder = 'Seleccionar fecha',
  className = '',
  minDate,
  ariaLabel,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePopoverPosition = useCallback(() => {
    const el = dropdownRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8
    const w = Math.min(POPOVER_W, vw - margin * 2)

    let left = rect.right - w
    if (left < margin) left = margin
    if (left + w > vw - margin) left = vw - w - margin

    let top = rect.bottom + 4
    if (top + POPOVER_H_EST > vh - margin) {
      top = rect.top - POPOVER_H_EST - 4
    }
    if (top < margin) top = margin

    setPopoverPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverPos(null)
      return
    }
    updatePopoverPosition()
    const onScrollOrResize = () => updatePopoverPosition()
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [isOpen, updatePopoverPosition])

  useEffect(() => {
    if (!isOpen) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (dropdownRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [isOpen])

  const generateDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonth.getDate() - i),
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      })
    }

    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      })
    }

    return days
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return
    onDateSelect(date)
    setIsOpen(false)
  }

  const handleClearDate = () => {
    onDateSelect(null)
    setIsOpen(false)
  }

  const handleOpenCalendar = () => {
    setIsOpen(o => {
      const opening = !o
      if (opening && selectedDate) {
        setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
      }
      return opening
    })
  }

  const sameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const isToday = (date: Date) => sameCalendarDay(date, new Date())

  const isDateDisabled = (date: Date) => {
    if (!minDate) return false
    return date < minDate
  }

  const isSelected = (date: Date) =>
    Boolean(selectedDate && sameCalendarDay(date, selectedDate))

  const formatSelectedDate = () => {
    if (!selectedDate) return placeholder
    return selectedDate.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const calendarPanel = isOpen && popoverPos && mounted && typeof document !== 'undefined' && (
    <div
      ref={popoverRef}
      className="fixed z-[200] w-[min(280px,calc(100vw-16px))] max-h-[min(70dvh,420px)] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      style={{ top: popoverPos.top, left: popoverPos.left }}
      role="dialog"
      aria-label="Calendario"
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
          }
          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <h3 className="px-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <button
          type="button"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
          }
          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="py-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid max-w-full grid-cols-7 gap-1">
        {generateDays().map((dayData, index) => {
          const { day, isCurrentMonth, date } = dayData
          const isCurrentDay = isToday(date)
          const isSelectedDay = isSelected(date)
          const isDisabled = isDateDisabled(date)

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              aria-selected={isSelectedDay}
              className={cn(
                'h-8 w-8 touch-manipulation rounded-md text-xs font-normal transition-colors',
                isDisabled &&
                  'cursor-not-allowed bg-zinc-100 text-zinc-300 dark:bg-zinc-950 dark:text-zinc-700',
                !isDisabled &&
                  isSelectedDay &&
                  'z-[1] bg-emerald-600 font-semibold text-white shadow-[0_0_0_1px_rgba(16,185,129,0.45)] hover:bg-emerald-700 focus-visible:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:shadow-[0_0_0_1px_rgba(52,211,153,0.5)] dark:hover:bg-emerald-400',
                !isDisabled &&
                  !isSelectedDay &&
                  isCurrentMonth &&
                  'text-zinc-900 hover:bg-emerald-100/80 dark:text-zinc-100 dark:hover:bg-emerald-900/35',
                !isDisabled && !isSelectedDay && !isCurrentMonth && 'text-zinc-400 dark:text-zinc-600',
                !isDisabled &&
                  !isSelectedDay &&
                  isCurrentDay &&
                  'font-semibold text-emerald-700 dark:text-emerald-400'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const today = new Date()
              if (!isDateDisabled(today)) {
                handleDateClick(today)
              }
            }}
            disabled={isDateDisabled(new Date())}
            className={cn(
              'flex-1 touch-manipulation rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              isDateDisabled(new Date())
                ? 'cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'
                : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/40'
            )}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={handleClearDate}
            className="flex-1 touch-manipulation rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpenCalendar}
        className={cn(triggerClass, triggerFocusClass, isOpen && 'border-zinc-500 ring-2 ring-zinc-400/30 dark:border-zinc-500 dark:ring-zinc-500/25')}
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <span
            className={cn(
              'truncate',
              selectedDate ? 'font-medium text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            {formatSelectedDate()}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {selectedDate && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation()
                handleClearDate()
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClearDate()
                }
              }}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500', isOpen && 'rotate-180')}
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
      </button>

      {calendarPanel && createPortal(calendarPanel, document.body)}
    </div>
  )
}
