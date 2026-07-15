'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, PackageCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import {
  getSeenTransferIds,
  loadTransferAlerts,
  markTransferIdsSeen,
  resolveUserStoreId,
  type TransferAlertItem,
  type TransferAlertKind,
} from '@/lib/transfer-alerts'
import { cn } from '@/lib/utils'

type AlertModalState = {
  kind: TransferAlertKind
  items: TransferAlertItem[]
} | null

/**
 * Al entrar: avisa mientras haya traslados por aprobar o por recibir.
 * "Después" solo oculta el modal en esta sesión; la campana sigue encendida.
 */
export function TransferAlertModal() {
  const router = useRouter()
  const { user } = useAuth()
  const [alert, setAlert] = useState<AlertModalState>(null)

  const dismiss = useCallback(() => {
    if (user?.id && alert) {
      markTransferIdsSeen(
        user.id,
        alert.kind,
        alert.items.map((i) => i.id)
      )
    }
    setAlert(null)
  }, [alert, user?.id])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const check = async () => {
      try {
        const storeId = resolveUserStoreId(user.storeId)
        const { approvals, receptions, waiting } = await loadTransferAlerts(storeId, {
          allStores: canAccessAllStores(user),
        })
        if (cancelled) return

        setAlert((prev) => {
          if (prev) return prev
          const unseenApprovals = approvals.filter(
            (a) => !getSeenTransferIds(user.id, 'approval').includes(a.id)
          )
          if (unseenApprovals.length > 0) {
            return { kind: 'approval', items: unseenApprovals }
          }
          const unseenReceptions = receptions.filter(
            (r) => !getSeenTransferIds(user.id, 'receive').includes(r.id)
          )
          if (unseenReceptions.length > 0) {
            return { kind: 'receive', items: unseenReceptions }
          }
          const unseenWaiting = waiting.filter(
            (w) => !getSeenTransferIds(user.id, 'waiting').includes(w.id)
          )
          if (unseenWaiting.length > 0) {
            return { kind: 'waiting', items: unseenWaiting }
          }
          return null
        })
      } catch {
        // silencioso
      }
    }

    void check()
    const interval = setInterval(() => void check(), 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user?.id, user?.storeId, user?.role])

  if (!alert) return null

  const isApproval = alert.kind === 'approval'
  const isWaiting = alert.kind === 'waiting'
  const count = alert.items.length
  const primary = alert.items[0]
  const title = isApproval
    ? '¡Tienes traslados por aprobación!'
    : isWaiting
      ? 'Tu solicitud espera aprobación'
      : '¡Ya puedes recibir traslados!'
  const message = isApproval
    ? count === 1
      ? `Hay 1 solicitud pendiente de aprobar (${primary.transferNumber}). Revisa cada referencia para descontar stock de tu tienda.`
      : `Hay ${count} solicitudes pendientes de aprobar. Revisa cada referencia para descontar stock de tu tienda.`
    : isWaiting
      ? count === 1
        ? `El traslado ${primary.transferNumber} sigue pendiente de aprobación en origen. Te avisaremos cuando puedas recibirlo.`
        : `Hay ${count} solicitudes esperando aprobación en la tienda origen.`
      : count === 1
        ? `El traslado ${primary.transferNumber} ya fue aprobado y está listo para recibir en tu tienda.`
        : `Hay ${count} traslados aprobados listos para recibir en tu tienda.`

  const goHref =
    count === 1
      ? primary.href
      : isApproval || isWaiting
        ? '/inventory/transfers'
        : '/inventory/receptions'

  const goLabel = isApproval
    ? count === 1
      ? 'Ir a aprobar'
      : 'Ver solicitudes'
    : isWaiting
      ? 'Ver solicitud'
      : count === 1
        ? 'Ir a recibir'
        : 'Ver recepciones'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-60"
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-alert-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/80">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isApproval
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                  : isWaiting
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              )}
            >
              {isApproval || isWaiting ? (
                <Truck className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <PackageCheck className="h-5 w-5" strokeWidth={1.75} />
              )}
            </span>
            <h2
              id="transfer-alert-title"
              className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            onClick={dismiss}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{message}</p>
          {alert.items.length > 1 && (
            <ul className="max-h-36 space-y-1.5 overflow-y-auto text-sm">
              {alert.items.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
                >
                  <span className="font-medium">{item.transferNumber}</span>
                  <span className="text-zinc-400"> · </span>
                  {item.subtitle}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <Button type="button" variant="outline" size="sm" onClick={dismiss}>
            Después
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            onClick={() => {
              dismiss()
              router.push(goHref)
            }}
          >
            {goLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
