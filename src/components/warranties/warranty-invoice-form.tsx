'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Package,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { Product, Sale, SaleItem } from '@/types'
import { SalesService } from '@/lib/sales-service'
import { ProductsService } from '@/lib/products-service'
import type { CreateWarrantyInput } from '@/lib/warranty-service'
import {
  formatWarrantyMoney,
  getSaleItemLineTotal,
  saleItemToReceivedLine,
  sumWarrantyLineTotals,
  totalsMatchSale,
  type WarrantyLineInput,
} from '@/lib/warranty-lines'
import { CopIntegerInput } from '@/components/sales/cop-integer-input'
import { cn } from '@/lib/utils'
import { cardShell as cardShellBase } from '@/lib/card-shell'

const warrantyInputClass =
  'w-full rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20'

const warrantyCardShell = cn(cardShellBase, 'shadow-none')

type DeliveredDraft = WarrantyLineInput & { key: string }

function getProductStock(product?: Product | null): number {
  if (!product?.stock) return 0
  const storeStock = Number((product.stock as { store?: number; local?: number }).store ?? (product.stock as { local?: number }).local ?? 0)
  const warehouseStock = Number((product.stock as { warehouse?: number }).warehouse ?? 0)
  const totalStock = Number((product.stock as { total?: number }).total ?? 0)
  const computed = storeStock + warehouseStock
  return totalStock > 0 ? totalStock : computed
}

function saleItemToDeliveredLine(item: SaleItem): DeliveredDraft {
  const unitPrice = item.quantity > 0 ? Math.round(getSaleItemLineTotal(item) / item.quantity) : item.unitPrice
  return {
    key: `sale-${item.id}`,
    productId: item.productId,
    productName: item.productName || 'Producto',
    productReference: item.productReferenceCode,
    quantity: item.quantity,
    unitPrice,
    lineTotal: getSaleItemLineTotal(item),
    saleItemId: item.id,
    role: 'delivered',
  }
}

function productToDeliveredLine(product: Product): DeliveredDraft {
  const unitPrice = product.price || 0
  return {
    key: `product-${product.id}-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    productReference: product.reference,
    quantity: 1,
    unitPrice,
    lineTotal: unitPrice,
    role: 'delivered',
  }
}

interface WarrantyInvoiceFormProps {
  onSave: (data: CreateWarrantyInput) => Promise<void>
  onCancel: () => void
}

export function WarrantyInvoiceForm({ onSave, onCancel }: WarrantyInvoiceFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceResults, setInvoiceResults] = useState<Sale[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [receivedItemIds, setReceivedItemIds] = useState<Set<string>>(new Set())
  const [deliveredLines, setDeliveredLines] = useState<DeliveredDraft[]>([])
  const [replacementSearch, setReplacementSearch] = useState('')
  const [replacementResults, setReplacementResults] = useState<Product[]>([])
  const [replacementLoading, setReplacementLoading] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!invoiceSearch.trim() || invoiceSearch.trim().length < 2) {
      setInvoiceResults([])
      return
    }
    const timer = setTimeout(async () => {
      setInvoiceLoading(true)
      try {
        const results = await SalesService.searchSalesForWarranty(invoiceSearch.trim())
        setInvoiceResults(results.slice(0, 12))
      } finally {
        setInvoiceLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [invoiceSearch])

  useEffect(() => {
    if (!replacementSearch.trim() || replacementSearch.trim().length < 2) {
      setReplacementResults([])
      return
    }
    const timer = setTimeout(async () => {
      setReplacementLoading(true)
      try {
        const results = await ProductsService.searchProducts(replacementSearch.trim())
        setReplacementResults(results.slice(0, 12))
      } finally {
        setReplacementLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [replacementSearch])

  const receivedLines = useMemo(() => {
    if (!selectedSale?.items) return []
    return selectedSale.items
      .filter((item) => receivedItemIds.has(item.id))
      .map((item) => saleItemToReceivedLine(item))
  }, [selectedSale, receivedItemIds])

  const deliveredTotal = useMemo(() => sumWarrantyLineTotals(deliveredLines), [deliveredLines])
  const saleTotal = selectedSale?.total ?? 0
  const totalsOk = selectedSale ? totalsMatchSale(deliveredTotal, selectedSale) : false
  const remaining = saleTotal - deliveredTotal

  const selectSale = (sale: Sale) => {
    setSelectedSale(sale)
    setInvoiceSearch(sale.invoiceNumber || '')
    setInvoiceResults([])
    setReceivedItemIds(new Set(sale.items?.map((item) => item.id) || []))
    setDeliveredLines((sale.items || []).map(saleItemToDeliveredLine))
    setErrors({})
  }

  const toggleReceivedItem = (itemId: string) => {
    setReceivedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const updateDeliveredLine = (key: string, patch: Partial<DeliveredDraft>) => {
    setDeliveredLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const next = { ...line, ...patch }
        next.lineTotal = Math.round((next.unitPrice || 0) * Math.max(1, next.quantity || 1))
        return next
      })
    )
  }

  const removeDeliveredLine = (key: string) => {
    setDeliveredLines((prev) => prev.filter((line) => line.key !== key))
  }

  const addDeliveredProduct = async (product: Product) => {
    const latest = (await ProductsService.getProductById(product.id)) || product
    if (getProductStock(latest) <= 0) {
      setErrors((prev) => ({ ...prev, delivered: 'El producto no tiene stock disponible' }))
      return
    }
    setDeliveredLines((prev) => [...prev, productToDeliveredLine(latest)])
    setReplacementSearch('')
    setReplacementResults([])
    setErrors((prev) => {
      const next = { ...prev }
      delete next.delivered
      return next
    })
  }

  const copySaleLinesAsDelivered = () => {
    if (!selectedSale?.items?.length) return
    setDeliveredLines(selectedSale.items.map(saleItemToDeliveredLine))
  }

  const validate = useCallback(() => {
    const next: Record<string, string> = {}
    if (!selectedSale) next.sale = 'Selecciona una factura'
    if (receivedLines.length === 0) next.received = 'Marca al menos un producto devuelto'
    if (deliveredLines.length === 0) next.delivered = 'Agrega al menos un producto de reemplazo'
    if (selectedSale && !totalsOk) {
      next.total = `El total entregado (${formatWarrantyMoney(deliveredTotal)}) debe ser igual al total de la factura (${formatWarrantyMoney(saleTotal)})`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [selectedSale, receivedLines.length, deliveredLines.length, totalsOk, deliveredTotal, saleTotal])

  const handleSubmit = async () => {
    if (!validate() || !selectedSale || receivedLines.length === 0 || deliveredLines.length === 0) return

    for (const line of deliveredLines) {
      const product = await ProductsService.getProductById(line.productId)
      if (!product || getProductStock(product) < line.quantity) {
        setErrors((prev) => ({
          ...prev,
          delivered: `Stock insuficiente para ${line.productName}`,
        }))
        return
      }
    }

    setLoading(true)
    try {
      const firstReceived = receivedLines[0]
      const firstDelivered = deliveredLines[0]
      const payload: CreateWarrantyInput = {
        originalSaleId: selectedSale.id,
        clientId: selectedSale.clientId,
        clientName: selectedSale.clientName,
        productReceivedId: firstReceived.productId,
        productReceivedName: firstReceived.productName,
        productDeliveredId: firstDelivered.productId,
        productDeliveredName: firstDelivered.productName,
        reason: `Garantía factura ${selectedSale.invoiceNumber || ''}`.trim(),
        notes: notes.trim() || undefined,
        status: 'completed',
        saleTotalSnapshot: saleTotal,
        receivedLines,
        deliveredLines: deliveredLines.map(({ key, ...line }) => line),
      }
      await onSave(payload)
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'No se pudo guardar la garantía',
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className={warrantyCardShell}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Factura / pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {!selectedSale ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Buscar por # factura, cliente o total..."
                  className={cn(warrantyInputClass, 'h-10 pl-9')}
                />
              </div>
              {invoiceLoading && <p className="text-sm text-zinc-500">Buscando facturas...</p>}
              {invoiceResults.length > 0 && (
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {invoiceResults.map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => selectSale(sale)}
                      className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                    >
                      <div className="font-medium">{sale.invoiceNumber || 'Sin número'}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">{sale.clientName}</div>
                      <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        Total: {formatWarrantyMoney(sale.total)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    Factura seleccionada
                  </p>
                  <p className="mt-1 text-lg font-semibold">{selectedSale.invoiceNumber}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedSale.clientName}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  setSelectedSale(null)
                  setReceivedItemIds(new Set())
                  setDeliveredLines([])
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 dark:bg-zinc-900/60">
                <p className="text-xs text-zinc-500">Total de la venta</p>
                <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatWarrantyMoney(saleTotal)}
                </p>
              </div>
            </div>
          )}
          {errors.sale && <p className="text-sm text-red-600">{errors.sale}</p>}
        </CardContent>
      </Card>

      {selectedSale && (
        <>
          <Card className={warrantyCardShell}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Package className="h-5 w-5 text-rose-600" />
                Productos devueltos (defectuosos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {selectedSale.items?.map((item) => {
                const lineTotal = getSaleItemLineTotal(item)
                const checked = receivedItemIds.has(item.id)
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                      checked ? 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20' : 'border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReceivedItem(item.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-zinc-500">Ref: {item.productReferenceCode || 'N/A'} · Cant: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatWarrantyMoney(lineTotal)}</p>
                  </label>
                )
              })}
              {errors.received && <p className="text-sm text-red-600">{errors.received}</p>}
            </CardContent>
          </Card>

          <Card className={warrantyCardShell}>
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Productos de reemplazo
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={copySaleLinesAsDelivered}>
                  Copiar líneas de la factura
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {deliveredLines.map((line) => (
                <div key={line.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{line.productName}</p>
                      <p className="text-xs text-zinc-500">Ref: {line.productReference || 'N/A'}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDeliveredLine(line.key)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateDeliveredLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className={cn(warrantyInputClass, 'h-9')}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-zinc-500">Precio unitario</label>
                      <CopIntegerInput
                        value={line.unitPrice}
                        onValueChange={(value) => updateDeliveredLine(line.key, { unitPrice: value })}
                        className={cn(warrantyInputClass, 'h-9 text-right')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Subtotal</label>
                      <p className="flex h-9 items-center justify-end text-sm font-semibold tabular-nums">
                        {formatWarrantyMoney(line.lineTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
                <input
                  type="text"
                  value={replacementSearch}
                  onChange={(e) => setReplacementSearch(e.target.value)}
                  placeholder="Agregar producto de reemplazo..."
                  className={cn(warrantyInputClass, 'h-10 pl-9')}
                />
              </div>
              {replacementLoading && <p className="text-sm text-zinc-500">Buscando...</p>}
              {replacementResults.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {replacementResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => void addDeliveredProduct(product)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                    >
                      <span>{product.name}</span>
                      <Plus className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {errors.delivered && <p className="text-sm text-red-600">{errors.delivered}</p>}
            </CardContent>
          </Card>

          <div
            className={cn(
              'rounded-xl border p-4',
              totalsOk
                ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/20'
                : 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/20'
            )}
          >
            <div className="flex items-center gap-2">
              {totalsOk ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <p className="font-semibold">Resumen vs total de la factura</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-zinc-500">Total factura</p>
                <p className="text-lg font-bold tabular-nums">{formatWarrantyMoney(saleTotal)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Total entregado</p>
                <p className="text-lg font-bold tabular-nums">{formatWarrantyMoney(deliveredTotal)}</p>
              </div>
              <div>
                <p className="text-zinc-500">{remaining === 0 ? 'Diferencia' : remaining > 0 ? 'Falta' : 'Sobra'}</p>
                <p className={cn('text-lg font-bold tabular-nums', totalsOk ? 'text-emerald-700' : 'text-amber-700')}>
                  {formatWarrantyMoney(Math.abs(remaining))}
                </p>
              </div>
            </div>
            {errors.total && <p className="mt-2 text-sm text-red-600">{errors.total}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={cn(warrantyInputClass, 'resize-none px-3 py-2')}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </>
      )}

      {errors.submit && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" />
          {errors.submit}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-end dark:border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={loading || !selectedSale}>
          {loading ? 'Guardando...' : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Registrar garantía
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
