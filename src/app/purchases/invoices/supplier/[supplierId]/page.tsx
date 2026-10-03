'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SupplierInvoiceTable } from '@/components/supplier-invoices/supplier-invoice-table'
import { SupplierInvoiceModal } from '@/components/supplier-invoices/supplier-invoice-modal'
import { groupInvoicesBySupplier } from '@/components/supplier-invoices/supplier-payable-summary-table'
import { formatSupplierCurrency as formatCurrency } from '@/components/supplier-invoices/supplier-invoice-status'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'
import { cn } from '@/lib/utils'

const SIN_PROVEEDOR_SEGMENT = '__sin_proveedor__'

const detailActionClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium leading-none transition-colors disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0'

const detailGhostClass = cn(
  detailActionClass,
  'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white'
)

const detailPrimaryClass = cn(
  detailActionClass,
  'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
)

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

function parseSupplierRouteParam(param: string): string {
  const decoded = decodeURIComponent(param)
  return decoded === SIN_PROVEEDOR_SEGMENT ? '' : decoded
}

export default function SupplierPayablesDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawParam = typeof params?.supplierId === 'string' ? params.supplierId : ''
  const supplierKey = rawParam ? parseSupplierRouteParam(rawParam) : ''

  const { user } = useAuth()
  const { canCreate } = usePermissions()
  const { ensureCashReady } = useCashOperationGate()
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const inv = await SupplierInvoicesService.getInvoices()
      setInvoices(inv)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (user) loadAll()
  }, [user?.storeId, loadAll])

  const supplierInvoices = useMemo(
    () => invoices.filter((i) => (i.supplierId || '') === supplierKey),
    [invoices, supplierKey]
  )

  const supplierName = useMemo(() => {
    const fromInv = supplierInvoices.find((i) => (i.supplierName || '').trim())?.supplierName?.trim()
    if (fromInv) return fromInv
    if (supplierKey === '') return 'Sin proveedor'
    const groups = groupInvoicesBySupplier(invoices)
    const g = groups.find((x) => (x.supplierId || '') === supplierKey)
    return g?.supplierName || 'Proveedor'
  }, [supplierInvoices, supplierKey, invoices])

  const summary = useMemo(() => {
    const active = supplierInvoices.filter((i) => i.status !== 'cancelled')
    const total = active.reduce((s, i) => s + i.totalAmount, 0)
    const paid = active.reduce((s, i) => s + i.paidAmount, 0)
    const pending = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0)
    const open = active.filter((i) => i.totalAmount - i.paidAmount > 0).length
    return { total, paid, pending, open }
  }, [supplierInvoices])

  const goToDetail = (inv: SupplierInvoice) => {
    router.push(`/purchases/invoices/${inv.id}`)
  }

  const openNewInvoice = async () => {
    if (!(await ensureCashReady('supplier'))) return
    setInvoiceModalOpen(true)
  }

  const notFound = !loading && supplierKey !== '' && supplierInvoices.length === 0 && invoices.length > 0

  return (
    <RoleProtectedRoute module="supplier_invoices" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
              {supplierName}
            </h1>
            <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">Facturas del proveedor</p>
            {!loading && !notFound ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot tone={summary.open > 0 ? 'warning' : 'success'} />
                  {summary.open > 0
                    ? `${summary.open} factura${summary.open !== 1 ? 's' : ''} abierta${summary.open !== 1 ? 's' : ''}`
                    : 'Al día'}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} />
            </button>
            <Link href="/purchases/invoices" className={detailGhostClass}>
              <ArrowLeft strokeWidth={1.75} />
              Volver
            </Link>
            {canCreate('supplier_invoices') ? (
              <button type="button" onClick={openNewInvoice} className={detailPrimaryClass}>
                <Plus strokeWidth={2} />
                Nueva factura
              </button>
            ) : null}
          </div>
        </div>

        {notFound ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              No hay facturas para este proveedor en esta tienda
            </p>
            <Link href="/purchases/invoices" className={cn(detailGhostClass, 'mt-5')}>
              <ArrowLeft strokeWidth={1.75} />
              Ir al listado de proveedores
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total facturado</p>
                <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {loading ? '…' : formatCurrency(summary.total)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pagado</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
                  style={!loading && summary.paid > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
                >
                  {loading ? '…' : formatCurrency(summary.paid)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Por pagar</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
                  style={!loading && summary.pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
                >
                  {loading ? '…' : formatCurrency(summary.pending)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Facturas</p>
                <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {loading ? '…' : supplierInvoices.length}
                </p>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Facturas</h2>
              <SupplierInvoiceTable invoices={supplierInvoices} onView={goToDetail} isLoading={loading} />
            </section>
          </>
        )}

        <SupplierInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={loadAll}
          invoice={null}
          defaultSupplierId={supplierKey}
        />
      </div>
    </RoleProtectedRoute>
  )
}
