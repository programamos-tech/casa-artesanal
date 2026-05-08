'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { X, Package, AlertTriangle, Warehouse, Store, TrendingUp, TrendingDown, FileText } from 'lucide-react'
import { Product } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

/** Misma caja secundaria que modales de abono (proveedor / crédito) */
const panelInner =
  'rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-950/40'

/** Igual que supplier-payment-modal / payment-modal */
const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

/** Por encima del bottom nav (z-45) y del sidebar (z-40); portal a body evita quedar atrapado en main (z-10). */
/** Sin scroll en el overlay: evita que en iPad el gesto arrastre todo el modal. El scroll solo va en el cuerpo del diálogo. */
const overlayClass =
  'fixed inset-0 z-[100] overflow-hidden overscroll-none bg-black/50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-56'

/** touch-none en el contenedor centrador; touch-auto en la caja del modal para inputs y scroll interno. */
const overlayInnerClass = 'flex h-full min-h-0 w-full touch-none items-center justify-center py-4'

/** Una sola caja: sin overflow en el borde; solo el cuerpo hace scroll (header + footer fijos al card). */
const shellClass =
  'isolate flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-3xl touch-auto flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900'

// Constante para identificar la tienda principal
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdjust: (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => Promise<void>
  product?: Product | null
}

export function StockAdjustmentModal({ isOpen, onClose, onAdjust, product }: StockAdjustmentModalProps) {
  const { user } = useAuth()
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
  
  // Detectar si es tienda principal o microtienda
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  const [formData, setFormData] = useState({
    location: 'store' as 'warehouse' | 'store',
    newQuantity: 0,
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

  // Función para parsear números con formato
  const parseFormattedNumber = (value: string): number => {
    // Remover separadores de miles y convertir a número
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
    return parseFloat(cleanValue) || 0
  }

  useEffect(() => {
    if (product) {
      setFormData({
        location: 'store',
        newQuantity: 0,
        reason: ''
      })
    }
  }, [product])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!product) return

    // Validaciones
    const newErrors: Record<string, string> = {}
    
    if (formData.newQuantity < 0) {
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

    // Llamar a onAdjust pero no cerrar el modal automáticamente
    // El modal se cerrará desde el componente padre si la operación es exitosa
    try {
      await onAdjust(product.id, formData.location, formData.newQuantity, formData.reason)
    } catch (error) {
      console.error('Error in stock adjustment:', error)
      // No cerrar el modal si hay error, dejar que el usuario vea el mensaje de error
    }
  }

  const getCurrentStock = () => {
    if (!product) return 0
    return formData.location === 'warehouse' ? product.stock.warehouse : product.stock.store
  }

  const getStockDifference = () => {
    const current = getCurrentStock()
    const newQty = formData.newQuantity
    return newQty - current
  }

  const getLocationLabel = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? 'Bodega' : 'Local'
  }

  if (!isOpen || !product) return null

  if (!portalReady || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className={overlayClass}>
      <div className={overlayInnerClass}>
        <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="stock-adjust-title">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/80">
          <div className="flex min-w-0 items-center gap-2.5">
            <Package className="h-5 w-5 shrink-0 text-zinc-500" strokeWidth={1.5} />
            <h2 id="stock-adjust-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Ajustar stock
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain">
              <div className="space-y-4 p-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Modificar inventario del producto</p>
            </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Información del Producto */}
            <Card className={cn('shadow-none', panelInner)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  <FileText className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                  Información del producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Producto</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{product.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Referencia</span>
                    <div className="font-mono text-sm text-zinc-900 dark:text-zinc-50">{product.reference}</div>
                  </div>
                </div>
                <div className={`grid ${isMainStore ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {isMainStore && (
                    <div>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Stock actual — Bodega</span>
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatNumber(product.stock.warehouse)} unidades
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Stock actual — Local</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatNumber(product.stock.store)} unidades
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuración del Ajuste */}
            <Card className={cn('shadow-none', panelInner)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  <AlertTriangle className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                  Configuración del ajuste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-3 block text-zinc-700 dark:text-zinc-300">Ubicación a ajustar *</Label>
                  <div className={`grid ${isMainStore ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    <button
                      type="button"
                      onClick={() => handleInputChange('location', 'store')}
                      className={cn(
                        'rounded-lg border p-3 text-left text-sm font-medium transition-colors',
                        formData.location === 'store'
                          ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                          : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Store
                          className={cn(
                            'h-5 w-5',
                            formData.location === 'store'
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400 dark:text-zinc-500'
                          )}
                          strokeWidth={1.5}
                        />
                        <div>
                          <div
                            className={cn(
                              'font-medium',
                              formData.location === 'store'
                                ? 'text-zinc-900 dark:text-zinc-50'
                                : 'text-zinc-700 dark:text-zinc-300'
                            )}
                          >
                            Local
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            Stock actual: {formatNumber(product.stock.store)}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isMainStore && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('location', 'warehouse')}
                        className={cn(
                          'rounded-lg border p-3 text-left text-sm font-medium transition-colors',
                          formData.location === 'warehouse'
                            ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                            : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Warehouse
                            className={cn(
                              'h-5 w-5',
                              formData.location === 'warehouse'
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-500'
                            )}
                            strokeWidth={1.5}
                          />
                          <div>
                            <div
                              className={cn(
                                'font-medium',
                                formData.location === 'warehouse'
                                  ? 'text-zinc-900 dark:text-zinc-50'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              )}
                            >
                              Bodega
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              Stock actual: {formatNumber(product.stock.warehouse)}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-700 dark:text-zinc-300">Nueva cantidad *</Label>
                  <input
                    type="text"
                    value={formData.newQuantity === 0 ? '' : formatNumber(formData.newQuantity)}
                    onChange={(e) => {
                      const rawValue = e.target.value.trim()
                      const numericValue = rawValue === '' ? 0 : parseFormattedNumber(rawValue)
                      handleInputChange('newQuantity', numericValue)
                    }}
                    className={cn(
                      inputClass,
                      'mt-2 h-11 py-2 text-sm',
                      errors.newQuantity && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                    placeholder="0"
                  />
                  {errors.newQuantity && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newQuantity}</p>}
                </div>

                <div>
                  <Label className="text-zinc-700 dark:text-zinc-300">Razón del ajuste</Label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className={cn(
                      inputClass,
                      'mt-2 min-h-[4rem] resize-y py-2.5 text-sm',
                      errors.reason && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                    placeholder="Ej: Inventario físico, producto dañado, corrección de error... (opcional)"
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
                      {formData.reason.length > 0 ? `${formData.reason.length}/10 caracteres mínimo` : 'Campo opcional'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {formData.newQuantity !== getCurrentStock() && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Diferencia</span>
                <div className="flex items-center space-x-2">
                  {getStockDifference() > 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                  )}
                  <span
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      getStockDifference() > 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    )}
                  >
                    {getStockDifference() > 0 ? '+' : ''}
                    {formatNumber(getStockDifference())} unidades
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {getStockDifference() > 0 ? 'Incremento' : 'Reducción'} en {getLocationLabel(formData.location)}
              </p>
            </div>
          )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Ajustar stock
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
