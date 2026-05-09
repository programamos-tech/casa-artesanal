/** Badges de garantías alineados con ventas/créditos (sin borde duro). */

export function warrantyStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'border-0 bg-amber-100/90 text-amber-950/90 dark:bg-amber-950/25 dark:text-amber-200/85'
    case 'in_progress':
      return 'border-0 bg-sky-100/85 text-sky-950/90 dark:bg-sky-950/35 dark:text-sky-200/88'
    case 'completed':
      return 'border-0 bg-green-100/85 text-green-900/90 dark:bg-green-950/30 dark:text-green-300/90'
    case 'rejected':
      return 'border-0 bg-zinc-200/90 text-zinc-800 dark:bg-zinc-800/55 dark:text-zinc-300'
    case 'discarded':
      return 'border-0 bg-zinc-100/90 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-500'
    default:
      return 'border-0 bg-zinc-100/90 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
  }
}

export function warrantyStatusIconColorClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-amber-600 dark:text-amber-400'
    case 'in_progress':
      return 'text-sky-600 dark:text-sky-400'
    case 'completed':
      return 'text-green-600 dark:text-green-400'
    case 'rejected':
      return 'text-zinc-500 dark:text-zinc-400'
    case 'discarded':
      return 'text-zinc-400 dark:text-zinc-500'
    default:
      return 'text-zinc-500 dark:text-zinc-400'
  }
}
