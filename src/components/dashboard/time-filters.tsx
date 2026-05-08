'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingUp, BarChart3, ChevronDown } from 'lucide-react'

type TimePeriod = 'week' | 'month' | 'year' | 'all'

interface TimeFiltersProps {
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
}

export function TimeFilters({ selectedPeriod, onPeriodChange }: TimeFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const periods = [
    { key: 'week' as TimePeriod, label: 'Esta Semana', icon: Calendar },
    { key: 'month' as TimePeriod, label: 'Este Mes', icon: TrendingUp },
    { key: 'year' as TimePeriod, label: 'Este Año', icon: BarChart3 },
    { key: 'all' as TimePeriod, label: 'Todo el Tiempo', icon: BarChart3 }
  ]

  const selectedPeriodData = periods.find(p => p.key === selectedPeriod) || periods[1]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center space-x-2 bg-white hover:bg-gray-50"
      >
        <selectedPeriodData.icon className="h-4 w-4" />
        <span>{selectedPeriodData.label}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {periods.map((period) => {
              const Icon = period.icon
              return (
                <button
                  key={period.key}
                  onClick={() => {
                    onPeriodChange(period.key)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                    selectedPeriod === period.key ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{period.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
