'use client'

import { useCallback, useEffect, useState } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { EgresosTable } from '@/components/egresos/egresos-table'
import { EgresoModal } from '@/components/egresos/egreso-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { Egreso } from '@/types'
import {
  EgresosService,
  getEgresosStoreIdForCurrentUser,
} from '@/lib/egresos-service'
import { toast } from 'sonner'

export default function EgresosPage() {
  const { user } = useAuth()
  const { canCreate, canEdit, canCancel } = usePermissions()
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Egreso | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Egreso | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'cancelled' | 'all'>('active')
  const [conceptFilter, setConceptFilter] = useState('all')

  const storeId = getEgresosStoreIdForCurrentUser()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await EgresosService.getEgresos({
        storeId,
        status: statusFilter,
        concept: conceptFilter,
      })
      setEgresos(data)
    } catch {
      toast.error('Error al cargar egresos')
      setEgresos([])
    } finally {
      setLoading(false)
    }
  }, [storeId, statusFilter, conceptFilter])

  useEffect(() => {
    void load()
  }, [load, user?.storeId])

  const confirmCancel = async () => {
    if (!cancelTarget || !user?.id) return
    setCancelling(true)
    try {
      const result = await EgresosService.cancelEgreso(
        cancelTarget.id,
        user.id,
        user.name,
        'Anulado desde el módulo de egresos'
      )
      if (!result.success) {
        toast.error(result.error || 'No se pudo anular')
        return
      }
      toast.success('Egreso anulado')
      setCancelTarget(null)
      await load()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <RoleProtectedRoute module="egresos" requiredAction="view">
      <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <EgresosTable
          egresos={egresos}
          loading={loading}
          canCreate={canCreate('egresos')}
          canEdit={canEdit('egresos')}
          canCancel={canCancel('egresos')}
          onCreate={() => {
            setSelected(null)
            setModalOpen(true)
          }}
          onEdit={(e) => {
            setSelected(e)
            setModalOpen(true)
          }}
          onCancel={(e) => setCancelTarget(e)}
          onRefresh={load}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          conceptFilter={conceptFilter}
          onConceptFilterChange={setConceptFilter}
        />

        {user?.id && (
          <EgresoModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setSelected(null)
            }}
            onSaved={load}
            egreso={selected}
            currentUserId={user.id}
            currentUserName={user.name}
            storeId={storeId}
          />
        )}

        <ConfirmModal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
          title="Anular egreso"
          message={
            cancelTarget
              ? `¿Anular este egreso de ${new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                }).format(cancelTarget.amount)}?`
              : ''
          }
          confirmText={cancelling ? 'Anulando…' : 'Anular'}
          cancelText="Volver"
          type="danger"
        />
      </div>
    </RoleProtectedRoute>
  )
}
