'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function cashMoney(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export const cashKpiRowClass =
  'grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:grid-cols-4'

const kpiToneClass = {
  neutral: 'text-zinc-900 dark:text-white',
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-rose-600 dark:text-rose-400',
  muted: 'text-zinc-500 dark:text-white/55',
} as const

export function CashKpi({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: keyof typeof kpiToneClass
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-zinc-500 dark:text-white/50">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums tracking-tight', kpiToneClass[tone])}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-400 dark:text-white/40">{hint}</p> : null}
    </div>
  )
}

export function CashSectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">{children}</h3>
      {aside ? <span className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">{aside}</span> : null}
    </div>
  )
}

export function CashLine({
  label,
  value,
  muted,
  strong,
}: {
  label: ReactNode
  value: ReactNode
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <span className={cn('text-zinc-600 dark:text-white/65', muted && 'text-zinc-400 dark:text-white/40')}>{label}</span>
      <span
        className={cn(
          'tabular-nums text-zinc-900 dark:text-white',
          strong ? 'font-semibold' : 'font-medium',
          muted && 'text-zinc-500 dark:text-white/50'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function CashLineGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-2 first:border-t-0 first:pt-0 dark:border-white/[0.06]">
      {title ? <p className="pb-0.5 pt-1 text-xs font-medium text-zinc-400 dark:text-white/40">{title}</p> : null}
      {children}
    </div>
  )
}

const noteIconClass = {
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-rose-500 dark:text-rose-400',
  info: 'text-zinc-400 dark:text-white/45',
} as const

export function CashNote({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof noteIconClass
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div
      className={cn(
        'casa-artesanal-preserve-surface flex flex-col gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-white/[0.1] sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 gap-3">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', noteIconClass[tone])} strokeWidth={1.75} />
        <div className="min-w-0 text-[13px]">
          <p className="font-medium text-zinc-900 dark:text-white">{title}</p>
          {children ? <div className="mt-0.5 text-zinc-500 dark:text-white/55">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
