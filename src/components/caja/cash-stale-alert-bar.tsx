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
  {
    bar: string
    icon: string
    muted: string
    dot: string
    link: string
    button: string
  }
> = {
  green: {
    bar: 'border-emerald-200/90 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/75 dark:text-emerald-50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    muted: 'text-emerald-700/80 dark:text-emerald-300/85',
    dot: 'bg-emerald-500',
    link: 'text-emerald-800 underline-offset-2 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-emerald-50',
    button:
      'border-emerald-300/70 bg-white/70 text-emerald-900 hover:bg-white dark:border-emerald-700/50 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60',
  },
  orange: {
    bar: 'border-amber-200/90 bg-amber-50/95 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/75 dark:text-amber-50',
    icon: 'text-amber-600 dark:text-amber-400',
    muted: 'text-amber-700/80 dark:text-amber-300/85',
    dot: 'bg-amber-500',
    link: 'text-amber-800 underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50',
    button:
      'border-amber-300/70 bg-white/70 text-amber-900 hover:bg-white dark:border-amber-700/50 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60',
  },
  red: {
    bar: 'border-red-200/90 bg-red-50/95 text-red-950 dark:border-red-800/60 dark:bg-red-950/75 dark:text-red-50',
    icon: 'text-red-600 dark:text-red-400',
    muted: 'text-red-700/80 dark:text-red-300/85',
    dot: 'bg-red-500',
    link: 'text-red-800 underline-offset-2 hover:text-red-950 dark:text-red-200 dark:hover:text-red-50',
    button:
      'border-red-300/70 bg-white/70 text-red-900 hover:bg-white dark:border-red-700/50 dark:bg-red-900/40 dark:text-red-100 dark:hover:bg-red-900/60',
  },
}

function hideOnPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda')
  )
}

function StatusIcon({
  status,
  className,
}: {
  status: CashSessionSemaphore
  className: string
}) {
  const props = { className: cn('h-3.5 w-3.5 shrink-0', className), strokeWidth: 2, 'aria-hidden': true as const }
  if (status === 'green') return <CheckCircle2 {...props} />
  if (status === 'orange') return <Clock3 {...props} />
  return <AlertTriangle {...props} />
}

function StaffMessage({
  session,
  linkClassName,
}: {
  session: CashOpenSessionStatus
  linkClassName: string
}) {
  if (session.status === 'green') {
    return <>Caja abierta y operativa.</>
  }
  if (session.status === 'orange') {
    return (
      <>
        La caja sigue abierta. Ya pasaron las 7 PM —{' '}
        <Link href="/caja" className={cn('font-medium underline', linkClassName)}>
          ciérrala al terminar el turno
        </Link>
        .
      </>
    )
  }
  return (
    <>
      Tienes la caja de ayer abierta.{' '}
      <Link href="/caja" className={cn('font-medium underline', linkClassName)}>
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
        className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)}
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
      sessions.length > 0 ? (sessions.length > 1 && isOwner ? '44px' : '32px') : '0px'
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
        'fixed left-0 right-0 z-[55] border-t backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm',
        styles.bar,
        'bottom-11 md:bottom-12 xl:bottom-0'
      )}
    >
      <div className="mx-auto flex max-w-[100%] items-center gap-2 px-3 py-1.5 md:px-5 xl:pl-[calc(15rem+1.25rem)] xl:pr-24">
        <StatusIcon status={barStatus} className={styles.icon} />
        <div className="min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
          {isOwner ? (
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <OwnerLine key={session.sessionId} session={session} />
              ))}
            </div>
          ) : (
            <p>
              <StaffMessage session={staffSession} linkClassName={styles.link} />
            </p>
          )}
        </div>
        {isOwner || staffSession.status !== 'green' ? (
          <Link
            href="/caja"
            className={cn(
              'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium sm:text-xs',
              styles.button
            )}
          >
            Ir a Caja
          </Link>
        ) : null}
      </div>
    </div>
  )
}
