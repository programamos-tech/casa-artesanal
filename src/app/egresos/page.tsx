'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { EgresosTable } from '@/components/egresos/egresos-table'
import { EgresoModal } from '@/components/egresos/egreso-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { Egreso, EgresoKind } from '@/types'
import {
  EgresosService,
  getEgresosStoreIdForCurrentUser,
} from '@/lib/egresos-service'
import { toast } from 'sonner'

function parseKindParam(raw: string | null): EgresoKind | 'all' {
  if (raw === 'caja' || raw === 'cuenta') return raw
  return 'all'
}

export default function EgresosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { canCreate, canEdit, canCancel } = usePermissions()
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Egreso | null>(null)
  const [defaultKind, setDefaultKind] = useState<EgresoKind | undefined>(undefined)
  const [cancelTarget, setCancelTarget] = useState<Egreso | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'cancelled' | 'all'>('active')
  const [conceptFilter, setConceptFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<EgresoKind | 'all'>(() =>
    parseKindParam(searchParams.get('tipo'))
  )

  const storeId = getEgresosStoreIdForCurrentUser()

  useEffect(() => {
    const tipo = parseKindParam(searchParams.get('tipo'))
    if (tipo !== 'all') setKindFilter(tipo)
    if (searchParams.get('nuevo') === '1' && canCreate('egresos')) {
      setSelected(null)
      setDefaultKind('caja')
      setModalOpen(true)
      router.replace('/egresos' + (tipo !== 'all' ? `?tipo=${tipo}` : ''), { scroll: false })
    }
    // Solo reaccionar a la query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await EgresosService.getEgresos({
        storeId,
        status: statusFilter,
        concept: conceptFilter,
        expenseKind: kindFilter,
      })
      setEgresos(data)
    } catch {
      toast.error('Error al cargar egresos')
      setEgresos([])
    } finally {
      setLoading(false)
    }
  }, [storeId, statusFilter, conceptFilter, kindFilter])

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
            setDefaultKind('caja')
            setModalOpen(true)
          }}
          onEdit={(e) => {
            setSelected(e)
            setDefaultKind(undefined)
            setModalOpen(true)
          }}
          onCancel={(e) => setCancelTarget(e)}
          onRefresh={load}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          conceptFilter={conceptFilter}
          onConceptFilterChange={setConceptFilter}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
        />

        {user?.id && (
          <EgresoModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setSelected(null)
              setDefaultKind(undefined)
            }}
            onSaved={load}
            egreso={selected}
            defaultKind={defaultKind}
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
