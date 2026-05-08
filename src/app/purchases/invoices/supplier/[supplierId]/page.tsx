'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SupplierInvoiceTable } from '@/components/supplier-invoices/supplier-invoice-table'
import { SupplierInvoiceModal } from '@/components/supplier-invoices/supplier-invoice-modal'
import { groupInvoicesBySupplier } from '@/components/supplier-invoices/supplier-payable-summary-table'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'

const SIN_PROVEEDOR_SEGMENT = '__sin_proveedor__'

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)

  const pendingTotal = useMemo(
    () =>
      supplierInvoices
        .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
        .reduce((sum, i) => sum + Math.max(0, i.totalAmount - i.paidAmount), 0),
    [supplierInvoices]
  )

  const goToDetail = (inv: SupplierInvoice) => {
    router.push(`/purchases/invoices/${inv.id}`)
  }

  const defaultSupplierIdForModal = supplierKey

  const notFound = !loading && supplierKey !== '' && supplierInvoices.length === 0 && invoices.length > 0

  return (
    <RoleProtectedRoute module="supplier_invoices" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 pb-24 xl:pb-8">
        <div className="border-b border-zinc-300 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar
                name={supplierName}
                seed={supplierKey || SIN_PROVEEDOR_SEGMENT}
                size="lg"
                className="shrink-0 ring-2 ring-zinc-300 dark:ring-zinc-700"
              />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {supplierName}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {supplierInvoices.length} factura{supplierInvoices.length !== 1 ? 's' : ''} · Por pagar{' '}
                  <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(pendingTotal)}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href="/purchases/invoices"
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors sm:self-auto',
                'hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
              )}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Volver
            </Link>
          </div>
        </div>

        <div className="py-4 md:py-8">
          {notFound ? (
            <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No hay facturas para este proveedor en esta tienda.
              <div className="mt-4">
                <Link
                  href="/purchases/invoices"
                  className="font-medium text-zinc-800 underline dark:text-zinc-200"
                >
                  Ir al listado de proveedores
                </Link>
              </div>
            </div>
          ) : (
            <SupplierInvoiceTable
              variant="embedded"
              invoices={supplierInvoices}
              suppliers={[]}
              onView={goToDetail}
              onCreate={() => setInvoiceModalOpen(true)}
              canCreate={canCreate('supplier_invoices')}
              isLoading={loading}
              onRefresh={loadAll}
            />
          )}
        </div>

        <SupplierInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={loadAll}
          invoice={null}
          defaultSupplierId={defaultSupplierIdForModal}
        />
      </div>
    </RoleProtectedRoute>
  )
}
