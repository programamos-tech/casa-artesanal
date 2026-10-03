'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { Product } from '@/types'
import { cn } from '@/lib/utils'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalErrorClass,
  modalFooterClass,
  modalHeaderClass,
  modalHintClass,
  modalInputClass,
  modalInputErrorClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdjust: (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => Promise<void>
  product?: Product | null
}

export function StockAdjustmentModal({ isOpen, onClose, onAdjust, product }: StockAdjustmentModalProps) {
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [isOpen])

  // Solo Local; bodega no se usa en ajustes. null = aún no escribió cantidad.
  const [formData, setFormData] = useState<{
    newQuantity: number | null
    reason: string
  }>({
    newQuantity: null,
    reason: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Función para formatear números con separadores de miles
  const formatNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0'

    // Para números enteros, no mostrar decimales
    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }
    // Para números con decimales, mostrar hasta 2 decimales
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // Función para parsear números con formato
  const parseFormattedNumber = (value: string): number | null => {
    const rawValue = value.trim()
    if (!rawValue) return null
    // Remover separadores de miles y convertir a número
    const cleanValue = rawValue.replace(/\./g, '').replace(/,/g, '')
    const parsed = parseFloat(cleanValue)
    return Number.isNaN(parsed) ? null : parsed
  }

  useEffect(() => {
    if (product) {
      setFormData({
        newQuantity: null,
        reason: ''
      })
      setErrors({})
      setIsSubmitting(false)
    }
  }, [product])

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setErrors({})
    }
  }, [isOpen])

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!product || isSubmitting) return

    // Validaciones
    const newErrors: Record<string, string> = {}

    if (formData.newQuantity === null) {
      newErrors.newQuantity = 'Ingresa la nueva cantidad'
    } else if (formData.newQuantity < 0) {
      newErrors.newQuantity = 'La cantidad no puede ser negativa'
    }
    
    // Campo razón ahora es opcional - solo validar longitud si se proporciona
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas una razón, debe tener al menos 10 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onAdjust(product.id, 'store', formData.newQuantity as number, formData.reason)
    } catch (error) {
      console.error('Error in stock adjustment:', error)
      // No cerrar el modal si hay error, dejar que el usuario vea el mensaje de error
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCurrentStock = () => {
    if (!product) return 0
    return product.stock.store
  }

  const hasEnteredQuantity = formData.newQuantity !== null

  const getStockDifference = () => {
    if (!hasEnteredQuantity) return 0
    return (formData.newQuantity as number) - getCurrentStock()
  }

  if (!isOpen || !product) return null

  if (!portalReady || typeof document === 'undefined') {
    return null
  }

  const difference = getStockDifference()

  return createPortal(
    <div className={modalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(modalPanelClass, 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjust-title"
        onClick={event => event.stopPropagation()}
      >
        <header className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="stock-adjust-title" className={modalTitleClass}>
              Ajustar stock
            </h2>
            <p className={modalSubtitleClass}>
              {product.name}
              <span className="text-zinc-400 dark:text-white/35"> · Ref. {product.reference}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={modalCloseButtonClass}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className={cn(modalBodyClass, 'space-y-5')}>
            <div>
              <div className="grid grid-cols-3 items-start gap-4">
                <div>
                  <span className={modalLabelClass}>Stock actual</span>
                  <div className="flex h-9 items-center text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {formatNumber(getCurrentStock())}
                    <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-white/40">und.</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="stock-adjust-qty" className={modalLabelClass}>
                    Nueva cantidad <span className="text-zinc-400 dark:text-white/30">*</span>
                  </label>
                  <input
                    id="stock-adjust-qty"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={formData.newQuantity === null ? '' : formatNumber(formData.newQuantity)}
                    onChange={e => handleInputChange('newQuantity', parseFormattedNumber(e.target.value))}
                    disabled={isSubmitting}
                    className={cn(modalInputClass, 'tabular-nums', errors.newQuantity && modalInputErrorClass)}
                    placeholder={formatNumber(getCurrentStock())}
                  />
                </div>

                <div>
                  <span className={modalLabelClass}>Diferencia</span>
                  <div
                    className={cn(
                      'flex h-9 items-center text-[15px] font-semibold tabular-nums',
                      !hasEnteredQuantity || difference === 0
                        ? 'text-zinc-400 dark:text-white/35'
                        : difference > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {!hasEnteredQuantity ? '—' : `${difference > 0 ? '+' : ''}${formatNumber(difference)}`}
                  </div>
                </div>
              </div>
              {errors.newQuantity ? (
                <p className={modalErrorClass}>{errors.newQuantity}</p>
              ) : (
                <p className={modalHintClass}>Se ajusta el stock de la tienda seleccionada.</p>
              )}
            </div>

            <div>
              <label htmlFor="stock-adjust-reason" className={modalLabelClass}>
                Razón del ajuste <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
              </label>
              <textarea
                id="stock-adjust-reason"
                value={formData.reason}
                onChange={e => handleInputChange('reason', e.target.value)}
                disabled={isSubmitting}
                className={cn(
                  modalInputClass,
                  'h-auto min-h-[4.5rem] resize-none py-2',
                  errors.reason && modalInputErrorClass
                )}
                placeholder="Ej: inventario físico, producto dañado, corrección de error…"
                rows={3}
              />
              {errors.reason ? (
                <p className={modalErrorClass}>{errors.reason}</p>
              ) : formData.reason.length > 0 && formData.reason.trim().length < 10 ? (
                <p className={modalHintClass}>Mínimo 10 caracteres ({formData.reason.trim().length}/10).</p>
              ) : null}
            </div>
          </div>

          <footer className={modalFooterClass}>
            <button type="button" onClick={onClose} disabled={isSubmitting} className={modalSecondaryButtonClass}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className={modalPrimaryButtonClass}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  Actualizando…
                </>
              ) : (
                'Ajustar stock'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}
