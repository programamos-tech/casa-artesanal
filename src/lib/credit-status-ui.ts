import type { Credit } from '@/types'

/** Fecha de vencimiento en calendario local (evita correr un día por UTC en `YYYY-MM-DD`). */
export function parseCreditDueDateLocal(iso: string | undefined | null): Date | null {
  if (!iso || typeof iso !== 'string') return null
  const datePart = iso.trim().slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const d = Number(m[3])
    if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null
    const dt = new Date(y, mo, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
    return dt
  }
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return null
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

export function isCreditPastDue(credit: Credit): boolean {
  const due = parseCreditDueDateLocal(credit.dueDate)
  if (!due) return false
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return due < todayStart
}

/**
 * Estado para UI y filtros: vencido si hay saldo y la fecha pasó (o viene `overdue` en BD).
 */
export function getEffectiveCreditStatus(credit: Credit): Credit['status'] {
  if (isCreditCancelled(credit) || credit.status === 'cancelled') return 'cancelled'
  if (credit.pendingAmount <= 0) return 'completed'
  if (credit.status === 'completed') return 'completed'
  if (credit.status === 'overdue' || isCreditPastDue(credit)) return 'overdue'
  if (credit.paidAmount > 0 || credit.status === 'partial') return 'partial'
  return 'pending'
}

/** Fila agrupada por cliente en `/payments`: prioridad overdue > partial > pending > completed. */
export function aggregateCreditsDisplayStatus(credits: Credit[]): Credit['status'] {
  const open = credits.filter(
    c => !isCreditCancelled(c) && c.status !== 'cancelled' && c.pendingAmount > 0
  )
  if (open.length === 0) return 'completed'
  if (open.some(c => getEffectiveCreditStatus(c) === 'overdue')) return 'overdue'
  if (open.some(c => getEffectiveCreditStatus(c) === 'partial')) return 'partial'
  return 'pending'
}

export function getConsolidatedCreditDisplayStatus(credit: Credit): Credit['status'] {
  if (credit.credits && credit.credits.length > 0) {
    return aggregateCreditsDisplayStatus(credit.credits)
  }
  return getEffectiveCreditStatus(credit)
}

export function isCreditCancelled(credit: Credit | undefined | null): boolean {
  if (!credit) return false
  return credit.totalAmount === 0 && credit.pendingAmount === 0
}

const iconSize = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
} as const

/**
 * Chip con borde (tablas, listas, Badge outline).
 */
export function creditStatusBadgeClass(status: string, credit?: Credit | null): string {
  if (isCreditCancelled(credit)) {
    return 'border-zinc-300/80 bg-zinc-100/80 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/[0.11] text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-950/50 dark:text-emerald-300'
    case 'partial':
      return 'border-sky-500/40 bg-sky-500/[0.11] text-sky-950 dark:border-sky-400/45 dark:bg-sky-950/45 dark:text-sky-200'
    case 'pending':
      return 'border-amber-500/45 bg-amber-500/[0.14] text-amber-950 dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-200'
    case 'overdue':
      return 'border-rose-500/45 bg-rose-500/[0.12] text-rose-950 dark:border-rose-400/50 dark:bg-rose-950/45 dark:text-rose-200'
    case 'cancelled':
      return 'border-zinc-300/80 bg-zinc-100/80 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
    default:
      return 'border-zinc-200/90 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300'
  }
}

/**
 * Badge relleno (modales), con hover suave.
 */
export function creditStatusSolidBadgeClass(status: string, credit?: Credit | null): string {
  if (isCreditCancelled(credit)) {
    return 'border-transparent bg-zinc-200/90 text-zinc-800 shadow-none dark:bg-zinc-700/90 dark:text-zinc-100 hover:bg-zinc-300/90 dark:hover:bg-zinc-600'
  }
  switch (status) {
    case 'completed':
      return 'border-transparent bg-emerald-500/18 text-emerald-950 shadow-none dark:bg-emerald-500/22 dark:text-emerald-100 hover:bg-emerald-500/26 dark:hover:bg-emerald-500/30'
    case 'partial':
      return 'border-transparent bg-sky-500/18 text-sky-950 shadow-none dark:bg-sky-500/22 dark:text-sky-100 hover:bg-sky-500/26 dark:hover:bg-sky-500/30'
    case 'pending':
      return 'border-transparent bg-amber-500/20 text-amber-950 shadow-none dark:bg-amber-500/22 dark:text-amber-100 hover:bg-amber-500/28 dark:hover:bg-amber-500/32'
    case 'overdue':
      return 'border-transparent bg-rose-500/18 text-rose-950 shadow-none dark:bg-rose-500/22 dark:text-rose-100 hover:bg-rose-500/28 dark:hover:bg-rose-500/32'
    case 'cancelled':
      return 'border-transparent bg-zinc-200/90 text-zinc-800 shadow-none dark:bg-zinc-700/90 dark:text-zinc-100 hover:bg-zinc-300/90 dark:hover:bg-zinc-600'
    default:
      return 'border-transparent bg-zinc-200/80 text-zinc-900 shadow-none dark:bg-zinc-700/80 dark:text-zinc-100'
  }
}

export function creditStatusIconClass(
  status: string,
  credit?: Credit | null,
  size: keyof typeof iconSize = 'sm'
): string {
  const dim = iconSize[size]
  const base = `${dim} shrink-0`
  if (isCreditCancelled(credit)) {
    return `${base} text-zinc-500 dark:text-zinc-400`
  }
  switch (status) {
    case 'completed':
      return `${base} text-emerald-600 dark:text-emerald-400`
    case 'partial':
      return `${base} text-sky-600 dark:text-sky-400`
    case 'pending':
      return `${base} text-amber-600 dark:text-amber-500`
    case 'overdue':
      return `${base} text-rose-600 dark:text-rose-400`
    case 'cancelled':
      return `${base} text-zinc-500 dark:text-zinc-400`
    default:
      return `${base} text-zinc-500 dark:text-zinc-400`
  }
}

export function creditStatusLabel(
  status: string,
  credit?: Credit | null,
  options?: { completedLabel?: string }
): string {
  if (isCreditCancelled(credit)) return 'Anulado'
  const completed = options?.completedLabel ?? 'Completado'
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'partial':
      return 'Parcial'
    case 'completed':
      return completed
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Anulado'
    default:
      return status
  }
}
