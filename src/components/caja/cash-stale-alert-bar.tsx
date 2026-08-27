'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  formatCashOpenDuration,
  loadCashSessionStatuses,
  resolveCashStaleAlertScope,
  worstCashSessionSemaphore,
  type CashOpenSessionStatus,
  type CashSessionSemaphore,
} from '@/lib/cash-stale-alerts'
import { cn } from '@/lib/utils'

const REFRESH_MS = 60_000

const SEMAPHORE_STYLES: Record<
  CashSessionSemaphore,
  { bar: string; muted: string; dot: string }
> = {
  green: {
    bar: 'border-emerald-800/30 bg-emerald-600 text-white shadow-[0_-4px_20px_rgba(5,150,105,0.35)]',
    muted: 'text-emerald-100/90',
    dot: 'bg-emerald-200',
  },
  orange: {
    bar: 'border-amber-700/30 bg-amber-500 text-white shadow-[0_-4px_20px_rgba(245,158,11,0.35)]',
    muted: 'text-amber-50/90',
    dot: 'bg-amber-100',
  },
  red: {
    bar: 'border-red-800/30 bg-red-600 text-white shadow-[0_-4px_20px_rgba(220,38,38,0.35)]',
    muted: 'text-red-100/90',
    dot: 'bg-red-200',
  },
}

function hideOnPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda')
  )
}

function StatusIcon({ status }: { status: CashSessionSemaphore }) {
  if (status === 'green') {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" strokeWidth={2} aria-hidden />
  }
  if (status === 'orange') {
    return <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-50" strokeWidth={2} aria-hidden />
  }
  return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-100" strokeWidth={2} aria-hidden />
}

function StaffMessage({ session }: { session: CashOpenSessionStatus }) {
  if (session.status === 'green') {
    return <>Caja abierta y operativa.</>
  }
  if (session.status === 'orange') {
    return (
      <>
        La caja sigue abierta. Ya pasaron las 7 PM —{' '}
        <Link href="/caja" className="font-semibold underline underline-offset-2 hover:text-amber-50">
          ciérrala al terminar el turno
        </Link>
        .
      </>
    )
  }
  return (
    <>
      Tienes la caja de ayer abierta.{' '}
      <Link href="/caja" className="font-semibold underline underline-offset-2 hover:text-red-50">
        Ve a Caja y ciérrala
      </Link>{' '}
      antes de facturar o mover dinero.
    </>
  )
}

function OwnerLine({ session }: { session: CashOpenSessionStatus }) {
  const styles = SEMAPHORE_STYLES[session.status]

  return (
    <p className="flex items-start gap-2">
      <span
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)}
        aria-hidden
      />
      <span>
        {session.status === 'green' ? (
          <>
            La caja de <span className="font-semibold">{session.storeName}</span> está abierta y operativa.
          </>
        ) : session.status === 'orange' ? (
          <>
            La caja de <span className="font-semibold">{session.storeName}</span> sigue abierta · conviene
            cerrar al terminar el día.
          </>
        ) : (
          <>
            La caja de <span className="font-semibold">{session.storeName}</span> sigue abierta{' '}
            {formatCashOpenDuration(session.openedAt)}
            {session.openedByName ? (
              <span className={styles.muted}> · {session.openedByName}</span>
            ) : null}
          </>
        )}
      </span>
    </p>
  )
}

export function CashStaleAlertBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [sessions, setSessions] = useState<CashOpenSessionStatus[]>([])
  const [isOwner, setIsOwner] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || hideOnPath(pathname)) {
      setSessions([])
      return
    }

    const scope = resolveCashStaleAlertScope(user)
    setIsOwner(scope.isOwner)
    const next = await loadCashSessionStatuses(scope)
    setSessions(next)
  }, [pathname, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user || hideOnPath(pathname)) return
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [pathname, refresh, user])

  useEffect(() => {
    const height =
      sessions.length > 0 ? (sessions.length > 1 && isOwner ? '56px' : '40px') : '0px'
    document.documentElement.style.setProperty('--cash-stale-alert-h', height)
    return () => {
      document.documentElement.style.setProperty('--cash-stale-alert-h', '0px')
    }
  }, [sessions.length, isOwner])

  if (!user || hideOnPath(pathname) || sessions.length === 0) return null

  const barStatus = isOwner ? worstCashSessionSemaphore(sessions) : sessions[0].status
  const styles = SEMAPHORE_STYLES[barStatus]
  const staffSession = sessions[0]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed left-0 right-0 z-[55] border-t',
        styles.bar,
        'bottom-11 md:bottom-12 xl:bottom-0'
      )}
    >
      <div className="mx-auto flex max-w-[100%] items-start gap-2 px-3 py-2 md:px-5 xl:pl-[calc(15rem+1.25rem)]">
        <StatusIcon status={barStatus} />
        <div className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          {isOwner ? (
            <div className="space-y-1">
              {sessions.map((session) => (
                <OwnerLine key={session.sessionId} session={session} />
              ))}
            </div>
          ) : (
            <p>
              <StaffMessage session={staffSession} />
            </p>
          )}
        </div>
        {isOwner || staffSession.status !== 'green' ? (
          <Link
            href="/caja"
            className="shrink-0 rounded-md border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
          >
            Ir a Caja
          </Link>
        ) : null}
      </div>
    </div>
  )
}
