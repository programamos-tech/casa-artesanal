import type { ReportTone } from '@/components/dashboard/report-ui'

export function supplierInvoiceStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'partial':
      return 'Parcial'
    case 'paid':
      return 'Pagada'
    case 'cancelled':
      return 'Anulada'
    default:
      return status
  }
}

export function supplierInvoiceStatusTone(status: string): ReportTone {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'info'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function formatSupplierCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatSupplierDate(dateString: string): string {
  return new Date(dateString + (dateString.length <= 10 ? 'T12:00:00' : '')).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function supplierDueDateClass(dueDate?: string): string {
  if (!dueDate) return 'text-zinc-500 dark:text-zinc-400'
  const due = new Date(dueDate + (dueDate.length <= 10 ? 'T00:00:00' : ''))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return 'text-rose-600 dark:text-rose-400'
  if (diffDays <= 7) return 'text-amber-600 dark:text-amber-400'
  return 'text-zinc-500 dark:text-zinc-400'
}
