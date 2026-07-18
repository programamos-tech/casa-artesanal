'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, DollarSign, CreditCard, Banknote, Shuffle, Upload } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUser } from '@/lib/store-helper'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { supabase } from '@/lib/supabase'
import { compressImageForUpload } from '@/lib/compress-image-for-upload'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  appModalBodyClass,
  appModalErrorClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalHintClass,
  appModalInputClass,
  appModalLabelClass,
  appModalOverlayClass,
  appModalPanelClass,
} from '@/lib/app-modal'
import { cardShell } from '@/lib/card-shell'

function paymentReceiptStoredToPublicUrl(stored: string): string {
  const s = stored.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '').replace(/^supplier-invoices\//, '')
  if (!path) return ''
  return supabase.storage.from('supplier-invoices').getPublicUrl(path).data.publicUrl
}

interface SupplierPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: SupplierInvoice | null
  onAddPayment: () => void
}

export function SupplierPaymentModal({
  isOpen,
  onClose,
  invoice,
  onAddPayment,
}: SupplierPaymentModalProps) {
  const { user } = useAuth()
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'mixed'>('transfer')
  const [cashStr, setCashStr] = useState('')
  const [transferStr, setTransferStr] = useState('')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const formatNumber = (value: string): string => {
    const numeric = value.replace(/[^\d]/g, '')
    if (!numeric) return ''
    return parseInt(numeric, 10).toLocaleString('es-CO')
  }

  const parseAmount = (value: string) => parseFloat(value.replace(/[^\d]/g, '')) || 0

  useEffect(() => {
    if (isOpen) {
      setAmountStr('')
      setPaymentMethod('transfer')
      setCashStr('')
      setTransferStr('')
      setNotes('')
      setImageUrl(null)
      setUploadPreview(null)
      setUploading(false)
      setError('')
      setSubmitting(false)
    }
  }, [isOpen, invoice?.id])

  const receiptPublicUrl = imageUrl ? paymentReceiptStoredToPublicUrl(imageUrl) : ''

  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setUploadPreview(blobUrl)
    setUploading(true)
    try {
      const prepared = await compressImageForUpload(file)
      const fd = new FormData()
      fd.append('file', prepared)
      const res = await fetch('/api/storage/upload-supplier-payment-receipt', {
        method: 'POST',
        body: fd,
      })
      const text = await res.text()
      let json: { error?: string; url?: string; path?: string } = {}
      try {
        json = text ? (JSON.parse(text) as typeof json) : {}
      } catch {
        throw new Error(
          res.status === 413
            ? 'La imagen supera el máximo de 2 MB. Intenta con otra foto.'
            : 'No se pudo procesar la respuesta del servidor al subir la imagen.'
        )
      }
      if (!res.ok) throw new Error(json.error || 'Error al subir')
      const path = typeof json.path === 'string' ? json.path.trim() : ''
      const url = typeof json.url === 'string' ? json.url.trim() : ''
      const stored = path || url
      if (!stored) throw new Error('El servidor no devolvió la ruta ni la URL de la imagen')
      setImageUrl(stored)
      toast.success('Comprobante del abono subido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
      setImageUrl(null)
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!isOpen || !invoice) return null

  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amount = parseAmount(amountStr)
    if (amount <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    if (amount > pending + 0.01) {
      setError(`El monto no puede superar ${pending.toLocaleString('es-CO')} COP pendientes`)
      return
    }
    let cashAmount: number | undefined
    let transferAmount: number | undefined
    if (paymentMethod === 'mixed') {
      const c = parseAmount(cashStr)
      const t = parseAmount(transferStr)
      if (c <= 0 || t <= 0) {
        setError('Indica cuánto es en efectivo y cuánto en transferencia (ambos mayores a 0)')
        return
      }
      if (Math.abs(c + t - amount) > 0.01) {
        setError('La suma de efectivo y transferencia debe ser igual al monto del abono')
        return
      }
      cashAmount = c
      transferAmount = t
    }
    let userId = user?.id
    let userName = user?.name
    if (!userId) {
      const u = getCurrentUser()
      userId = u?.id
      userName = u?.name || userName
    }
    if (!userId) {
      setError('No se pudo identificar el usuario')
      return
    }
    setSubmitting(true)
    try {
      await SupplierInvoicesService.addPayment({
        invoiceId: invoice.id,
        amount,
        paymentMethod,
        cashAmount,
        transferAmount,
        notes: notes.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
        userId,
        userName: userName || 'Usuario',
      })
      onAddPayment()
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === 'object' &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Error al registrar el abono'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n)

  const inputClass = cn(appModalInputClass, 'rounded-lg')

  const methodOptions = [
    {
      v: 'transfer' as const,
      label: 'Transferencia',
      Icon: CreditCard,
      selected:
        'border-sky-300 bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:border-sky-700/60 dark:bg-sky-900/45 dark:text-sky-100 dark:ring-sky-800/50',
    },
    {
      v: 'cash' as const,
      label: 'Efectivo',
      Icon: Banknote,
      selected:
        'border-emerald-300 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80 dark:border-emerald-700/60 dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-800/50',
    },
    {
      v: 'mixed' as const,
      label: 'Mixto',
      Icon: Shuffle,
      selected:
        'border-stone-300 bg-stone-100 text-stone-800 ring-1 ring-stone-200/80 dark:border-zinc-500/70 dark:bg-zinc-700/55 dark:text-zinc-100 dark:ring-zinc-600/50',
    },
  ] as const

  const methodIdleClass =
    'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800'

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-payment-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <DollarSign className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <h2
              id="supplier-payment-modal-title"
              className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Registrar abono
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(appModalBodyClass, 'space-y-4')}>
            <div className={cn(cardShell, 'space-y-1 p-3')}>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {invoice.supplierName} · {invoice.invoiceNumber}
              </p>
              <p className={appModalHintClass}>
                Pendiente:{' '}
                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatCurrency(pending)}
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="supplier-payment-amount" className={appModalLabelClass}>
                Monto del abono
              </label>
              <input
                id="supplier-payment-amount"
                value={amountStr}
                onChange={e => setAmountStr(formatNumber(e.target.value))}
                className={cn(inputClass, 'h-12 text-lg font-semibold tabular-nums')}
                placeholder="0"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div>
              <span className={appModalLabelClass}>Método</span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Método de pago">
                {methodOptions.map(({ v, label, Icon, selected }) => {
                  const active = paymentMethod === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(v)
                        if (v !== 'mixed') {
                          setCashStr('')
                          setTransferStr('')
                        }
                      }}
                      aria-pressed={active}
                      className={cn(
                        'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center text-xs font-bold transition-colors',
                        active ? selected : methodIdleClass
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {paymentMethod === 'mixed' && (
              <div className={cn(cardShell, 'space-y-3 p-3')}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Desglose del abono mixto
                </p>
                <div>
                  <label htmlFor="supplier-payment-cash" className={cn(appModalLabelClass, 'flex items-center gap-2')}>
                    <Banknote className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Monto en efectivo
                  </label>
                  <input
                    id="supplier-payment-cash"
                    value={cashStr}
                    onChange={e => setCashStr(formatNumber(e.target.value))}
                    className={cn(inputClass, 'h-11 text-base tabular-nums')}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label
                    htmlFor="supplier-payment-transfer"
                    className={cn(appModalLabelClass, 'flex items-center gap-2')}
                  >
                    <CreditCard className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Monto en transferencia
                  </label>
                  <input
                    id="supplier-payment-transfer"
                    value={transferStr}
                    onChange={e => setTransferStr(formatNumber(e.target.value))}
                    className={cn(inputClass, 'h-11 text-base tabular-nums')}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                {amountStr && (
                  <p className={appModalHintClass}>
                    Total abono:{' '}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseAmount(amountStr))}
                    </span>
                    {' · '}
                    Suma desglose:{' '}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseAmount(cashStr) + parseAmount(transferStr))}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="supplier-payment-notes" className={appModalLabelClass}>
                Notas (opcional)
              </label>
              <textarea
                id="supplier-payment-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className={cn(inputClass, 'min-h-[4rem] resize-y py-2.5 text-sm')}
                placeholder="Observaciones del abono…"
              />
            </div>

            <div className={cn(cardShell, 'space-y-2 p-3')}>
              <span className={cn(appModalLabelClass, 'mb-0')}>Comprobante del abono (opcional)</span>
              <p className={appModalHintClass}>
                Foto del recibo o transferencia. Máx. 2 MB; se comprime en el navegador si hace falta.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg border-transparent bg-emerald-500 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600',
                    (uploading || submitting) && 'pointer-events-none opacity-50'
                  )}
                >
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptFile}
                    disabled={uploading || submitting}
                  />
                </label>
                {receiptPublicUrl && (
                  <button
                    type="button"
                    className="text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    onClick={() => {
                      setImageUrl(null)
                      setUploadPreview(null)
                    }}
                  >
                    Quitar
                  </button>
                )}
                {receiptPublicUrl && (
                  <a
                    href={receiptPublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Abrir
                  </a>
                )}
              </div>
              {(uploadPreview || receiptPublicUrl) && (
                <div className="relative mt-1 max-h-[min(28dvh,180px)] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80">
                  {uploading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                      Subiendo…
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview || receiptPublicUrl || ''}
                    alt="Vista previa del comprobante de abono"
                    className="mx-auto block h-auto max-h-[min(28dvh,180px)] w-full object-contain"
                  />
                </div>
              )}
            </div>

            {error && <p className={appModalErrorClass}>{error}</p>}
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
