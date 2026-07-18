'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X,
  Plus,
  Trash2,
  Package,
  Store as StoreIcon,
  Truck,
  AlertTriangle,
  Search,
  CheckCircle,
  CreditCard,
} from 'lucide-react'
import { Store, Product, TransferItem } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

/** Light: borde claro. Dark: sin caja “doble”, solo salto de tono (menos líneas). */
const panelInner =
  'rounded-xl border border-zinc-200 bg-zinc-50 dark:border-0 dark:bg-zinc-900'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-0 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:ring-1 dark:ring-inset dark:ring-white/10 dark:focus:ring-2 dark:focus:ring-brand-500/35 dark:focus:ring-inset'

const selectTriggerClass =
  'h-10 rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-3 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/30 dark:border-0 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-1 dark:ring-inset dark:ring-white/10 dark:focus:ring-2 dark:focus:ring-brand-500/35 dark:focus:ring-inset'

/** Tarjeta por producto: en dark sin marco, bloque ligeramente más claro */
const itemCardClass =
  'rounded-xl border border-zinc-200 bg-white p-3 dark:border-0 dark:bg-zinc-800/50'

const overlayClass =
  'casa-artesanal-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/25 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px] dark:bg-black/40 xl:left-60'

const shellClass =
  'flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-[min(1200px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 !bg-white shadow-2xl dark:border dark:border-white/[0.08] dark:!bg-zinc-950 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]'

/** Por encima del overlay del modal (z-[100]); si no, el listado del Select queda invisible detrás. */
const selectContentModalZ = 'z-[200]'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  stores: Store[]
  fromStoreId?: string
  /** request: la tienda destino solicita; send: el origen envía (comportamiento anterior) */
  mode?: 'request' | 'send'
  /** En modo request, tienda que solicita (destino fijo) */
  requestingStoreId?: string
}

interface TransferItemForm {
  rowId: string
  productId: string
  productName: string
  productReference: string
  fromLocation: 'warehouse' | 'store' | 'both'
  quantity: number
  unitPrice: number // Precio de venta por unidad
  productCost: number // Costo del producto (solo lectura, como referencia)
}

function newTransferRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function TransferModal({
  isOpen,
  onClose,
  onSave,
  stores,
  fromStoreId,
  mode = 'send',
  requestingStoreId,
}: TransferModalProps) {
  const { user } = useAuth()
  const isRequest = mode === 'request'
  /** Tienda desde la que sale el stock (admin puede elegir cualquier tienda activa). */
  const [originStoreId, setOriginStoreId] = useState<string>(fromStoreId || MAIN_STORE_ID)
  const [toStoreId, setToStoreId] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [items, setItems] = useState<TransferItemForm[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalProductSearch, setGlobalProductSearch] = useState<string>('')
  const [stockAlerts, setStockAlerts] = useState<Record<number, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'mixed'>('transfer')
  const [cashAmount, setCashAmount] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])
  const [paymentError, setPaymentError] = useState<string>('')
  const [showStoreError, setShowStoreError] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const defaultOrigin = (fromStoreId && fromStoreId.trim()) || MAIN_STORE_ID
    setOriginStoreId(defaultOrigin)
    setItems([])
    setToStoreId(isRequest && requestingStoreId ? requestingStoreId : '')
    setDescription('')
    setGlobalProductSearch('')
    setStockAlerts({})
    setPaymentMethod('transfer')
    setCashAmount('')
    setShowStoreError(false)
    setTransferAmount('')
    setPaymentError('')
  }, [isOpen, fromStoreId, isRequest, requestingStoreId])

  useEffect(() => {
    if (!isOpen || !originStoreId) return
    void loadAvailableProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, originStoreId])

  const loadAvailableProducts = async () => {
    if (!originStoreId) {
      console.error('[TRANSFER MODAL] No originStoreId provided')
      return
    }

    setLoadingProducts(true)
    try {
      // IMPORTANTE: stock según tienda origen
      const allProducts = await ProductsService.getAllProductsLegacy(originStoreId)
      
      console.log('[TRANSFER MODAL] Loaded products:', allProducts.length)
      if (allProducts.length > 0) {
        const firstProduct = allProducts[0]
        console.log('[TRANSFER MODAL] First product stock:', {
          id: firstProduct.id,
          name: firstProduct.name,
          stock: firstProduct.stock
        })
      }
      
      // Cargar TODOS los productos, no solo los que tienen stock
      // El usuario puede buscar cualquier producto, incluso si no tiene stock
      setAvailableProducts(allProducts)
    } catch (error) {
      console.error('[TRANSFER MODAL] Error loading products:', error)
      toast.error('Error al cargar productos disponibles')
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleAddItem = () => {
    // Verificar si ya hay un item vacío
    const hasEmptyItem = items.some(item => !item.productId || item.quantity === 0)
    if (hasEmptyItem) {
      toast.info('Completa el producto actual antes de agregar otro')
      return
    }
    setItems([
      ...items,
      {
        rowId: newTransferRowId(),
        productId: '',
        productName: '',
        productReference: '',
        fromLocation: 'store',
        quantity: 0,
        unitPrice: 0,
        productCost: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSelectProductFromSearch = (product: Product) => {
    // Verificar si el producto ya está en la lista
    if (items.some(item => item.productId === product.id)) {
      toast.info('Este producto ya está en la lista')
      return
    }

    // Agregar el producto a la lista
    setItems([
      ...items,
      {
        rowId: newTransferRowId(),
        productId: product.id,
        productName: product.name || '',
        productReference: product.reference || '',
        fromLocation: 'store',
        quantity: 0,
        unitPrice: 0,
        productCost: 0,
      },
    ])

    // Limpiar el buscador global
    setGlobalProductSearch('')
  }

  const handleItemChange = (index: number, field: keyof TransferItemForm, value: string | number) => {
    const newItems = [...items]
    if (field === 'productId') {
      const product = availableProducts.find(p => p.id === value)
      newItems[index] = {
        ...newItems[index],
        productId: value as string,
        productName: product?.name || '',
        productReference: product?.reference || '',
        fromLocation: 'store',
        quantity: newItems[index].quantity,
        unitPrice: 0,
        productCost: 0,
      }
      // Limpiar alerta cuando cambia el producto
      setStockAlerts(prev => {
        const newAlerts = { ...prev }
        delete newAlerts[index]
        return newAlerts
      })
    } else if (field === 'fromLocation') {
      newItems[index] = { ...newItems[index], fromLocation: value as 'warehouse' | 'store' | 'both' }
      // Limpiar alerta cuando cambia la ubicación
      setStockAlerts(prev => {
        const newAlerts = { ...prev }
        delete newAlerts[index]
        return newAlerts
      })
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const handleSave = async () => {
    if (!originStoreId || !toStoreId) {
      setShowStoreError(true)
      return
    }
    if (originStoreId === toStoreId) {
      toast.error('La tienda origen y destino deben ser distintas')
      return
    }

    // Filtrar solo los items completos para validar
    const completeItems = items.filter(item => item.productId && item.quantity > 0)
    
    if (completeItems.length === 0) {
      toast.error('Debes agregar al menos un producto con cantidad válida')
      return
    }

    // Validar que todos los items completos tengan stock suficiente y precio
    for (const item of completeItems) {

      const product = availableProducts.find(p => p.id === item.productId)
      if (!product) {
        toast.error(`Producto no encontrado: ${item.productName}`)
        return
      }

      const st = product.stock?.store || 0
      // Origen fijo: solo Local (bodega no se usa en traslados)
      const availableStock = st

      if (item.quantity > availableStock) {
        toast.error(
          `No hay suficiente stock (Local) para ${item.productName}. Disponible: ${availableStock}`
        )
        return
      }
    }

    // Validar método de pago (solo en envío directo; en solicitud se cobra al aprobar)
    const total = calculateTotal()
    if (!isRequest && paymentMethod === 'mixed') {
      const cashValue = parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0
      const transferValue = parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0
      const totalMixed = cashValue + transferValue
      
      if (cashValue <= 0 || transferValue <= 0) {
        toast.error('Debes ingresar montos válidos para ambos métodos de pago')
        setPaymentError('Debes ingresar montos válidos para ambos métodos de pago')
        setIsSaving(false)
        return
      }
      
      if (Math.abs(totalMixed - total) > 1) { // Permitir diferencia de 1 peso por redondeo
        const difference = total - totalMixed
        if (difference > 0) {
          toast.error(`Faltan ${formatCurrency(difference)} para completar el total`)
          setPaymentError(`Faltan ${formatCurrency(difference)} para completar el total`)
        } else {
          toast.error(`Sobran ${formatCurrency(Math.abs(difference))} del total`)
          setPaymentError(`Sobran ${formatCurrency(Math.abs(difference))} del total`)
        }
        setIsSaving(false)
        return
      }
      setPaymentError('')
    }

    setIsSaving(true)
    try {
      // Filtrar solo los items completos (con producto y cantidad > 0)
      const completeItems = items.filter(item => item.productId && item.quantity > 0)
      
      if (completeItems.length === 0) {
        toast.error('Debes agregar al menos un producto con cantidad válida')
        setIsSaving(false)
        return
      }

      const transferItems = completeItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productReference: item.productReference,
        quantity: item.quantity,
        fromLocation: 'store' as const,
        unitPrice: 0,
      }))

      // Preparar información de pago
      const paymentTotal = calculateTotal()
      const paymentInfo = {
        method: paymentMethod as 'cash' | 'transfer' | 'mixed',
        cashAmount: paymentMethod === 'mixed' ? (parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0) : (paymentMethod === 'cash' ? paymentTotal : 0),
        transferAmount: paymentMethod === 'mixed' ? (parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0) : (paymentMethod === 'transfer' ? paymentTotal : 0)
      }

      const destId = isRequest ? (requestingStoreId || toStoreId) : toStoreId
      if (!destId) {
        setShowStoreError(true)
        toast.error('Debes seleccionar la tienda destino')
        setIsSaving(false)
        return
      }

      const transfer = isRequest
        ? await StoreStockTransferService.createTransferRequest(
            originStoreId,
            destId,
            transferItems,
            description || undefined,
            undefined,
            user?.id,
            user?.name
          )
        : await StoreStockTransferService.createTransfer(
            originStoreId,
            destId,
            transferItems,
            description || undefined,
            undefined,
            user?.id,
            user?.name,
            paymentInfo
          )

      if (transfer) {
        toast.success(
          isRequest
            ? 'Solicitud enviada. La tienda origen debe aprobar cada referencia.'
            : 'Traslado creado exitosamente'
        )
        setItems([])
        setCollapsedRowIds(new Set())
        setToStoreId(isRequest && requestingStoreId ? requestingStoreId : '')
        setDescription('')
        setStockAlerts({})
        setPaymentMethod('transfer')
        setCashAmount('')
        setTransferAmount('')
        setPaymentError('')
        await loadAvailableProducts() // Recargar productos para actualizar stock
        onClose() // Cerrar el modal primero
        // Luego recargar las transferencias
        setTimeout(() => {
          onSave() // Esto debería recargar las transferencias
        }, 100)
      } else {
        toast.error(
          isRequest
            ? 'Error al crear la solicitud. Verifica stock disponible en la tienda origen.'
            : 'Error al crear la transferencia. Verifica que haya stock disponible.'
        )
      }
    } catch (error) {
      toast.error(isRequest ? 'Error al crear la solicitud' : 'Error al crear la transferencia')
      console.error('Error creating transfer:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getAvailableQuantity = (productId: string, location: 'warehouse' | 'store'): number => {
    const product = availableProducts.find(p => p.id === productId)
    if (!product) return 0
    return location === 'warehouse' 
      ? (product.stock?.warehouse || 0)
      : (product.stock?.store || 0)
  }

  const getUsedQuantity = (productId: string, location: 'warehouse' | 'store'): number => {
    return items
      .filter(item => item.productId === productId && item.fromLocation === location)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  /** Uso en otras líneas del mismo producto y ubicación (excluye la línea actual). */
  const getUsedQuantityExcluding = (
    productId: string,
    location: 'warehouse' | 'store',
    excludeIndex: number
  ): number => {
    return items
      .filter(
        (it, i) =>
          i !== excludeIndex && it.productId === productId && it.fromLocation === location
      )
      .reduce((sum, it) => sum + it.quantity, 0)
  }

  const formatNumber = (value: number): string => {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Calcular total de la transferencia
  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
  }

  if (!isOpen) return null

  const originStores = stores.filter(
    (s) => s.isActive && (!isRequest || s.id !== (requestingStoreId || toStoreId))
  )
  const destinationStores = stores.filter(s => s.id !== originStoreId && s.isActive)

  const modal = (
    <div className={overlayClass} data-modal-backdrop>
      <div
        className={shellClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        data-transfer-modal-shell
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200 !bg-zinc-50 px-4 py-3 dark:border-white/[0.06] dark:!bg-zinc-950">
          <div className="flex min-w-0 items-center gap-2.5">
            <Truck className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            <h2 id="transfer-modal-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {isRequest ? 'Solicitar traslado' : 'Nuevo Traslado'}
            </h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto !bg-white p-4 dark:!bg-zinc-950">
          <div className="space-y-4 dark:space-y-6">
            {/* Tienda Destino y Descripción en una fila */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                  Tienda origen (stock que sale) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={originStoreId}
                  onValueChange={(value) => {
                    setOriginStoreId(value)
                    setToStoreId((prev) => (prev === value ? '' : prev))
                    setItems([])
                    setCollapsedRowIds(new Set())
                    setStockAlerts({})
                    setShowStoreError(false)
                  }}
                >
                  <SelectTrigger className={cn('w-full border', selectTriggerClass)}>
                    <SelectValue placeholder="Seleccionar tienda origen" />
                  </SelectTrigger>
                  <SelectContent className={selectContentModalZ}>
                    {originStores.map((store) => (
                      <SelectItem key={store.id} value={store.id} className="text-sm">
                        {store.name} {store.city && `- ${store.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                  Tienda destino <span className="text-red-500">*</span>
                </Label>
                {isRequest ? (
                  <Input
                    type="text"
                    readOnly
                    disabled
                    value={stores.find((s) => s.id === (requestingStoreId || toStoreId))?.name || 'Tu tienda'}
                    className={cn(inputClass, 'h-10 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900')}
                  />
                ) : (
                <Select value={toStoreId} onValueChange={(value) => { setToStoreId(value); setShowStoreError(false); }}>
                  <SelectTrigger className={cn('w-full border', selectTriggerClass)}>
                    <SelectValue placeholder="Seleccionar tienda destino" />
                  </SelectTrigger>
                  <SelectContent className={selectContentModalZ}>
                    {destinationStores.map(store => (
                      <SelectItem key={store.id} value={store.id} className="text-sm">
                        {store.name} {store.city && `- ${store.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}
                {!isRequest && destinationStores.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {stores.filter(s => s.isActive).length <= 1
                      ? 'Para enviar a otra sede necesitas al menos dos tiendas activas. La tienda desde la que envías no puede ser destino.'
                      : 'No hay otras tiendas activas disponibles como destino (ya se excluye la tienda de origen). Revisa que existan tiendas activas en Configuración.'}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                Descripción (Opcional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Envío mensual"
                className={cn(inputClass, 'h-10 py-2 text-sm')}
              />
            </div>

            {/* Productos — en dark sin caja exterior extra (menos “marcos” anidados) */}
            <div className={cn('p-4', panelInner, 'dark:!bg-transparent dark:p-0')}>
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Productos a Transferir
                </h3>
              </div>
              <div className="space-y-4">
                {/* Buscador global - siempre visible */}
                <div>
                  <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                    Buscar Producto para Agregar
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por referencia o nombre..."
                      value={globalProductSearch}
                      onChange={(e) => setGlobalProductSearch(e.target.value)}
                      className={cn(inputClass, 'h-10 py-2 pl-10 pr-3 text-sm')}
                      disabled={loadingProducts}
                    />
                    {loadingProducts && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-b-zinc-600 dark:border-zinc-700 dark:border-b-zinc-300" />
                      </div>
                    )}
                  </div>
                  
                  {/* Resultados de búsqueda */}
                  {globalProductSearch && !loadingProducts && (
                    <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white dark:border-0 dark:bg-zinc-900">
                          {availableProducts
                            .filter(p => {
                              // Filtrar productos ya seleccionados
                              if (items.some(item => item.productId === p.id)) {
                                return false
                              }
                              // Filtrar por término de búsqueda
                              const searchTerm = (globalProductSearch?.trim() || '').toLowerCase()
                              if (searchTerm) {
                                // Buscar en referencia (sin espacios, sin caracteres especiales)
                                const cleanReference = (p.reference || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                                const cleanSearchTerm = searchTerm.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                                const matchesReference = cleanReference.includes(cleanSearchTerm) || (p.reference || '').toLowerCase().includes(searchTerm)
                                
                                // Buscar en nombre
                                const matchesName = (p.name || '').toLowerCase().includes(searchTerm)
                                
                                return matchesReference || matchesName
                              }
                              return false
                            })
                            .map(product => {
                              const warehouseStock = product.stock?.warehouse || 0
                              const storeStock = product.stock?.store || 0
                              const totalStock = warehouseStock + storeStock
                              const hasStock = totalStock > 0
                              
                              return (
                                <div
                                  key={product.id}
                                  className={cn(
                                    'flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 transition-colors last:border-b-0 dark:border-b dark:border-white/[0.05]',
                                    !hasStock && 'opacity-60'
                                  )}
                                >
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <span
                                      className={cn(
                                        'font-medium',
                                        hasStock ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
                                      )}
                                    >
                                      {product.name}
                                    </span>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Ref: {product.reference}</span>
                                      <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
                                      <span
                                        className={cn(
                                          'text-xs',
                                          hasStock ? 'text-zinc-600 dark:text-zinc-300' : 'text-red-500 dark:text-red-400'
                                        )}
                                      >
                                        Bodega: {formatNumber(warehouseStock)} | Local: {formatNumber(storeStock)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => handleSelectProductFromSearch(product)}
                                    size="sm"
                                    className="h-auto flex-shrink-0 px-3 py-1.5 text-xs"
                                    disabled={!hasStock}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Agregar
                                  </Button>
                                </div>
                              )
                            })}
                          {availableProducts.filter(p => {
                            if (items.some(item => item.productId === p.id)) return false
                            const searchTerm = (globalProductSearch?.trim() || '').toLowerCase()
                            if (searchTerm) {
                              const cleanReference = (p.reference || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                              const cleanSearchTerm = searchTerm.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                              const matchesReference = cleanReference.includes(cleanSearchTerm) || (p.reference || '').toLowerCase().includes(searchTerm)
                              const matchesName = (p.name || '').toLowerCase().includes(searchTerm)
                              return matchesReference || matchesName
                            }
                            return false
                          }).length === 0 && (
                            <div className="px-4 py-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
                              No se encontraron productos con "{globalProductSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lista de productos agregados */}
                    {items.length > 0 && (
                      <div className="space-y-3">
                    {[...items].reverse().map((item, originalIndex) => {
                      // Calcular el índice original para mantener las referencias correctas
                      const index = items.length - 1 - originalIndex
                      const product = availableProducts.find(p => p.id === item.productId)
                      const storeStock = product ? (product.stock?.store || 0) : 0
                      const usedStoreExcl = item.productId
                        ? getUsedQuantityExcluding(item.productId, 'store', index)
                        : 0
                      const remainingStore = storeStock - usedStoreExcl
                      const availableQty = remainingStore
                      const isComplete = item.quantity > 0 && item.productId

                      return (
                        <div key={item.rowId} className={itemCardClass}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            {/* Producto */}
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {isComplete ? (
                                <CheckCircle className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                              ) : (
                                <Package className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
                              )}
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                  {item.productName || 'Seleccionar producto'}
                                </div>
                                {item.productReference && (
                                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    Ref: {item.productReference}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Stock Local */}
                            {item.productId && (
                              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-0 dark:bg-zinc-950/60">
                                <StoreIcon
                                  className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                                  strokeWidth={1.5}
                                />
                                <div className="leading-tight">
                                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">Local</div>
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Disp. {formatNumber(remainingStore)} / {formatNumber(storeStock)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cantidad */}
                            {item.productId && (
                              <div className="w-full shrink-0 sm:w-28">
                                <Label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                                  Cantidad
                                </Label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d]/g, '')
                                    const qty = value === '' ? 0 : parseInt(value, 10)

                                    if (qty > availableQty) {
                                      setStockAlerts(prev => ({
                                        ...prev,
                                        [index]: `Stock insuficiente. Disponible: ${formatNumber(availableQty)}`
                                      }))
                                    } else {
                                      setStockAlerts(prev => {
                                        const newAlerts = { ...prev }
                                        delete newAlerts[index]
                                        return newAlerts
                                      })
                                    }

                                    handleItemChange(index, 'quantity', qty)
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.replace(/^0+/, '') || '0'
                                    const qty = parseInt(value, 10) || 0
                                    if (qty !== item.quantity) {
                                      handleItemChange(index, 'quantity', qty)
                                    }
                                  }}
                                  disabled={availableQty <= 0}
                                  className={cn(
                                    inputClass,
                                    'h-10 py-2 text-center text-sm disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                  )}
                                  placeholder="0"
                                />
                                {stockAlerts[index] ? (
                                  <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span className="leading-tight">{stockAlerts[index]}</span>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Máx {formatNumber(availableQty)}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Eliminar */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 shrink-0 self-start text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 sm:self-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                      </div>
                    )}
                  </div>
              </div>

            {/* Método de Pago (solo envío directo; en solicitud se define al aprobar) */}
            {!isRequest && items.length > 0 && calculateTotal() > 0 && (
              <div className={cn('p-4', panelInner, 'dark:!bg-transparent dark:p-0')}>
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Método de Pago
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                      Método de Pago <span className="text-red-500">*</span>
                    </Label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'transfer' | 'mixed') => {
                      setPaymentMethod(value)
                      setPaymentError('')
                      if (value !== 'mixed') {
                        setCashAmount('')
                        setTransferAmount('')
                      }
                    }}>
                      <SelectTrigger className={cn('w-full border', selectTriggerClass)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectContentModalZ}>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="mixed">Mixto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos para pago mixto */}
                  {paymentMethod === 'mixed' && (
                    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-0 dark:bg-zinc-900">
                      <div>
                        <Label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Efectivo
                        </Label>
                        <Input
                          type="text"
                          value={cashAmount ? parseFloat(cashAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '')
                            setCashAmount(value)
                            setPaymentError('')
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className={cn(inputClass, 'h-10 py-2 text-sm')}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Transferencia
                        </Label>
                        <Input
                          type="text"
                          value={transferAmount ? parseFloat(transferAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '')
                            setTransferAmount(value)
                            setPaymentError('')
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className={cn(inputClass, 'h-10 py-2 text-sm')}
                        />
                      </div>
                      <div className="border-t border-zinc-200 pt-2 dark:border-white/[0.06]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Total ingresado:</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatCurrency((parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0) + (parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0))}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Total requerido:</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(calculateTotal())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                      {paymentError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen compacto */}
            {items.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-0 dark:bg-zinc-900">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Productos</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{items.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Total Unidades</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Destino</div>
                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {stores.find(s => s.id === toStoreId)?.name || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col gap-3 border-t border-zinc-200 !bg-zinc-50 p-4 dark:border-white/[0.06] dark:!bg-zinc-950">
          {/* Alerta si no hay tienda seleccionada (solo mostrar después de intentar guardar) */}
          {showStoreError && !toStoreId && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Debes seleccionar una tienda destino para crear la transferencia
              </span>
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
                  {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  {isRequest ? 'Enviando…' : 'Creando...'}
                </span>
              ) : (
                <>
                  <Truck className="h-4 w-4" strokeWidth={1.5} />
                  {isRequest ? 'Enviar solicitud' : 'Crear Traslado'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
