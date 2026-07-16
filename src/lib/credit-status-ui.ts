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
 * Chip con fondo de color (tablas, listas).
 * Anulado=rojo, Pendiente=ámbar, Completado=verde, Parcial=azul, Vencido=rosa.
 */
export function creditStatusBadgeClass(status: string, credit?: Credit | null): string {
  if (isCreditCancelled(credit) || status === 'cancelled') {
    return 'border-transparent bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
  }
  switch (status) {
    case 'completed':
      return 'border-transparent bg-green-100 text-green-800 dark:bg-green-950/45 dark:text-green-300'
    case 'partial':
      return 'border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950/45 dark:text-sky-300'
    case 'pending':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
    case 'overdue':
      return 'border-transparent bg-rose-100 text-rose-900 dark:bg-rose-950/45 dark:text-rose-300'
    default:
      return 'border-transparent bg-zinc-100 text-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400'
  }
}

/**
 * Badge relleno (modales), con hover suave.
 */
export function creditStatusSolidBadgeClass(status: string, credit?: Credit | null): string {
  if (isCreditCancelled(credit) || status === 'cancelled') {
    return 'border-transparent bg-red-600 text-white shadow-none hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
  }
  switch (status) {
    case 'completed':
      return 'border-transparent bg-green-600 text-white shadow-none hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
    case 'partial':
      return 'border-transparent bg-sky-600 text-white shadow-none hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600'
    case 'pending':
      return 'border-transparent bg-amber-500 text-white shadow-none hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500'
    case 'overdue':
      return 'border-transparent bg-rose-600 text-white shadow-none hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600'
    default:
      return 'border-transparent bg-zinc-500 text-white shadow-none hover:bg-zinc-600'
  }
}

export function creditStatusIconClass(
  status: string,
  credit?: Credit | null,
  size: keyof typeof iconSize = 'sm'
): string {
  const dim = iconSize[size]
  const base = `${dim} shrink-0`
  if (isCreditCancelled(credit) || status === 'cancelled') {
    return `${base} text-red-700 dark:text-red-400`
  }
  switch (status) {
    case 'completed':
      return `${base} text-green-700 dark:text-green-400`
    case 'partial':
      return `${base} text-sky-700 dark:text-sky-400`
    case 'pending':
      return `${base} text-amber-700 dark:text-amber-400`
    case 'overdue':
      return `${base} text-rose-700 dark:text-rose-400`
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
