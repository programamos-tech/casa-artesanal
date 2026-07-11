'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, X, Package } from 'lucide-react'
import { StoreStockTransfer, TransferItem } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type LineDecision = 'approved' | 'rejected' | null

interface ApproveTransferPanelProps {
  transfer: StoreStockTransfer
  currentUserId: string
  currentUserName?: string
  onApproved: () => void
  formatCurrency: (n: number) => string
}

export function ApproveTransferPanel({
  transfer,
  currentUserId,
  currentUserName,
  onApproved,
  formatCurrency,
}: ApproveTransferPanelProps) {
  const items = transfer.items || []
  const [decisions, setDecisions] = useState<Record<string, LineDecision>>(() =>
    Object.fromEntries(items.map((i) => [i.id, null]))
  )
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.quantity]))
  )
  const [saving, setSaving] = useState(false)

  const allDecided = useMemo(
    () => items.length > 0 && items.every((i) => decisions[i.id] === 'approved' || decisions[i.id] === 'rejected'),
    [items, decisions]
  )

  const setDecision = (itemId: string, decision: LineDecision) => {
    setDecisions((prev) => ({ ...prev, [itemId]: decision }))
  }

  const approveAll = () => {
    setDecisions(Object.fromEntries(items.map((i) => [i.id, 'approved' as const])))
  }

  const handleSubmit = async () => {
    if (!allDecided) {
      toast.error('Debes aprobar o rechazar cada referencia')
      return
    }
    setSaving(true)
    try {
      const payload = items.map((item) => ({
        itemId: item.id,
        decision: decisions[item.id] as 'approved' | 'rejected',
        quantity: quantities[item.id] ?? item.quantity,
        unitPrice: item.unitPrice ?? 0,
        fromLocation: item.fromLocation,
      }))

      const result = await StoreStockTransferService.approveTransferItems(
        transfer.id,
        payload,
        currentUserId,
        currentUserName
      )

      if (!result.success) {
        toast.error(result.error || 'No se pudo aprobar la solicitud')
        return
      }

      const approvedCount = payload.filter((p) => p.decision === 'approved').length
      if (approvedCount === 0) {
        toast.success('Solicitud rechazada por completo')
      } else {
        toast.success(
          `Solicitud aprobada (${approvedCount} ref.). Ya puede recibirla la tienda destino.`
        )
      }
      onApproved()
    } catch (e) {
      console.error(e)
      toast.error('Error al aprobar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  if (transfer.status !== 'requested' || items.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-500/25 dark:bg-amber-950/25">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Aprobar referencias
          </h3>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            Debes decidir cada producto. Al aprobar se descuenta el stock de tu tienda y se habilita la recepción.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={approveAll} disabled={saving}>
          Aprobar todas
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item: TransferItem) => {
          const decision = decisions[item.id]
          return (
            <li
              key={item.id}
              className={cn(
                'rounded-lg border bg-white p-3 dark:bg-zinc-950',
                decision === 'approved' && 'border-emerald-300 dark:border-emerald-700/50',
                decision === 'rejected' && 'border-rose-300 dark:border-rose-800/50',
                !decision && 'border-zinc-200 dark:border-zinc-800'
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 shrink-0 text-zinc-400" />
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.productName}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Ref. {item.productReference || '—'} · Solicitado: {item.quantity} u.
                    {item.unitPrice != null && ` · ${formatCurrency(item.unitPrice)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {decision === 'approved' && (
                    <div className="w-24">
                      <Label className="text-[10px] uppercase text-zinc-500">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="h-9"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={decision === 'approved' ? 'default' : 'outline'}
                    className={cn(decision === 'approved' && 'bg-emerald-600 hover:bg-emerald-500')}
                    onClick={() => setDecision(item.id, 'approved')}
                    disabled={saving}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={decision === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => setDecision(item.id, 'rejected')}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
              {decision && (
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-2',
                    decision === 'approved'
                      ? 'border-emerald-300 text-emerald-800 dark:text-emerald-300'
                      : 'border-rose-300 text-rose-800 dark:text-rose-300'
                  )}
                >
                  {decision === 'approved' ? 'Aprobada' : 'Rechazada'}
                </Badge>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={!allDecided || saving}>
          {saving ? 'Procesando…' : 'Confirmar decisiones'}
        </Button>
      </div>
    </div>
  )
}
