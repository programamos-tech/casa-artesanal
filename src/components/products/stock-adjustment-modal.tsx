'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Package, AlertTriangle, Store, TrendingUp, TrendingDown, FileText, Loader2 } from 'lucide-react'
import { Product } from '@/types'
import { cn } from '@/lib/utils'
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
  modalCardShellClass,
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

  return createPortal(
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-5xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjust-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Package className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} />
            <div className="min-w-0">
              <h2 id="stock-adjust-title" className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Ajustar stock
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                Modifica el inventario disponible del producto
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className={appModalBodyClass}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className={modalCardShellClass}>
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Información del producto
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className={appModalLabelClass}>Producto</span>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{product.name}</div>
                    </div>
                    <div>
                      <span className={appModalLabelClass}>Referencia</span>
                      <div className="font-mono text-sm text-zinc-900 dark:text-zinc-50">{product.reference}</div>
                    </div>
                  </div>
                  <div>
                    <span className={appModalLabelClass}>Stock actual · Local</span>
                    <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatNumber(product.stock.store)} unidades
                    </div>
                  </div>
                </div>
              </section>

              <section className={modalCardShellClass}>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Configuración del ajuste
                  </h3>
                </div>
                <div className="space-y-3">
                <div>
                  <span className={appModalLabelClass}>Ubicación a ajustar</span>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left dark:border-zinc-700 dark:bg-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <Store className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Local</div>
                        <div className={appModalHintClass}>
                          Stock actual: {formatNumber(product.stock.store)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={appModalLabelClass}>Nueva cantidad *</label>
                  <input
                    type="text"
                    value={formData.newQuantity === null ? '' : formatNumber(formData.newQuantity)}
                    onChange={(e) => {
                      handleInputChange('newQuantity', parseFormattedNumber(e.target.value))
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      appModalInputClass,
                      errors.newQuantity && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
                    )}
                    placeholder="0"
                  />
                  {errors.newQuantity && <p className={appModalErrorClass}>{errors.newQuantity}</p>}
                </div>

                <div>
                  <label className={appModalLabelClass}>Razón del ajuste</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    disabled={isSubmitting}
                    className={cn(
                      appModalInputClass,
                      'min-h-20 resize-none',
                      errors.reason && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
                    )}
                    placeholder="Ej: Inventario físico, producto dañado, corrección de error... (opcional)"
                    rows={3}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {errors.reason && (
                      <p className={appModalErrorClass}>{errors.reason}</p>
                    )}
                    <span
                      className={cn(
                        'ml-auto',
                        appModalHintClass,
                        formData.reason.length > 0 && formData.reason.length < 10
                          ? 'text-red-600 dark:text-red-400'
                          : undefined
                      )}
                    >
                      {formData.reason.length > 0 ? `${formData.reason.length}/10 caracteres mínimo` : 'Campo opcional'}
                    </span>
                  </div>
                </div>
                </div>
              </section>
            </div>

            {hasEnteredQuantity && (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Diferencia</span>
                    <p className={appModalHintClass}>
                      {getStockDifference() === 0
                        ? 'Sin cambio en Local'
                        : getStockDifference() > 0
                          ? 'Incremento en Local'
                          : 'Reducción en Local'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStockDifference() > 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                    ) : getStockDifference() < 0 ? (
                      <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
                    ) : null}
                    <span
                      className={cn(
                        'text-base font-semibold tabular-nums',
                        getStockDifference() > 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : getStockDifference() < 0
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-zinc-700 dark:text-zinc-200'
                      )}
                    >
                      {getStockDifference() > 0 ? '+' : ''}
                      {formatNumber(getStockDifference())} unidades
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  Actualizando…
                </>
              ) : (
                'Ajustar stock'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
