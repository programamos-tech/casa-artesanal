'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { X, ArrowRightLeft, Package, Store, AlertTriangle } from 'lucide-react'
import { Product, StockTransfer } from '@/types'
import { cn } from '@/lib/utils'

const panelInner =
  'rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-950/40'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

/** Portal + z por encima del bottom nav (z-45); evita stacking atrapado en main (z-10). */
const overlayClass =
  'fixed inset-0 z-[100] overflow-hidden overscroll-none bg-black/50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-56'

const overlayInnerClass = 'flex h-full min-h-0 w-full touch-none items-center justify-center py-4'

const shellClass =
  'isolate flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-4xl touch-auto flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900'

interface StockTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'userId' | 'userName'>) => void
  product: Product | null
}

export function StockTransferModal({ isOpen, onClose, onTransfer, product }: StockTransferModalProps) {
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

  const [formData, setFormData] = useState({
    fromLocation: 'warehouse' as 'warehouse' | 'store',
    toLocation: 'store' as 'warehouse' | 'store',
    quantity: 0,
    reason: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0'
    }

    if (formData.fromLocation === formData.toLocation) {
      newErrors.toLocation = 'La ubicación destino debe ser diferente a la origen'
    }

    if (product) {
      const availableStock = formData.fromLocation === 'warehouse' 
        ? product.stock.warehouse 
        : product.stock.store

      if (formData.quantity > availableStock) {
        newErrors.quantity = `No hay suficiente stock. Disponible: ${availableStock}`
      }
    }

    // Campo motivo ahora es opcional - solo validar longitud si se proporciona
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas un motivo, debe tener al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | number) => {
    // Para el campo quantity, si es string vacío, lo convertimos a 0
    const processedValue = field === 'quantity' && value === '' ? 0 : value
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTransfer = () => {
    if (validateForm() && product) {
      onTransfer({
        productId: product.id,
        productName: product.name,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        quantity: formData.quantity,
        reason: formData.reason.trim()
      })
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      fromLocation: 'warehouse',
      toLocation: 'store',
      quantity: 0,
      reason: ''
    })
    setErrors({})
    onClose()
  }

  const getLocationLabel = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? 'Bodega' : 'Local'
  }

  const getLocationIcon = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? Package : Store
  }

  const getAvailableStock = () => {
    if (!product) return 0
    return formData.fromLocation === 'warehouse' 
      ? product.stock.warehouse 
      : product.stock.store
  }

  if (!isOpen || !product) return null

  if (!portalReady || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className={overlayClass}>
      <div className={overlayInnerClass}>
        <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="stock-transfer-title">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/80">
            <div className="flex min-w-0 items-center gap-2.5">
              <ArrowRightLeft className="h-5 w-5 shrink-0 text-zinc-500" strokeWidth={1.5} />
              <h2 id="stock-transfer-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Transferir stock
              </h2>
            </div>
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              handleTransfer()
            }}
          >
            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain">
              <div className="space-y-4 p-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {product.name} · {product.reference}
              </p>
            </div>

          <div className="space-y-6">
            {/* Detalles de la Transferencia */}
            <div>
              <Card className={cn('shadow-none', panelInner)}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <ArrowRightLeft className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                    Detalles de la transferencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-3 block text-zinc-700 dark:text-zinc-300">Desde *</Label>
                      <div className="space-y-3">
                        {(['warehouse', 'store'] as const).map((location) => {
                          const Icon = getLocationIcon(location)
                          const isSelected = formData.fromLocation === location
                          return (
                            <button
                              key={location}
                              type="button"
                              onClick={() => handleInputChange('fromLocation', location)}
                              className={cn(
                                'w-full rounded-lg border p-3 text-left text-sm font-medium transition-colors',
                                isSelected
                                  ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                                  : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                              )}
                            >
                              <div className="flex items-center space-x-3">
                                <Icon
                                  className={cn(
                                    'h-5 w-5',
                                    isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
                                  )}
                                  strokeWidth={1.5}
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div
                                    className={cn(
                                      'text-base font-medium',
                                      isSelected
                                        ? 'text-zinc-900 dark:text-zinc-50'
                                        : 'text-zinc-700 dark:text-zinc-300'
                                    )}
                                  >
                                    {getLocationLabel(location)}
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Stock: {formatNumber(location === 'warehouse' ? product.stock.warehouse : product.stock.store)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block text-zinc-700 dark:text-zinc-300">Hacia *</Label>
                      <div className="space-y-3">
                        {(['warehouse', 'store'] as const).map((location) => {
                          const Icon = getLocationIcon(location)
                          const isSelected = formData.toLocation === location
                          const isDisabled = location === formData.fromLocation
                          return (
                            <button
                              key={location}
                              type="button"
                              onClick={() => !isDisabled && handleInputChange('toLocation', location)}
                              disabled={isDisabled}
                              className={cn(
                                'w-full rounded-lg border p-3 text-left text-sm font-medium transition-colors',
                                isDisabled
                                  ? 'cursor-not-allowed border-zinc-200 opacity-50 dark:border-zinc-800'
                                  : isSelected
                                    ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                                    : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                              )}
                            >
                              <div className="flex items-center space-x-3">
                                <Icon
                                  className={cn(
                                    'h-5 w-5',
                                    isDisabled
                                      ? 'text-zinc-400'
                                      : isSelected
                                        ? 'text-zinc-900 dark:text-zinc-100'
                                        : 'text-zinc-400 dark:text-zinc-500'
                                  )}
                                  strokeWidth={1.5}
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div
                                    className={cn(
                                      'text-base font-medium',
                                      isDisabled
                                        ? 'text-zinc-400 dark:text-zinc-500'
                                        : isSelected
                                          ? 'text-zinc-900 dark:text-zinc-50'
                                          : 'text-zinc-700 dark:text-zinc-300'
                                    )}
                                  >
                                    {getLocationLabel(location)}
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Stock: {formatNumber(location === 'warehouse' ? product.stock.warehouse : product.stock.store)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {errors.toLocation && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.toLocation}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300">Cantidad a transferir *</Label>
                      <input
                        type="number"
                        min="1"
                        max={getAvailableStock()}
                        value={formData.quantity || ''}
                        onChange={(e) => handleInputChange('quantity', parseInt(e.target.value, 10) || 0)}
                        className={cn(
                          inputClass,
                          'mt-2 h-11 py-2 text-sm',
                          errors.quantity && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                        )}
                        placeholder="Ingrese cantidad"
                      />
                      <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Máx: {formatNumber(getAvailableStock())}
                      </div>
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300">Motivo de la transferencia</Label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                        className={cn(
                          inputClass,
                          'mt-2 min-h-[4rem] resize-y py-2.5 text-sm',
                          errors.reason && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                        )}
                        placeholder="Ej: Reposición de tienda, devolución a bodega, etc. (opcional)"
                        rows={3}
                      />
                      <div className="mt-1 flex items-center justify-between">
                        {errors.reason && (
                          <p className="text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
                        )}
                        <span
                          className={cn(
                            'ml-auto text-xs',
                            formData.reason.length > 0 && formData.reason.length < 10
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          )}
                        >
                          {formData.reason.length > 0 ? `${formData.reason.length}/10` : 'Opcional'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            <Card className={cn('mt-6 shadow-none', panelInner)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  <AlertTriangle className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                  Resumen de la transferencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Producto</div>
                    <div className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">{product.name}</div>
                  </div>
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Transferir</div>
                    <div className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                      {formData.quantity > 0 ? `${formatNumber(formData.quantity)} unidades` : '0 unidades'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Stock después</div>
                    <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Bodega:{' '}
                      {formatNumber(
                        formData.fromLocation === 'warehouse'
                          ? product.stock.warehouse - formData.quantity
                          : product.stock.warehouse + (formData.toLocation === 'warehouse' ? formData.quantity : 0)
                      )}
                    </div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Local:{' '}
                      {formatNumber(
                        formData.fromLocation === 'store'
                          ? product.stock.store - formData.quantity
                          : product.stock.store + (formData.toLocation === 'store' ? formData.quantity : 0)
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">De → A</div>
                    <div className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                      {getLocationLabel(formData.fromLocation)} → {getLocationLabel(formData.toLocation)}
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>
          </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
                Transferir stock
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
