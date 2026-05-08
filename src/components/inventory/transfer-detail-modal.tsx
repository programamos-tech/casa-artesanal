'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Package, Store as StoreIcon, Calendar, User, FileText, DollarSign, CreditCard } from 'lucide-react'
import { StoreStockTransfer, Sale } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'

interface TransferDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transfer: StoreStockTransfer | null
}

export function TransferDetailModal({ isOpen, onClose, transfer }: TransferDetailModalProps) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loadingSale, setLoadingSale] = useState(false)

  useEffect(() => {
    if (isOpen && transfer) {
      // Solo buscar la venta si la transferencia es desde la tienda principal
      // Verificar igual que en getTransferSale (considerar null/undefined)
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isFromMainStore = transfer.fromStoreId === MAIN_STORE_ID || !transfer.fromStoreId
      
      if (isFromMainStore) {
        setLoadingSale(true)
        StoreStockTransferService.getTransferSale(transfer.id)
          .then((saleData) => {
            setSale(saleData)
            if (!saleData) {
              console.log('[TRANSFER DETAIL MODAL] No sale found for transfer:', transfer.id)
            }
          })
          .catch((error) => {
            console.error('Error loading transfer sale:', error)
            setSale(null)
          })
          .finally(() => {
            setLoadingSale(false)
          })
      } else {
        setSale(null)
      }
    } else {
      setSale(null)
    }
  }, [isOpen, transfer])

  if (!isOpen || !transfer) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge>
      case 'in_transit':
        return <Badge className="bg-blue-500 hover:bg-blue-600">En Tránsito</Badge>
      case 'received':
        return <Badge className="bg-green-500 hover:bg-green-600">Recibida</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500 hover:bg-red-600">Cancelada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalQuantity = transfer.items && transfer.items.length > 0
    ? transfer.items.reduce((sum, item) => sum + item.quantity, 0)
    : transfer.quantity || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-neutral-950 dark:border-neutral-700">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="h-6 w-6 text-cyan-500" />
            Detalles de Transferencia
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Número de Transferencia</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {transfer.transferNumber || transfer.id.substring(0, 8)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado</p>
              {getStatusBadge(transfer.status)}
            </div>
          </div>

          {/* Tiendas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <StoreIcon className="h-3 w-3" />
                Tienda Origen
              </p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.fromStoreName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <StoreIcon className="h-3 w-3" />
                Tienda Destino
              </p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.toStoreName || 'N/A'}</p>
            </div>
          </div>

          {/* Descripción */}
          {transfer.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Descripción
              </p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.description}</p>
            </div>
          )}

          {/* Productos */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Productos</p>
            <Card className="dark:bg-neutral-900 dark:border-neutral-700">
              <CardContent className="p-4">
                {transfer.items && transfer.items.length > 0 ? (
                  <div className="space-y-2">
                    {transfer.items.map((item) => {
                      // Buscar el precio unitario en la venta asociada
                      const saleItem = sale?.items?.find(si => si.productId === item.productId)
                      const unitPrice = saleItem?.unitPrice || 0
                      const itemTotal = unitPrice * item.quantity
                      
                      return (
                        <div key={item.id} className="py-2 border-b border-gray-200 dark:border-neutral-700 last:border-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</p>
                              {item.productReference && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReference}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                              </p>
                              {unitPrice > 0 && (
                                <>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(unitPrice)} c/u
                                  </p>
                                  <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                                    {formatCurrency(itemTotal)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-neutral-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white flex justify-between">
                        <span>Total unidades:</span>
                        <span>{totalQuantity} {totalQuantity === 1 ? 'unidad' : 'unidades'}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-900 dark:text-white">{transfer.productName || 'Producto'}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">x{transfer.quantity || 0}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Valor de la Transferencia */}
          {(() => {
            const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
            const isFromMainStore = transfer.fromStoreId === MAIN_STORE_ID || !transfer.fromStoreId
            
            if (!isFromMainStore) {
              return null
            }
            
            if (loadingSale) {
              return (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando información de venta...</p>
                </div>
              )
            }
            
            if (!sale) {
              return (
                <div className="border-2 border-yellow-500 rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    No se encontró información de venta para esta transferencia. Verifica la consola para más detalles.
                  </p>
                </div>
              )
            }
            
            return (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Valor de la Transferencia
              </p>
              <Card className="dark:bg-neutral-900 dark:border-neutral-700 border-2 border-cyan-500">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de la venta:</span>
                      <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                        {formatCurrency(sale.total)}
                      </span>
                    </div>
                    
                    {sale.payments && sale.payments.length > 0 ? (
                      <div className="pt-2 border-t border-gray-200 dark:border-neutral-700 space-y-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Desglose de pagos:</p>
                        {sale.payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {payment.paymentType === 'cash' ? 'Efectivo' : 
                               payment.paymentType === 'transfer' ? 'Transferencia' : 
                               payment.paymentType}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-gray-200 dark:border-neutral-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {sale.paymentMethod === 'cash' ? 'Efectivo' : 
                             sale.paymentMethod === 'transfer' ? 'Transferencia (Nequi · Bancolombia)' : 
                             sale.paymentMethod === 'card' ? 'Tarjeta' :
                             sale.paymentMethod}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {sale.invoiceNumber && (
                      <div className="pt-2 border-t border-gray-200 dark:border-neutral-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Factura: {sale.invoiceNumber}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            )
          })()}

          {/* Fechas y Usuarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha de Creación
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {format(new Date(transfer.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
              </p>
            </div>
            {transfer.receivedAt && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha de Recepción
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {format(new Date(transfer.receivedAt), 'dd MMM yyyy HH:mm', { locale: es })}
                </p>
              </div>
            )}
          </div>

          {transfer.createdByName && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Creado por
              </p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.createdByName}</p>
            </div>
          )}

          {transfer.receivedByName && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Recibido por
              </p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.receivedByName}</p>
            </div>
          )}

          {/* Notas */}
          {transfer.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas</p>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.notes}</p>
            </div>
          )}
        </CardContent>
        <div className="flex flex-shrink-0 justify-end bg-white p-4 pt-6 dark:bg-neutral-950">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  )
}
