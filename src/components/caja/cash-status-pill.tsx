'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  formatCashOpenDuration,
  loadCashSessionStatuses,
  resolveCashStaleAlertScope,
  worstCashSessionSemaphore,
  type CashOpenSessionStatus,
  type CashSessionSemaphore,
} from '@/lib/cash-stale-alerts'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { cn } from '@/lib/utils'

const REFRESH_MS = 60_000

const SEMAPHORE_TONE: Record<CashSessionSemaphore, ReportTone> = {
  green: 'success',
  orange: 'warning',
  red: 'danger',
}

const SEMAPHORE_PILL: Record<CashSessionSemaphore, string> = {
  green:
    'border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.1] dark:text-white/75 dark:hover:bg-white/[0.05] dark:hover:text-white',
  orange:
    'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15',
  red: 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15',
}

const PILL_LABEL: Record<CashSessionSemaphore, string> = {
  green: 'Caja abierta',
  orange: 'Cerrar caja',
  red: 'Caja de ayer abierta',
}

const STAFF_HINT: Record<CashSessionSemaphore, string> = {
  green: 'Caja abierta',
  orange: 'Ya pasaron las 7 PM: cierra la caja al terminar el turno.',
  red: 'Tienes la caja de ayer abierta: ciérrala antes de facturar o mover dinero.',
}

function hideOnPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda')
  )
}

function ownerLineLabel(session: CashOpenSessionStatus): string {
  if (session.status === 'green') return 'Abierta'
  if (session.status === 'orange') return 'Pendiente de cierre'
  return `Abierta ${formatCashOpenDuration(session.openedAt)}`
}

export function CashStatusPill() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [sessions, setSessions] = useState<CashOpenSessionStatus[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!user || hideOnPath(pathname) || sessions.length === 0) return null

  const status = isOwner ? worstCashSessionSemaphore(sessions) : sessions[0].status
  const label = PILL_LABEL[status]
  const pillClass = cn(
    'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 dark:focus-visible:ring-white/15',
    SEMAPHORE_PILL[status]
  )
  const content = (
    <>
      <StatusDot tone={SEMAPHORE_TONE[status]} />
      <span className="hidden whitespace-nowrap lg:inline">{label}</span>
    </>
  )

  if (!isOwner) {
    return (
      <Link href="/caja" className={pillClass} title={STAFF_HINT[status]} aria-label={STAFF_HINT[status]}>
        {content}
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={pillClass}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {content}
        <ChevronDown
          className={cn('hidden h-3.5 w-3.5 opacity-60 transition-transform lg:block', open && 'rotate-180')}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && (
        <div className="casa-artesanal-preserve-surface absolute right-0 top-[calc(100%+6px)] z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#111113] dark:shadow-black/50">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-white/40">
            Cajas abiertas
          </p>
          <ul>
            {sessions.map((session) => (
              <li key={session.sessionId} className="flex items-start gap-2.5 px-3 py-2 text-[13px]">
                <StatusDot tone={SEMAPHORE_TONE[session.status]} className="mt-1.5" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900 dark:text-white">{session.storeName}</span>
                  <span className="block text-xs text-zinc-500 dark:text-white/50">
                    {ownerLineLabel(session)}
                    {session.status === 'red' && session.openedByName ? ` · ${session.openedByName}` : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-100 px-2 pt-1 dark:border-white/[0.06]">
            <Link
              href="/caja"
              className="block rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-white/75 dark:hover:bg-white/[0.05] dark:hover:text-white"
            >
              Ir a Caja
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
