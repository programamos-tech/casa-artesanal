'use client'

import type { ReactNode, Ref } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ReportTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneText: Record<ReportTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400',
  neutral: 'text-zinc-900 dark:text-zinc-50',
}

const toneDot: Record<ReportTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-zinc-400 dark:bg-zinc-500',
}

export function StatusDot({ tone, className }: { tone: ReportTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('casa-artesanal-preserve-surface inline-block h-2 w-2 shrink-0 rounded-full', toneDot[tone], className)}
    />
  )
}

type ReportStatProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: ReportTone
  onClick?: () => void
  buttonRef?: Ref<HTMLButtonElement>
  ariaExpanded?: boolean
  className?: string
}

export function ReportStat({ label, value, hint, tone = 'neutral', onClick, buttonRef, ariaExpanded, className }: ReportStatProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaExpanded !== undefined ? 'dialog' : undefined}
      className={cn(
        'casa-artesanal-preserve-surface flex min-w-0 flex-col items-start rounded-lg px-3 py-3 text-left transition-colors',
        'hover:bg-zinc-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:hover:bg-zinc-800/50',
        className
      )}
    >
      <span className={cn('text-xl font-semibold leading-7 tabular-nums md:text-2xl md:leading-8', toneText[tone])}>
        {value}
      </span>
      <span className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {hint ? <span className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">{hint}</span> : null}
    </button>
  )
}

export function ReportSectionTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-end gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold leading-6 text-zinc-900 dark:text-zinc-50">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

const calloutIcon: Record<Exclude<ReportTone, 'neutral'>, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
}

export function ReportCallout({
  tone,
  title,
  children,
  onClick,
}: {
  tone: Exclude<ReportTone, 'neutral'>
  title: string
  children?: ReactNode
  onClick?: () => void
}) {
  const Icon = calloutIcon[tone]
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'casa-artesanal-preserve-surface flex w-full gap-2.5 rounded-lg px-1 py-1.5 text-left',
        onClick && 'transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40'
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', toneText[tone])} strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
        {children ? <p className="mt-0.5 text-sm leading-snug text-zinc-600 dark:text-zinc-300">{children}</p> : null}
      </div>
    </Wrapper>
  )
}

type Align = 'left' | 'right' | 'center'

const alignClass: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function ReportTable({
  headers,
  rows,
  align = [],
  rowTone = [],
  onRowClick,
}: {
  headers: ReactNode[]
  rows: ReactNode[][]
  align?: Align[]
  rowTone?: (ReportTone | undefined)[]
  onRowClick?: (index: number) => void
}) {
  return (
    <div className="casa-artesanal-card-surface overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200',
                  alignClass[align[i] ?? 'left']
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr
              key={r}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                'border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80',
                onRowClick && 'cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              )}
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    'px-4 py-2.5 tabular-nums text-zinc-800 dark:text-zinc-200',
                    alignClass[align[c] ?? 'left']
                  )}
                >
                  {c === 0 && rowTone[r] ? (
                    <span className="inline-flex items-center gap-2">
                      <StatusDot tone={rowTone[r] as ReportTone} />
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
