'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import { CashCloseDetailPageView } from '@/components/caja/cash-close-detail-page-view'
import type { CashSession } from '@/types'
import type { CashCloseReportInput } from '@/lib/cash-close-whatsapp'
import Link from 'next/link'

export default function CashCloseDetailPage() {
  const params = useParams()
  const sessionId = typeof params?.sessionId === 'string' ? params.sessionId : ''
  const [session, setSession] = useState<CashSession | null>(null)
  const [report, setReport] = useState<CashCloseReportInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await CashSessionsService.getSessionById(sessionId)
        if (!row) {
          if (!cancelled) setError('Cierre de caja no encontrado')
          return
        }
        const { report: detail } = await CashSessionsService.buildCloseReportMessage(row)
        if (!cancelled) {
          setSession(row)
          setReport(detail)
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el detalle')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <RoleProtectedRoute module="cash_register" requiredAction="view">
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Cargando detalle…</p>
        </div>
      ) : error || !session || !report ? (
        <div className="space-y-3 py-10 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{error || 'No disponible'}</p>
          <Link href="/caja" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Volver a Caja
          </Link>
        </div>
      ) : (
        <CashCloseDetailPageView session={session} report={report} />
      )}
    </RoleProtectedRoute>
  )
}
