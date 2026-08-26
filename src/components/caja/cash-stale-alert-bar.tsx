'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  formatCashOpenDuration,
  loadCashStaleAlerts,
  resolveCashStaleAlertScope,
  type CashStaleOpenAlert,
} from '@/lib/cash-stale-alerts'
import { cn } from '@/lib/utils'

const REFRESH_MS = 60_000

function hideOnPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda')
  )
}

export function CashStaleAlertBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<CashStaleOpenAlert[]>([])
  const [isOwner, setIsOwner] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || hideOnPath(pathname)) {
      setAlerts([])
      return
    }

    const scope = resolveCashStaleAlertScope(user)
    setIsOwner(scope.isOwner)
    const next = await loadCashStaleAlerts(scope)
    setAlerts(next)
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
    const height = alerts.length > 0 ? (alerts.length > 1 && isOwner ? '56px' : '40px') : '0px'
    document.documentElement.style.setProperty('--cash-stale-alert-h', height)
    return () => {
      document.documentElement.style.setProperty('--cash-stale-alert-h', '0px')
    }
  }, [alerts.length, isOwner])

  if (!user || hideOnPath(pathname) || alerts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed left-0 right-0 z-[46] border-t border-red-800/30 bg-red-600 text-white shadow-[0_-4px_20px_rgba(220,38,38,0.35)]',
        'bottom-11 md:bottom-12 xl:bottom-0'
      )}
    >
      <div className="mx-auto flex max-w-[100%] items-start gap-2 px-3 py-2 md:px-5 xl:pl-[calc(15rem+1.25rem)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-100" strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          {isOwner ? (
            <div className="space-y-1">
              {alerts.map((alert) => (
                <p key={alert.sessionId}>
                  La caja de{' '}
                  <span className="font-semibold">{alert.storeName}</span> sigue abierta{' '}
                  {formatCashOpenDuration(alert.openedAt)}
                  {alert.openedByName ? (
                    <span className="text-red-100/90"> · {alert.openedByName}</span>
                  ) : null}
                </p>
              ))}
            </div>
          ) : (
            <p>
              Tienes la caja de ayer abierta.{' '}
              <Link href="/caja" className="font-semibold underline underline-offset-2 hover:text-red-50">
                Ve a Caja y ciérrala
              </Link>{' '}
              antes de facturar o mover dinero.
            </p>
          )}
        </div>
        {isOwner ? (
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
