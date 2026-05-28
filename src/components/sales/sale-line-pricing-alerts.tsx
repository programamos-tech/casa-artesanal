'use client'

import { AlertTriangle } from 'lucide-react'
import type { SaleLinePricingAlert } from '@/lib/sale-line-pricing-validation'

interface SaleLinePricingAlertsProps {
  alerts: SaleLinePricingAlert[]
  className?: string
}

export function SaleLinePricingAlerts({ alerts, className }: SaleLinePricingAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className={className}>
      {alerts.map(alert => (
        <div
          key={alert.id}
          role="alert"
          className="flex items-start gap-1.5 rounded-md border border-red-200/90 bg-red-50/95 px-2 py-1.5 text-[11px] font-medium leading-snug text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  )
}
