'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock3, X } from 'lucide-react'
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
const DISMISS_STORAGE_KEY = 'casa_artesanal_cash_bar_dismissed'

function buildBarStatusKey(
  barStatus: CashSessionSemaphore,
  sessions: CashOpenSessionStatus[]
): string {
  const sessionPart = sessions
    .map((session) => `${session.sessionId}:${session.status}`)
    .sort()
    .join('|')
  return `${barStatus}::${sessionPart}`
}

const SEMAPHORE_STYLES: Record<
  CashSessionSemaphore,
  {
    bar: string
    icon: string
    muted: string
    dot: string
    link: string
    button: string
    dismiss: string
  }
> = {
  green: {
    bar: 'border-t-2 border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-900 dark:text-emerald-50 dark:shadow-[0_-4px_20px_rgba(5,150,105,0.25)]',
    icon: 'text-emerald-600 dark:text-emerald-300',
    muted: 'text-emerald-700/85 dark:text-emerald-200/85',
    dot: 'bg-emerald-500 dark:bg-emerald-300',
    link: 'text-emerald-800 hover:text-emerald-950 dark:text-emerald-100 dark:hover:text-white',
    button:
      'border-emerald-300/90 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-800 dark:text-emerald-50 dark:hover:bg-emerald-700',
    dismiss:
      'text-emerald-700 hover:bg-emerald-200/80 dark:text-emerald-100 dark:hover:bg-emerald-800/80',
  },
  orange: {
    bar: 'border-t-2 border-amber-500 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500 dark:bg-amber-900 dark:text-amber-50 dark:shadow-[0_-4px_20px_rgba(245,158,11,0.2)]',
    icon: 'text-amber-600 dark:text-amber-300',
    muted: 'text-amber-800/85 dark:text-amber-200/85',
    dot: 'bg-amber-500 dark:bg-amber-300',
    link: 'text-amber-900 hover:text-amber-950 dark:text-amber-100 dark:hover:text-white',
    button:
      'border-amber-300/90 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-500/40 dark:bg-amber-800 dark:text-amber-50 dark:hover:bg-amber-700',
    dismiss:
      'text-amber-800 hover:bg-amber-200/80 dark:text-amber-100 dark:hover:bg-amber-800/80',
  },
  red: {
    bar: 'border-t-2 border-red-500 bg-red-50 text-red-950 shadow-sm dark:border-red-500 dark:bg-red-900 dark:text-red-50 dark:shadow-[0_-4px_20px_rgba(220,38,38,0.2)]',
    icon: 'text-red-600 dark:text-red-300',
    muted: 'text-red-700/85 dark:text-red-200/85',
    dot: 'bg-red-500 dark:bg-red-300',
    link: 'text-red-800 hover:text-red-950 dark:text-red-100 dark:hover:text-white',
    button:
      'border-red-300/90 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-500/40 dark:bg-red-800 dark:text-red-50 dark:hover:bg-red-700',
    dismiss: 'text-red-700 hover:bg-red-200/80 dark:text-red-100 dark:hover:bg-red-800/80',
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
  const props = { className: cn('mt-0.5 h-4 w-4 shrink-0', className), strokeWidth: 2, 'aria-hidden': true as const }
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
        <Link href="/caja" className={cn('font-semibold underline underline-offset-2', linkClassName)}>
          ciérrala al terminar el turno
        </Link>
        .
      </>
    )
  }
  return (
    <>
      Tienes la caja de ayer abierta.{' '}
      <Link href="/caja" className={cn('font-semibold underline underline-offset-2', linkClassName)}>
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
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY)
    } catch {
      return null
    }
  })

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

  const barStatus =
    sessions.length > 0
      ? isOwner
        ? worstCashSessionSemaphore(sessions)
        : sessions[0].status
      : 'green'
  const statusKey = useMemo(
    () => buildBarStatusKey(barStatus, sessions),
    [barStatus, sessions]
  )
  const isDismissed = dismissedKey === statusKey
  const isVisible = Boolean(user && !hideOnPath(pathname) && sessions.length > 0 && !isDismissed)

  useEffect(() => {
    const height =
      isVisible ? (sessions.length > 1 && isOwner ? '56px' : '40px') : '0px'
    document.documentElement.style.setProperty('--cash-stale-alert-h', height)
    return () => {
      document.documentElement.style.setProperty('--cash-stale-alert-h', '0px')
    }
  }, [isVisible, sessions.length, isOwner])

  const handleDismiss = useCallback(() => {
    setDismissedKey(statusKey)
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, statusKey)
    } catch {
      // ignore storage errors
    }
  }, [statusKey])

  if (!isVisible) return null

  const styles = SEMAPHORE_STYLES[barStatus]
  const staffSession = sessions[0]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'casa-artesanal-preserve-surface fixed left-0 right-0 z-[55]',
        styles.bar,
        'bottom-11 md:bottom-12 xl:bottom-0'
      )}
    >
      <div className="mx-auto flex max-w-[100%] items-start gap-2 px-3 py-2 md:px-5 xl:pl-[calc(15rem+1.25rem)] xl:pr-24">
        <StatusIcon status={barStatus} className={styles.icon} />
        <div className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          {isOwner ? (
            <div className="space-y-1">
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
              'shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold',
              styles.button
            )}
          >
            Ir a Caja
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn('shrink-0 rounded-md p-1 transition-colors', styles.dismiss)}
          aria-label="Ocultar aviso de caja"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}
