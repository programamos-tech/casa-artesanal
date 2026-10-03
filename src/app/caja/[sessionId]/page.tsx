'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import { CashCloseDetailPageView } from '@/components/caja/cash-close-detail-page-view'
import type { CashSession } from '@/types'
import type { CashCloseReportInput } from '@/lib/cash-close-whatsapp'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando cierre…</p>
        </div>
      ) : error || !session || !report ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{error || 'No disponible'}</p>
          <Link
            href="/caja"
            className="casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Volver a Caja
          </Link>
        </div>
      ) : (
        <CashCloseDetailPageView session={session} report={report} />
      )}
    </RoleProtectedRoute>
  )
}
