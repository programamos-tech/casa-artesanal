'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, CheckCircle, Package, AlertCircle } from 'lucide-react'
import { StoreStockTransfer } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-56'

const shellClass =
  'flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-[min(720px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900'

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

const textareaClass =
  'min-h-[80px] w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

const panelClass =
  'rounded-xl border border-zinc-200/90 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-950/40'

const productCardClass =
  'rounded-xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/30'

interface ReceiveTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (receivedItems: Array<{ itemId: string; quantityReceived: number; note?: string }>) => Promise<void>
  transfer: StoreStockTransfer | null
}

interface ReceivedItemForm {
  itemId: string
  productName: string
  productReference?: string
  expectedQuantity: number
  quantityReceived: number
  note: string
}

export function ReceiveTransferModal({ isOpen, onClose, onConfirm, transfer }: ReceiveTransferModalProps) {
  const [receivedItems, setReceivedItems] = useState<ReceivedItemForm[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && transfer) {
      if (transfer.items && transfer.items.length > 0) {
        setReceivedItems(
          transfer.items.map(item => ({
            itemId: item.id,
            productName: item.productName,
            productReference: item.productReference,
            expectedQuantity: item.quantity,
            quantityReceived: item.quantity,
            note: '',
          }))
        )
      } else {
        setReceivedItems([
          {
            itemId: transfer.id,
            productName: transfer.productName || 'Producto',
            expectedQuantity: transfer.quantity || 0,
            quantityReceived: transfer.quantity || 0,
            note: '',
          },
        ])
      }
    } else if (!isOpen) {
      setReceivedItems([])
    }
  }, [isOpen, transfer])

  const handleItemChange = (index: number, field: keyof ReceivedItemForm, value: string | number) => {
    const newItems = [...receivedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReceivedItems(newItems)
  }

  const handleConfirm = async () => {
    if (!transfer) return

    for (const item of receivedItems) {
      if (item.quantityReceived < 0) {
        toast.error(`La cantidad recibida de ${item.productName} no puede ser negativa`)
        return
      }
      if (item.quantityReceived > item.expectedQuantity) {
        toast.error(
          `La cantidad recibida de ${item.productName} no puede ser mayor a la esperada (${item.expectedQuantity})`
        )
        return
      }
    }

    const hasAnyReceived = receivedItems.some(item => item.quantityReceived > 0)
    if (!hasAnyReceived) {
      toast.error('Debes recibir al menos una unidad de algún producto')
      return
    }

    setIsSaving(true)
    try {
      const receivedItemsData = receivedItems.map(item => ({
        itemId: item.itemId,
        quantityReceived: item.quantityReceived,
        note: item.note.trim() || undefined,
      }))

      await onConfirm(receivedItemsData)
    } catch (error) {
      console.error('Error confirming reception:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted || !isOpen || !transfer) return null

  const totalExpected = receivedItems.reduce((sum, item) => sum + item.expectedQuantity, 0)
  const totalReceived = receivedItems.reduce((sum, item) => sum + item.quantityReceived, 0)
  const transferTitle = transfer.transferNumber || `TRF-${transfer.id.substring(0, 8)}`

  const modal = (
    <div className={overlayClass} role="dialog" aria-modal="true" aria-labelledby="receive-transfer-title">
      <div className={shellClass}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 md:px-6">
          <h2
            id="receive-transfer-title"
            className="min-w-0 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Confirmar Recepción — {transferTitle}
          </h2>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          <div className="space-y-5">
            {/* Resumen */}
            <div className={cn(panelClass, 'px-4 py-4')}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Total esperado
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {totalExpected} <span className="text-base font-medium text-zinc-500">unidades</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Total a recibir
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-xl font-semibold tabular-nums',
                      totalReceived === totalExpected
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : totalReceived < totalExpected
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {totalReceived}{' '}
                    <span className="text-base font-medium text-zinc-500 dark:text-zinc-400">unidades</span>
                  </p>
                </div>
              </div>
              {totalReceived < totalExpected && (
                <div className="mt-4 flex items-start gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" strokeWidth={1.5} />
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Estás recibiendo menos unidades de las esperadas. Se registrará como{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-300">recepción parcial</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Lista de productos */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <Package className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                Productos a recibir
              </h3>

              <div className="space-y-3">
                {receivedItems.map((item, index) => {
                  const isPartial = item.quantityReceived < item.expectedQuantity
                  const isOver = item.quantityReceived > item.expectedQuantity

                  return (
                    <div
                      key={item.itemId}
                      className={cn(
                        productCardClass,
                        isPartial && 'border-amber-500/35 dark:border-amber-500/25',
                        isOver && 'border-red-500/40 dark:border-red-500/30'
                      )}
                    >
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{item.productName}</h4>
                          {item.productReference && (
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              SKU: {item.productReference}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Cantidad esperada
                            </p>
                            <p className="mt-1.5 text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                              {item.expectedQuantity}{' '}
                              {item.expectedQuantity === 1 ? 'unidad' : 'unidades'}
                            </p>
                          </div>
                          <div>
                            <Label htmlFor={`quantity-${index}`} className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Cantidad recibida <span className="text-red-500 dark:text-red-400">*</span>
                            </Label>
                            <input
                              id={`quantity-${index}`}
                              type="text"
                              inputMode="numeric"
                              value={item.quantityReceived.toString()}
                              onChange={e => {
                                const value = e.target.value.replace(/[^\d]/g, '')
                                if (value === '') {
                                  handleItemChange(index, 'quantityReceived', 0)
                                } else {
                                  const qty = parseInt(value, 10)
                                  if (!isNaN(qty)) {
                                    handleItemChange(index, 'quantityReceived', qty)
                                  }
                                }
                              }}
                              onBlur={e => {
                                const value = e.target.value.trim()
                                if (value === '') {
                                  handleItemChange(index, 'quantityReceived', 0)
                                } else {
                                  const cleaned = value === '0' ? '0' : value.replace(/^0+/, '') || '0'
                                  const qty = parseInt(cleaned, 10)
                                  if (!isNaN(qty)) {
                                    handleItemChange(index, 'quantityReceived', qty)
                                  }
                                }
                              }}
                              className={cn(inputClass, 'mt-1.5', isOver && 'border-red-500 dark:border-red-500')}
                              aria-invalid={isOver}
                            />
                            {isPartial && item.quantityReceived >= 0 && (
                              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                                Faltan {item.expectedQuantity - item.quantityReceived} unidades
                              </p>
                            )}
                            {isOver && (
                              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                Excede por {item.quantityReceived - item.expectedQuantity} unidades
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`note-${index}`} className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Nota (opcional)
                          </Label>
                          <Textarea
                            id={`note-${index}`}
                            value={item.note}
                            onChange={e => handleItemChange(index, 'note', e.target.value)}
                            placeholder="Producto en buen estado, faltante por daño, etc."
                            className={cn(textareaClass, 'mt-1.5')}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:flex-row sm:justify-end sm:gap-3 md:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={isSaving || !receivedItems.some(i => i.quantityReceived > 0)}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900 dark:border-zinc-500 dark:border-t-zinc-100" />
                Confirmando…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                Confirmar recepción
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
