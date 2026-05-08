'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import {
  SupplierPayableSummaryTable,
  groupInvoicesBySupplier,
} from '@/components/supplier-invoices/supplier-payable-summary-table'
import { SupplierInvoiceModal } from '@/components/supplier-invoices/supplier-invoice-modal'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'

export default function SupplierInvoicesPage() {
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

  const groups = useMemo(() => groupInvoicesBySupplier(invoices), [invoices])

  const openNewInvoice = () => {
    setInvoiceModalOpen(true)
  }

  return (
    <RoleProtectedRoute module="supplier_invoices" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 pb-24 xl:pb-8">
        <div className="py-4 md:py-8">
          <SupplierPayableSummaryTable
            groups={groups}
            onCreate={openNewInvoice}
            canCreate={canCreate('supplier_invoices')}
            isLoading={loading}
            onRefresh={loadAll}
          />
        </div>

        <SupplierInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={loadAll}
          invoice={null}
        />
      </div>
    </RoleProtectedRoute>
  )
}
