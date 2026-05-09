'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  Shield, 
  Package, 
  Search, 
  AlertTriangle,
  CheckCircle,
  User,
  ClipboardList
} from 'lucide-react'
import { Warranty, Product, Client } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { ClientsService } from '@/lib/clients-service'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { cardShell as cardShellBase } from '@/lib/card-shell'

const warrantyInputClass =
  'w-full rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20'

const warrantyCardShell = cn(cardShellBase, 'shadow-none')

interface WarrantyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  warranty?: Warranty | null
}

const DEFAULT_CLIENT_NAME = 'Cliente sin factura'

const getProductStock = (product?: Product | null) => {
  if (!product || !product.stock) return 0
  const storeStock = Number((product.stock as any).store ?? (product.stock as any).local ?? 0)
  const warehouseStock = Number((product.stock as any).warehouse ?? 0)
  const totalStock = Number((product.stock as any).total ?? 0)
  const computed = storeStock + warehouseStock
  if (!Number.isNaN(totalStock) && totalStock > 0) {
    return totalStock
  }
  return computed
}

export function WarrantyModal({ isOpen, onClose, onSave, warranty }: WarrantyModalProps) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [defectiveSearch, setDefectiveSearch] = useState('')
  const [replacementSearch, setReplacementSearch] = useState('')
  const [defectiveResults, setDefectiveResults] = useState<Product[]>([])
  const [replacementResults, setReplacementResults] = useState<Product[]>([])
  const [defectiveLoading, setDefectiveLoading] = useState(false)
  const [replacementLoading, setReplacementLoading] = useState(false)

  const [selectedDefectiveProduct, setSelectedDefectiveProduct] = useState<Product | null>(null)
  const [selectedReplacementProduct, setSelectedReplacementProduct] = useState<Product | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  
  const [formData, setFormData] = useState({
    notes: '',
    quantityReceived: 1,
    quantityDelivered: 1
  })

  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas (ZonaT, Zonat, Corozal, Sahagun, etc.)
    const storeKeywords = ['casa artesanal', 'casaartesanal', 'corozal', 'sahagun', 'sincelejo']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  // Filtrar clientes para excluir tiendas
  const filteredClients = clients.filter(client => !isStoreClient(client))

  const selectedClient = selectedClientId ? clients.find(client => client.id === selectedClientId) || null : null

  useEffect(() => {
    if (!isOpen) return

    const loadClients = async () => {
      setClientsLoading(true)
      try {
        const data = await ClientsService.getAllClients()
        setClients(data)
      } finally {
        setClientsLoading(false)
      }
    }

    loadClients()

    if (warranty) {
      setSelectedDefectiveProduct(warranty.productReceived || null)
      setSelectedReplacementProduct(warranty.productDelivered || null)
      setSelectedClientId(warranty.clientId || '')
      setFormData({
        notes: warranty.notes || '',
        quantityReceived: 1,
        quantityDelivered: 1
      })
    } else {
      resetForm()
    }
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = 'unset'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warranty])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      if (defectiveSearch.trim().length < 2) {
        setDefectiveResults([])
        return
      }
      setDefectiveLoading(true)
      try {
        const results = await ProductsService.searchProducts(defectiveSearch.trim(), undefined, user?.storeId)
        setDefectiveResults(results.slice(0, 10))
      } catch (error) {
        setDefectiveResults([])
      } finally {
        setDefectiveLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(handler)
    }
  }, [defectiveSearch, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      if (replacementSearch.trim().length < 2) {
        setReplacementResults([])
        return
      }
      setReplacementLoading(true)
      try {
        const results = await ProductsService.searchProducts(replacementSearch.trim(), undefined, user?.storeId)
        setReplacementResults(results.slice(0, 10))
      } catch {
        setReplacementResults([])
      } finally {
        setReplacementLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(handler)
    }
  }, [replacementSearch, isOpen])

  const resetForm = () => {
    setErrors({})
    setDefectiveSearch('')
    setReplacementSearch('')
    setDefectiveResults([])
    setReplacementResults([])
    setSelectedDefectiveProduct(null)
    setSelectedReplacementProduct(null)
    setSelectedClientId('')
    setFormData({
      notes: '',
      quantityReceived: 1,
      quantityDelivered: 1
    })
  }
 
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSelectDefective = (product: Product) => {
    setSelectedDefectiveProduct(product)
    setDefectiveSearch('')
    setDefectiveResults([])
    // Reiniciar selección de reemplazo para evitar inconsistencias
    setSelectedReplacementProduct(null)
    setReplacementSearch('')
    setReplacementResults([])
    if (errors.product) {
      setErrors(prev => {
        const next = { ...prev }
        delete next.product
        return next
      })
    }
  }

  const handleSelectReplacement = async (product: Product) => {
    setReplacementSearch('')
      setReplacementResults([])

    try {
      const latest = await ProductsService.getProductById(product.id)
      const productWithLatestStock = latest || product
      setSelectedReplacementProduct(productWithLatestStock)

      if (errors.replacementProduct) {
        setErrors(prev => {
          const next = { ...prev }
          delete next.replacementProduct
          return next
        })
      }
    } catch (error) {
      setSelectedReplacementProduct(product)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedDefectiveProduct) {
      newErrors.product = 'Selecciona el producto defectuoso'
    }

    if (!selectedReplacementProduct) {
      newErrors.replacementProduct = 'Selecciona el producto de reemplazo'
    } else if (getProductStock(selectedReplacementProduct) <= 0) {
      newErrors.replacementProduct = 'El producto de reemplazo no tiene stock disponible'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !selectedDefectiveProduct) return

    setLoading(true)
    try {
      let replacementProductSnapshot = selectedReplacementProduct

      if (selectedReplacementProduct) {
        const latest = await ProductsService.getProductById(selectedReplacementProduct.id)
        replacementProductSnapshot = latest || selectedReplacementProduct
        if (latest) {
          setSelectedReplacementProduct(latest)
        }

        if (getProductStock(replacementProductSnapshot) <= 0) {
          setErrors(prev => ({
            ...prev,
            replacementProduct: 'El producto seleccionado no tiene stock disponible para entregar.'
          }))
          setLoading(false)
          return
        }
      }

      const resolvedClientName = selectedClient?.name || warranty?.clientName || DEFAULT_CLIENT_NAME

      const warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'> & { replacementQuantity?: number, productReceivedReference?: string, productReceivedPrice?: number, productDeliveredReference?: string, productDeliveredPrice?: number } = {
        originalSaleId: null,
        clientId: selectedClientId || null,
        clientName: resolvedClientName,
        productReceivedId: selectedDefectiveProduct.id,
        productReceivedName: selectedDefectiveProduct.name,
        productReceivedSerial: undefined,
        productDeliveredId: replacementProductSnapshot?.id,
        productDeliveredName: replacementProductSnapshot?.name,
        reason: 'Garantía por producto',
        notes: formData.notes,
        status: 'completed',
        replacementQuantity: formData.quantityDelivered,
        quantityReceived: formData.quantityReceived,
        // Pasar referencias y precios directamente desde los productos seleccionados
        productReceivedReference: selectedDefectiveProduct.reference || undefined,
        productReceivedPrice: selectedDefectiveProduct.price || undefined,
        productDeliveredReference: replacementProductSnapshot?.reference || undefined,
        productDeliveredPrice: replacementProductSnapshot?.price || undefined
      }

      await onSave(warrantyData)
      handleClose()
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        replacementProduct: 'No se pudo verificar el stock del producto de reemplazo. Intenta nuevamente.'
      }))
      setLoading(false)
      return
    }

    setLoading(false)
  }

  if (!isOpen) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm dark:bg-black/60 sm:p-6 sm:py-10 lg:px-12 xl:left-56"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="flex max-h-[min(88dvh,880px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/45 via-white to-zinc-50 shadow-xl dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950 sm:max-h-[min(94vh,900px)] sm:max-w-2xl lg:max-w-5xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
          <div className="flex items-center justify-between gap-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/95 via-white to-violet-50/65 px-4 py-3.5 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/25 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 dark:border-indigo-700/50 dark:bg-indigo-950/50">
                <Shield className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                  {warranty ? 'Editar garantía' : 'Nueva garantía'}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Registra una garantía entregando un producto en reemplazo.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 touch-manipulation rounded-lg border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:translate-y-0 hover:bg-zinc-100 hover:shadow-none hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

        <div className="p-3 sm:p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-3">
            <Card className={cn(warrantyCardShell)}>
              <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
                    <Package className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    Producto defectuoso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
                {!selectedDefectiveProduct ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                      <input
                        type="text"
                        placeholder="Buscar producto defectuoso..."
                        value={defectiveSearch}
                        onChange={(e) => setDefectiveSearch(e.target.value)}
                        className={cn(warrantyInputClass, 'h-10 pl-9 pr-3')}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Busca el producto que el cliente está devolviendo. Se registrará como defectuoso.
                    </p>
                    {defectiveLoading && (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400"></div>
                        Buscando productos...
                      </div>
                    )}
                    {!defectiveLoading && defectiveResults.length > 0 && (
                      <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-hide">
                        {defectiveResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleSelectDefective(product)}
                            className="w-full rounded-lg border border-zinc-200/90 p-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                          >
                              <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {product.name}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              Ref: {product.reference || 'N/A'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.product && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.product}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {selectedDefectiveProduct.name}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          Ref: {selectedDefectiveProduct.reference || 'N/A'}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDefectiveProduct(null)
                          setDefectiveResults([])
                        }}
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <CheckCircle className="h-3 w-3 shrink-0 text-zinc-500" />
                      Producto defectuoso seleccionado
                    </p>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Cantidad recibida
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantityReceived}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          setFormData(prev => ({ ...prev, quantityReceived: Math.max(1, value) }))
                        }}
                        className={cn(warrantyInputClass, 'h-10 px-2.5')}
                      />
                      {errors.quantityReceived && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.quantityReceived}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={cn(warrantyCardShell)}>
              <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
                    <Package className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    Producto de reemplazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
                {!selectedDefectiveProduct ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
                    Primero selecciona el producto defectuoso para elegir un reemplazo.
                  </div>
                ) : !selectedReplacementProduct ? (
                  <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                          <input
                            type="text"
                            placeholder="Buscar producto de reemplazo..."
                        value={replacementSearch}
                        onChange={(e) => setReplacementSearch(e.target.value)}
                        className={cn(warrantyInputClass, 'h-10 pl-9 pr-3')}
                          />
                        </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Selecciona el producto que entregarás al cliente.
                    </p>
                    {replacementLoading && (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400"></div>
                        Buscando productos...
                        </div>
                        )}
                    {!replacementLoading && replacementResults.length > 0 && (
                          <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-hide">
                        {replacementResults.map((product) => {
                          const stock = getProductStock(product)
                          const hasStock = stock > 0
                          return (
                            <button
                                key={product.id}
                              onClick={() => void handleSelectReplacement(product)}
                              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                hasStock
                                  ? 'border-zinc-200/90 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'
                                  : 'cursor-not-allowed border-red-200/90 bg-red-50/80 opacity-60 dark:border-red-900/50 dark:bg-red-950/30'
                              }`}
                              disabled={!hasStock}
                              >
                                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {product.name}
                                </div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                Ref: {product.reference || 'N/A'}
                                </div>
                              <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                                Stock disponible: {stock} unidades
                                </div>
                              {!hasStock && (
                                <div className="text-xs text-red-600 dark:text-red-300 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sin stock para entregar
                                </div>
                              )}
                            </button>
                          )
                        })}
                          </div>
                        )}
                    {errors.replacementProduct && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                        {errors.replacementProduct}
                              </p>
                            )}
                  </>
                ) : (
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {selectedReplacementProduct.name}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          Ref: {selectedReplacementProduct.reference || 'N/A'}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          <CheckCircle className="h-3 w-3 shrink-0 text-zinc-500" />
                          Stock disponible: {getProductStock(selectedReplacementProduct)} unidades
                        </div>
                      </div>
                        <Button
                          onClick={() => setSelectedReplacementProduct(null)}
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Cantidad a entregar
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={getProductStock(selectedReplacementProduct)}
                        value={formData.quantityDelivered}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          const maxStock = getProductStock(selectedReplacementProduct)
                          setFormData(prev => ({ ...prev, quantityDelivered: Math.max(1, Math.min(maxStock, value)) }))
                        }}
                        className={cn(warrantyInputClass, 'h-10 px-2.5')}
                      />
                      {errors.quantityDelivered && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.quantityDelivered}
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Se descontarán {formData.quantityDelivered} unidad{formData.quantityDelivered !== 1 ? 'es' : ''} del stock.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            <div className="space-y-3">
            <Card className={cn(warrantyCardShell)}>
              <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
                    <User className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                    Información del cliente
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Seleccionar cliente (opcional)
                  </label>
                  {clientsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400"></div>
                      Cargando clientes...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedClientId}
                        onChange={(e) => handleSelectClient(e.target.value)}
                        className={cn(warrantyInputClass, 'h-11 px-3')}
                      >
                        <option value="">Selecciona un cliente...</option>
                        {filteredClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}{client.email ? ` - ${client.email}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedClientId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectClient('')}
                          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Puedes seleccionar un cliente existente o escribir un nombre personalizado.
                  </p>
                </div>

                {selectedClient && (
                  <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{selectedClient.name}</div>
                    {selectedClient.email && <div>{selectedClient.email}</div>}
                    {selectedClient.phone && <div>{selectedClient.phone}</div>}
                    {selectedClient.document && <div>Doc: {selectedClient.document}</div>}
                  </div>
                )}
                 </CardContent>
               </Card>

              <Card className={cn(warrantyCardShell)}>
                <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-zinc-100">
                    <ClipboardList className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                    Notas adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales sobre la garantía..."
                    rows={3}
                    className={cn(warrantyInputClass, 'resize-none px-3 py-2.5')}
                  />
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 border-t border-indigo-100/80 bg-white/95 px-3 pb-3 pt-4 backdrop-blur-sm dark:border-indigo-900/40 dark:bg-zinc-950/95 sm:gap-2.5 sm:px-5"
          style={{
            paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))'
          }}
        >
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="h-9 w-full flex-1 touch-manipulation border border-zinc-300 bg-white text-sm font-medium text-zinc-700 shadow-none hover:translate-y-0 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            size="sm"
            className="h-9 w-full flex-1 touch-manipulation bg-brand-700 text-sm font-medium text-white shadow-none hover:translate-y-0 hover:bg-brand-800 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto sm:flex-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                Guardando…
              </span>
            ) : (
              warranty ? 'Guardar cambios' : 'Registrar garantía'
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

