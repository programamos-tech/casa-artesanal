'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRightLeft, ShoppingCart, Package, Users, Tag, UserCheck, FileText, DollarSign, CreditCard, Receipt, TrendingUp, TrendingDown, User, Shield, CheckCircle, AlertCircle, Plus, Edit, Trash2, RefreshCw, Activity, Warehouse, Store } from 'lucide-react'
import { LogEntry } from '@/types/logs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { LogsService } from '@/lib/logs-service'
import { SalesService } from '@/lib/sales-service'

interface LogDetailModalProps {
  isOpen: boolean
  onClose: () => void
  log: LogEntry | null
}

export function LogDetailModal({ isOpen, onClose, log }: LogDetailModalProps) {
  const [relatedStockReturns, setRelatedStockReturns] = useState<LogEntry[]>([])
  const [loadingStockReturns, setLoadingStockReturns] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [saleTotal, setSaleTotal] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && log && log.action === 'sale_cancel' && log.details?.saleId) {
      // Obtener número de factura y total de la venta
      setLoadingInvoice(true)
      const fetchInvoiceNumber = async () => {
        try {
          const sale = await SalesService.getSaleById(log.details.saleId)
          if (sale) {
            if (sale.invoiceNumber) {
              setInvoiceNumber(sale.invoiceNumber)
            }
            // El total de la venta es el dinero que se regresó
            if (sale.total) {
              setSaleTotal(sale.total)
            }
          }
        } catch (error) {
          console.error('Error fetching invoice number:', error)
        } finally {
          setLoadingInvoice(false)
        }
      }
      
      // Buscar logs relacionados de devolución de stock
      setLoadingStockReturns(true)
      const fetchRelatedLogs = async () => {
        try {
          // Buscar logs de devolución de stock que ocurrieron cerca del momento de cancelación
          const cancelTime = new Date(log.created_at)
          const startTime = new Date(cancelTime.getTime() - 5 * 60 * 1000) // 5 minutos antes
          const endTime = new Date(cancelTime.getTime() + 5 * 60 * 1000) // 5 minutos después
          
          // Obtener todos los logs y filtrar los relacionados
          const { logs } = await LogsService.getLogsByPage(1, 1000) // Obtener muchos logs para buscar
          
          const related = logs.filter(l => {
            if (l.action !== 'sale_cancellation_stock_return' && l.action !== 'sale_cancellation_stock_return_batch') {
              return false
            }
            
            const logTime = new Date(l.created_at)
            return logTime >= startTime && logTime <= endTime && l.user_id === log.user_id
          })
          
          setRelatedStockReturns(related)
        } catch (error) {
          console.error('Error fetching related stock returns:', error)
        } finally {
          setLoadingStockReturns(false)
        }
      }
      
      fetchInvoiceNumber()
      fetchRelatedLogs()
    } else {
      setRelatedStockReturns([])
      setInvoiceNumber(null)
      setSaleTotal(null)
    }
  }, [isOpen, log])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen || !log) return null

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'transfer_cancelled':
        return ArrowRightLeft
      case 'sale':
      case 'sale_create':
        return ShoppingCart
      case 'credit_sale_create':
        return CreditCard
      case 'sale_cancel':
        return X
      case 'credit_sale_cancel':
        return X
      case 'sale_stock_deduction':
        return TrendingDown
      case 'sale_cancellation_stock_return':
        return TrendingUp
      case 'product_create':
        return Plus
      case 'product_update':
      case 'product_edit':
        return Edit
      case 'product_delete':
        return Trash2
      case 'adjustment':
      case 'stock_adjustment':
        return Package
      case 'transfer':
      case 'stock_transfer':
      case 'transfer_created':
      case 'transfer_received':
        return ArrowRightLeft
      case 'client_create':
        return Plus
      case 'client_edit':
      case 'client_update':
        return Edit
      case 'client_delete':
        return Trash2
      case 'category_create':
      case 'category_edit':
      case 'category_delete':
        return Tag
      case 'warranty_create':
        return Plus
      case 'warranty_status_update':
        return RefreshCw
      case 'warranty_update':
        return Edit
      case 'credit_create':
        return Receipt
      case 'credit_payment':
        return DollarSign
      case 'credit_completed':
        return CheckCircle
      case 'credit_cancelled':
        return X
      case 'roles':
      case 'user_create':
        return Plus
      case 'user_edit':
      case 'user_update':
        return Edit
      case 'user_delete':
        return Trash2
      case 'permissions_assigned':
        return Shield
      case 'permissions_revoked':
        return Shield
      case 'role_changed':
        return Users
      case 'user_deactivated':
        return X
      case 'user_reactivated':
        return CheckCircle
      default:
        return Package
    }
  }

  /** Badges neutros + acento marca (coherente con listado de actividades). */
  const getTypeColor = (_type: string) =>
    'border border-zinc-200/90 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100'

  const getActionLabel = (action: string, module: string, logDetails?: any) => {
    // Manejar acciones específicas de ventas
    if (module === 'sales') {
      switch (action) {
        case 'sale_create':
          return 'Crear Venta'
        case 'credit_sale_create':
          return 'Crear Venta a Crédito'
        case 'sale_cancel':
          return logDetails?.isCreditSale ? 'Cancelar Factura de Crédito' : 'Cancelar Venta'
        case 'sale_update':
          return 'Actualizar Venta'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de productos
    if (module === 'products') {
      switch (action) {
      case 'product_create':
        return 'Crear Producto'
      case 'product_update':
        return 'Actualizar Producto'
      case 'product_delete':
        return 'Eliminar Producto'
      case 'stock_transfer':
        return 'Transferir Stock'
      case 'stock_adjustment':
        return 'Ajustar Stock'
        case 'sale_stock_deduction':
          return 'Descontar Stock por Venta'
        case 'sale_cancellation_stock_return':
          return 'Devolver Stock por Cancelación'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de categorías
    if (module === 'categories') {
      switch (action) {
      case 'category_create':
        return 'Crear Categoría'
      case 'category_update':
        return 'Actualizar Categoría'
      case 'category_delete':
        return 'Eliminar Categoría'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de clientes
    if (module === 'clients') {
      switch (action) {
        case 'client_create':
          return 'Crear Cliente'
        case 'client_update':
          return 'Actualizar Cliente'
        case 'client_delete':
          return 'Eliminar Cliente'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de garantías
    if (module === 'warranties') {
      switch (action) {
        case 'warranty_create':
          return 'Crear Garantía'
        case 'warranty_status_update':
          return 'Actualizar Estado de Garantía'
        case 'warranty_update':
          return 'Actualizar Garantía'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de créditos
    if (module === 'credits') {
      switch (action) {
        case 'credit_create':
          return 'Crear Crédito'
        case 'credit_payment':
          return logDetails?.isCompleted ? 'Pago Completado' : 'Registrar Abono'
        case 'credit_completed':
          return 'Completar Crédito'
        case 'credit_cancelled':
          return 'Cancelar Crédito'
        default:
          return action
      }
    }
    
    // Manejar acciones específicas de transferencias
    if (module === 'transfers') {
      switch (action) {
        case 'transfer_created':
          return 'Transferencia Creada'
        case 'transfer_received':
          return 'Recepción de Transferencia'
        case 'transfer_cancelled':
          return 'Cancelar Transferencia'
        default:
          return action
      }
    }
    
    // Manejar otras acciones
    switch (action) {
      case 'Usuario Creado':
        return 'Crear Usuario'
      case 'Usuario Editado':
        return 'Editar Usuario'
      case 'Usuario Eliminado':
        return 'Eliminar Usuario'
      case 'Permisos Asignados':
        return 'Asignar Permisos'
      case 'Rol Cambiado':
        return 'Cambiar Rol'
      case 'Usuario Desactivado':
        return 'Desactivar Usuario'
      case 'Usuario Reactivado':
        return 'Reactivar Usuario'
      default:
        return action
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Transferencia de Stock'
      case 'transfer_created':
        return 'Transferencia Creada'
      case 'transfer_received':
        return 'Recepción de Transferencia'
      case 'transfer_cancelled':
        return 'Transferencia Cancelada'
      case 'sale':
      case 'sale_create':
        return 'Venta'
      case 'sale_cancel':
        return 'Venta Cancelada'
      case 'credit_sale_cancel':
        return 'Venta tipo crédito cancelada'
      case 'sale_stock_deduction':
        return 'Descuento de Stock'
      case 'sale_cancellation_stock_return':
        return 'Devolución de Stock'
      case 'product_create':
        return 'Producto Creado'
      case 'product_edit':
        return 'Producto Editado'
      case 'product_delete':
        return 'Producto Eliminado'
      case 'client_create':
        return 'Cliente Creado'
      case 'client_edit':
      case 'client_update':
        return 'Cliente Editado'
      case 'client_delete':
        return 'Cliente Eliminado'
      case 'category_create':
        return 'Categoría Creada'
      case 'category_update':
        return 'Categoría Actualizada'
      case 'category_edit':
        return 'Categoría Editada'
      case 'category_delete':
        return 'Categoría Eliminada'
      case 'roles':
        return 'Gestión de Usuarios'
      case 'transfers':
        return 'Gestión de Transferencias'
      case 'user_create':
        return 'Usuario Creado'
      case 'user_edit':
      case 'user_update':
        return 'Usuario Editado'
      case 'user_delete':
        return 'Usuario Eliminado'
      case 'permissions_assigned':
        return 'Permisos Asignados'
      case 'permissions_revoked':
        return 'Permisos Revocados'
      case 'role_changed':
        return 'Rol Cambiado'
      case 'user_deactivated':
        return 'Usuario Desactivado'
      case 'user_reactivated':
        return 'Usuario Reactivado'
      default:
        return type
    }
  }

  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  // Determinar el tipo correcto del log
  const getLogType = () => {
    // Si es un credit_payment y se completó, usar credit_completed
    if (log.action === 'credit_payment' && (log.details as any)?.isCompleted) {
      return 'credit_completed'
    }
    // Si es una factura de crédito cancelada, usar credit_sale_cancel
    if (log.action === 'sale_cancel' && (log.details as any)?.isCreditSale) {
      return 'credit_sale_cancel'
    }
    // Mapear acciones de roles a tipos específicos
    if (log.module === 'roles') {
      if (log.action === 'Usuario Creado') return 'user_create'
      if (log.action === 'Usuario Editado') return 'user_edit'
      if (log.action === 'Usuario Eliminado') return 'user_delete'
      if (log.action === 'Permisos Asignados') return 'permissions_assigned'
      if (log.action === 'Permisos Revocados') return 'permissions_revoked'
      if (log.action === 'Rol Cambiado') return 'role_changed'
      if (log.action === 'Usuario Desactivado') return 'user_deactivated'
      if (log.action === 'Usuario Reactivado') return 'user_reactivated'
      return 'roles'
    }
    return log.type
  }
  
  const logType = getLogType()
  const TypeIcon = getTypeIcon(logType)

  const modal = (
    <div
      className="scrollbar-hide fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/45 px-3 backdrop-blur-sm dark:bg-black/65 sm:px-6"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-detail-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="my-4 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900/95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — misma línea visual que registro de actividades */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/90 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 md:px-6 md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Activity
              className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <h2
                id="log-detail-title"
                className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl"
              >
                Detalle del registro
              </h2>
              <p className="mt-0.5 hidden text-sm text-zinc-500 dark:text-zinc-400 md:block">
                Información completa de la actividad
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-lg border-0 p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </div>

        {/* Content: altura según contenido; scroll solo si supera el tope (sin barra visible) */}
        <div className="max-h-[min(72dvh,560px)] overflow-y-auto overscroll-contain p-4 scrollbar-hide md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {/* Información General */}
            <div className="rounded-xl border border-solid border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2 border-b border-zinc-200/80 p-3 dark:border-zinc-800 md:gap-3 md:p-4">
                <FileText
                  className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400 md:h-5 md:w-5"
                  strokeWidth={1.5}
                />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 md:text-lg">
                  Información general
                </h3>
              </div>
              <div className="space-y-3 p-3 md:space-y-4 md:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">Acción</span>
                  <Badge className={`${getTypeColor(logType)} text-xs md:text-sm`}>
                    <TypeIcon className="mr-1 h-3 w-3" />
                    <span className="truncate">
                      {getActionLabel(log.action, (log as any).module, log.details)}
                    </span>
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">Realizado por</span>
                  <div className="flex min-w-0 items-center gap-2 sm:justify-end">
                    <UserAvatar
                      name={(log as any).user_name || 'Desconocido'}
                      seed={(log as any).user_id || (log as any).id}
                      size="sm"
                      className="ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                    />
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 md:text-base">
                      {(log as any).user_name || 'Desconocido'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">Fecha</span>
                  <span className="text-xs tabular-nums text-zinc-900 dark:text-zinc-100 md:text-sm">
                    {formatDateTime((log as any).created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Información específica según el tipo de acción */}
            {log.details && (
              <div className="rounded-xl border border-solid border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2 border-b border-zinc-200/80 p-3 dark:border-zinc-800 md:gap-3 md:p-4">
                  <TypeIcon
                    className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400 md:h-5 md:w-5"
                    strokeWidth={1.5}
                  />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 md:text-lg">
                    Detalles de la acción
                  </h3>
                </div>
                <div className="p-3 md:p-4 max-h-[60vh] md:max-h-96 xl:max-h-none xl:overflow-visible overflow-y-auto">
                  {/* Información específica para ventas */}
                  {log.action === 'sale_create' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Detalles de la Venta</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cliente:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Total:</span>
                          <div className="text-gray-900 dark:text-white font-bold text-lg">${(log.details.total || 0).toLocaleString('es-CO')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Método de Pago:</span>
                          <div className="text-gray-900 dark:text-white">
                            {log.details.paymentMethod === 'cash' ? 'Efectivo' :
                             log.details.paymentMethod === 'transfer' ? 'Transferencia (Nequi · Bancolombia)' :
                             log.details.paymentMethod === 'card' ? 'Tarjeta' :
                             log.details.paymentMethod === 'mixed' ? 'Mixto' :
                             log.details.paymentMethod === 'credit' ? 'Crédito' :
                             log.details.paymentMethod || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Items Vendidos:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.itemsCount || 0} productos</div>
                        </div>
                      </div>
                      
                      {/* Lista de productos vendidos */}
                      {log.details.items && log.details.items.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-3">Productos Vendidos:</span>
                          <div className="space-y-3">
                            {log.details.items.map((item: any, index: number) => (
                              <div key={index} className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReference}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {item.quantity} × ${(item.unitPrice || 0).toLocaleString('es-CO')}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      ${(item.totalPrice || 0).toLocaleString('es-CO')}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Información de descuento de stock */}
                                {item.stockInfo && (
                                  <div className="border-t border-gray-200 dark:border-neutral-600 pt-2 mt-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Descuento de Stock:</div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      {item.stockInfo.storeDeduction > 0 && (
                                        <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                            <Store className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                            Local
                                          </div>
                                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            -{item.stockInfo.storeDeduction} unidades
                                          </div>
                                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            {item.stockInfo.previousStoreStock} → {item.stockInfo.newStoreStock}
                                          </div>
                                        </div>
                                      )}
                                      {item.stockInfo.warehouseDeduction > 0 && (
                                        <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                            <Warehouse className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                            Bodega
                                          </div>
                                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            -{item.stockInfo.warehouseDeduction} unidades
                                          </div>
                                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            {item.stockInfo.previousWarehouseStock} → {item.stockInfo.newWarehouseStock}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                        <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                          {log.details.description || 'Nueva venta creada'}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.action === 'credit_sale_create' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Detalles de la Venta a Crédito</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cliente:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Total:</span>
                          <div className="text-gray-900 dark:text-white font-bold text-lg">${(log.details.total || 0).toLocaleString('es-CO')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Método de Pago:</span>
                          <div className="text-gray-900 dark:text-white">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              Crédito
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Items Vendidos:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.itemsCount || 0} productos</div>
                        </div>
                      </div>
                      
                      {/* Fecha de Vencimiento - siempre visible */}
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Fecha de Vencimiento:</span>
                        <div className="text-gray-900 dark:text-white font-medium">
                          {log.details.dueDate 
                            ? (() => {
                                try {
                                  const date = new Date(log.details.dueDate)
                                  if (isNaN(date.getTime())) {
                                    return log.details.dueDate || 'Sin fecha de vencimiento'
                                  }
                                  return date.toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                } catch (error) {
                                  return log.details.dueDate || 'Sin fecha de vencimiento'
                                }
                              })()
                            : 'Sin fecha de vencimiento'}
                        </div>
                      </div>
                      
                      {/* Lista de productos vendidos */}
                      {log.details.items && log.details.items.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-3">Productos Vendidos:</span>
                          <div className="space-y-3">
                            {log.details.items.map((item: any, index: number) => (
                              <div key={index} className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReference}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {item.quantity} × ${(item.unitPrice || 0).toLocaleString('es-CO')}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      ${(item.totalPrice || 0).toLocaleString('es-CO')}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Información de descuento de stock */}
                                {item.stockInfo && (
                                  <div className="border-t border-gray-200 dark:border-neutral-600 pt-2 mt-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Descuento de Stock:</div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      {item.stockInfo.storeDeduction > 0 && (
                                        <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                            <Store className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                            Local
                                          </div>
                                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            -{item.stockInfo.storeDeduction} unidades
                                          </div>
                                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            {item.stockInfo.previousStoreStock} → {item.stockInfo.newStoreStock}
                                          </div>
                                        </div>
                                      )}
                                      {item.stockInfo.warehouseDeduction > 0 && (
                                        <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                            <Warehouse className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                            Bodega
                                          </div>
                                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            -{item.stockInfo.warehouseDeduction} unidades
                                          </div>
                                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            {item.stockInfo.previousWarehouseStock} → {item.stockInfo.newWarehouseStock}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                        <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                          {log.details.description || 'Nueva venta a crédito creada'}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.action === 'sale_stock_deduction' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <TrendingDown className="h-4 w-4" />
                        <span>Descuento de Stock por Venta</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Producto:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.productName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Referencia:</span>
                          <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.productReference || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cantidad Descontada:</span>
                          <div className="text-red-600 dark:text-red-400 font-bold text-lg">-{log.details.quantityDeducted || 0} unidades</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Ubicación:</span>
                          <div className="text-gray-900 dark:text-white">
                            {log.details.storeDeduction > 0 && log.details.warehouseDeduction > 0 ? 'Local + Bodega' :
                             log.details.storeDeduction > 0 ? 'Local' :
                             log.details.warehouseDeduction > 0 ? 'Bodega' : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">Desglose del descuento</span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              <Store className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                              Local
                            </div>
                            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              -{log.details.storeDeduction || 0} unidades
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {log.details.previousStoreStock || 0} → {log.details.newStoreStock || 0}
                            </div>
                          </div>
                          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              <Warehouse className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                              Bodega
                            </div>
                            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              -{log.details.warehouseDeduction || 0} unidades
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {log.details.previousWarehouseStock || 0} → {log.details.newWarehouseStock || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                        <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                          {log.details.description || 'Stock descontado por venta'}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.action === 'sale_cancel' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <X className="h-4 w-4" />
                        <span>{(log.details as any)?.isCreditSale ? 'Anulación de Factura de Crédito' : 'Detalles de la Anulación'}</span>
                      </div>
                      
                      {/* Información de quién anuló */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-700 dark:text-blue-300 text-xs font-medium">Anulado por:</span>
                        </div>
                        <div className="text-gray-900 dark:text-white font-semibold">
                          {(log as any).user_name || 'Usuario Desconocido'}
                        </div>
                      </div>

                      {/* Información de crédito si aplica */}
                      {(log.details as any)?.isCreditSale && (
                        <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Factura perteneciente a un crédito
                            </span>
                          </div>
                          <div className="text-gray-900 dark:text-white text-sm">
                            Esta factura forma parte de un crédito. Al cancelarla, el crédito se actualizará automáticamente.
                          </div>
                          {(log.details as any)?.clientName && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              Cliente: <span className="font-medium text-gray-900 dark:text-white">{(log.details as any).clientName}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Factura:</span>
                          {loadingInvoice ? (
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Cargando...</div>
                          ) : (
                            <div className="text-gray-900 dark:text-white font-semibold text-base">
                              {invoiceNumber || 'N/A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Total de la Venta:</span>
                          {loadingInvoice ? (
                            <div className="text-gray-500 dark:text-gray-400 text-sm">Cargando...</div>
                          ) : (
                            <div className="text-gray-900 dark:text-white font-bold text-lg">
                              ${(saleTotal || 0).toLocaleString('es-CO')}
                          </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Dinero regresado */}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300 text-sm font-medium">
                              Dinero Regresado:
                            </span>
                          </div>
                          <div className="text-green-700 dark:text-green-300 font-bold text-xl">
                            ${((saleTotal || log.details.totalRefund || 0)).toLocaleString('es-CO')}
                          </div>
                        </div>
                        {log.details.totalRefund && log.details.totalRefund > 0 && log.details.totalRefund !== saleTotal && (
                          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                            Reembolso registrado: ${log.details.totalRefund.toLocaleString('es-CO')}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Motivo de Cancelación:</span>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                          <div className="text-gray-900 dark:text-white font-medium">
                          {log.details.reason || 'No especificado'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Información de devolución de stock */}
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-600" />
                            <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">Devolución de Stock:</span>
                        </div>
                          {(() => {
                            const stockInfo = (log.details as any)?.stockReturnInfo
                            const stockUpdates = stockInfo?.successfulUpdates || []
                            const hasStockInfo = stockUpdates.length > 0
                            
                            if (loadingStockReturns) {
                              return <div className="text-xs text-gray-500">Cargando...</div>
                            } else if (hasStockInfo) {
                              return (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs font-medium">{stockUpdates.length} producto{stockUpdates.length !== 1 ? 's' : ''} devuelto{stockUpdates.length !== 1 ? 's' : ''}</span>
                                </div>
                              )
                            } else if (relatedStockReturns.length > 0) {
                              return (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs font-medium">{relatedStockReturns.length} producto{relatedStockReturns.length !== 1 ? 's' : ''} devuelto{relatedStockReturns.length !== 1 ? 's' : ''}</span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="text-xs">No se encontraron devoluciones</span>
                                </div>
                              )
                            }
                          })()}
                        </div>
                        
                        {(() => {
                          const stockInfo = (log.details as any)?.stockReturnInfo
                          const stockUpdates = stockInfo?.successfulUpdates || []
                          const hasStockInfo = stockUpdates.length > 0
                          
                          if (loadingStockReturns) {
                            return <div className="text-center py-4 text-gray-500 text-sm">Buscando productos devueltos...</div>
                          } else if (hasStockInfo) {
                            // Mostrar información del stock desde el log directamente
                            return (
                              <div className="space-y-2">
                                <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Devolución de stock:</div>
                                  <div className="space-y-2">
                                    {stockUpdates.map((update: any, idx: number) => (
                                      <div key={idx} className="bg-white dark:bg-neutral-700 p-2 rounded border border-gray-200 dark:border-neutral-600">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">{update.productName || 'N/A'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {update.productReference || 'N/A'}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-green-600 dark:text-green-400 font-bold text-sm">+{update.quantityReturned || 0}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">unidades</div>
                                          </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                          Stock: {update.previousStoreStock || 0} → {update.newStoreStock || 0}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          } else if (relatedStockReturns.length > 0) {
                            // Fallback: buscar logs relacionados (para logs antiguos que no tienen stockReturnInfo)
                            return (
                              <div className="space-y-2">
                                {relatedStockReturns.map((stockLog) => {
                                  if (stockLog.action === 'sale_cancellation_stock_return_batch' && stockLog.details?.successfulUpdates) {
                                    // Log batch con múltiples productos
                                    return (
                                      <div key={stockLog.id} className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Devolución masiva:</div>
                                        <div className="space-y-2">
                                          {stockLog.details.successfulUpdates.map((update: any, idx: number) => (
                                            <div key={idx} className="bg-white dark:bg-neutral-700 p-2 rounded border border-gray-200 dark:border-neutral-600">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900 dark:text-white text-sm">{update.productName || 'N/A'}</div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {update.productReference || 'N/A'}</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-green-600 dark:text-green-400 font-bold text-sm">+{update.quantityReturned || 0}</div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">unidades</div>
                                                </div>
                                              </div>
                                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Stock: {update.previousStoreStock || 0} → {update.newStoreStock || 0}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  } else if (stockLog.action === 'sale_cancellation_stock_return' && stockLog.details) {
                                    // Log individual
                                    return (
                                      <div key={stockLog.id} className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">{stockLog.details.productName || 'N/A'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {stockLog.details.productReference || 'N/A'}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-green-600 dark:text-green-400 font-bold text-sm">+{stockLog.details.quantityReturned || 0}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">unidades</div>
                                          </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                          <span className="text-gray-500 dark:text-gray-400">
                                            {stockLog.details.location === 'store' ? 'Local' : stockLog.details.location === 'warehouse' ? 'Bodega' : 'N/A'}
                                          </span>
                                          <span className="text-gray-400">•</span>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            Stock: {stockLog.details.previousStoreStock || 0} → {stockLog.details.newStoreStock || 0}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })}
                              </div>
                            )
                          } else {
                            return (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                  <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                                    No se encontraron registros de devolución de stock relacionados con esta anulación.
                                  </span>
                                </div>
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {log.action === 'sale_cancellation_stock_return' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <TrendingUp className="h-4 w-4" />
                        <span>Devolución de Stock por Cancelación</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Producto:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.productName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Referencia:</span>
                          <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.productReference || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cantidad Devuelta:</span>
                          <div className="text-green-600 dark:text-green-400 font-bold text-lg">+{log.details.quantityReturned || 0} unidades</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Ubicación:</span>
                          <div className="text-gray-900 dark:text-white">
                            {log.details.location === 'store' ? 'Local' :
                             log.details.location === 'warehouse' ? 'Bodega' : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Stock Anterior vs Nuevo:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            <div className="text-gray-400 text-xs">Stock Anterior</div>
                            <div className="text-gray-600 dark:text-gray-300 font-bold text-lg">{log.details.previousStoreStock || 0} unidades</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                                <div className="text-green-600 text-xs">Stock Nuevo</div>
                            <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.newStoreStock || 0} unidades</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Razón:</span>
                        <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                          {log.details.reason || 'Venta cancelada'}
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                        <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                          {log.details.description || 'Stock devuelto por cancelación de venta'}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.action === 'Permisos Asignados' && (log.details as any).description && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Resumen de permisos:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-2">
                          {(() => {
                            const desc = (log.details as any).description
                            // Extraer el nombre del usuario
                            const userMatch = desc.match(/^([^-]+) -/)
                            const userName = userMatch ? userMatch[1].trim() : 'Usuario'
                            
                            // Extraer cambios específicos
                            const changesMatch = desc.match(/Módulos: (.+?)\. Resumen:/)
                            const changes = changesMatch ? changesMatch[1].trim() : ''
                            
                            // Extraer resumen de permisos
                            const summaryMatch = desc.match(/Resumen: (.+)$/)
                            const summary = summaryMatch ? summaryMatch[1].trim() : ''
                            
                            return (
                              <>
                                <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                                  <UserCheck className="h-4 w-4" />
                                  <span>{userName}</span>
                                </div>
                                
                                {summary && (
                                  <div>
                                    <div className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">Permisos asignados:</div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                                      {summary.split(' | ').map((module: any, index: number) => {
                                        // Parsear el módulo y acciones
                                        const moduleMatch = module.match(/^([^:]+):\s*(.+)$/)
                                        if (!moduleMatch) return null
                                        
                                        const moduleName = moduleMatch[1]
                                          .replace(/Productos/g, 'Productos')
                                          .replace(/Clientes/g, 'Clientes')
                                          .replace(/Ventas/g, 'Ventas')
                                          .replace(/Abonos/g, 'Abonos')
                                          .replace(/Roles/g, 'Roles')
                                          .replace(/Dashboard/g, 'Reportes')
                                          .replace(/Logs/g, 'Logs')
                                          .replace(/warranties/g, 'Garantías')
                                        
                                        const actions = moduleMatch[2]
                                          .split(',')
                                          .map((a: string) => a.trim())
                                          .map((action: string) => {
                                            return action === 'Ver' ? 'Ver' :
                                              action === 'Crear' ? 'Crear' :
                                              action === 'Editar' ? 'Editar' :
                                              action === 'Eliminar' ? 'Eliminar' :
                                              action === 'Cancelar' ? 'Cancelar' :
                                              action === 'view' ? 'Ver' :
                                              action === 'create' ? 'Crear' :
                                              action === 'edit' ? 'Editar' :
                                              action === 'delete' ? 'Eliminar' :
                                              action === 'cancel' ? 'Cancelar' :
                                              action
                                          })
                                          .join(', ')
                                        
                                        return (
                                          <div key={index} className="flex items-start space-x-2">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                                            <div className="flex-1">
                                              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{moduleName}:</span>
                                              <span className="text-sm text-blue-700 dark:text-blue-400 ml-1">{actions}</span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {changes && changes.trim() && (
                                  <div className="mt-3">
                                    <div className="text-gray-600 dark:text-gray-300 text-xs mb-2">Cambios realizados:</div>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                      <div className="text-xs text-yellow-800 dark:text-yellow-300">
                                      {changes
                                          .replace(/Agregados:/g, '✅ Agregados: ')
                                          .replace(/Removidos:/g, '❌ Removidos: ')
                                        .replace(/products:/g, 'Productos:')
                                        .replace(/clients:/g, 'Clientes:')
                                        .replace(/sales:/g, 'Ventas:')
                                        .replace(/payments:/g, 'Abonos:')
                                        .replace(/roles:/g, 'Roles:')
                                        .replace(/dashboard:/g, 'Reportes:')
                                        .replace(/logs:/g, 'Logs:')
                                          .replace(/warranties:/g, 'Garantías:')
                                        .replace(/view/g, 'Ver')
                                        .replace(/create/g, 'Crear')
                                        .replace(/edit/g, 'Editar')
                                        .replace(/delete/g, 'Eliminar')
                                        .replace(/cancel/g, 'Cancelar')
                                          .replace(/;/g, '; ')
                                      }
                                    </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'Usuario Creado' && (log.details as any).newUser && (
                    <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Nuevo usuario:</span>
                        <div className="text-gray-900 dark:text-white text-sm">
                        <strong>{(log.details as any).newUser.name}</strong> - {(log.details as any).newUser.email} ({(log.details as any).newUser.role})
                        </div>
                      </div>
                      
                      {(log.details as any).newUser.permissions && Array.isArray((log.details as any).newUser.permissions) && (log.details as any).newUser.permissions.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Permisos asignados:</span>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                            {(log.details as any).newUser.permissions.map((perm: any, idx: number) => {
                              const moduleLabel = perm.module === 'dashboard' ? 'Reportes' :
                                perm.module === 'products' ? 'Productos' :
                                perm.module === 'clients' ? 'Clientes' :
                                perm.module === 'sales' ? 'Ventas' :
                                perm.module === 'payments' ? 'Abonos' :
                                perm.module === 'roles' ? 'Roles' :
                                perm.module === 'logs' ? 'Logs' :
                                perm.module === 'warranties' ? 'Garantías' :
                                perm.module
                              
                              const actionsLabels = (perm.actions || []).map((action: string) => {
                                return action === 'view' ? 'Ver' :
                                  action === 'create' ? 'Crear' :
                                  action === 'edit' ? 'Editar' :
                                  action === 'delete' ? 'Eliminar' :
                                  action === 'cancel' ? 'Cancelar' :
                                  action
                              }).join(', ')
                              
                              return (
                                <div key={idx} className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{moduleLabel}:</span>
                                    <span className="text-sm text-blue-700 dark:text-blue-400 ml-1">{actionsLabels}</span>
                                  </div>
                                </div>
                              )
                            })}
                      </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {log.action === 'Usuario Editado' && (log.details as any).userName && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Usuario editado:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm">
                        <strong>{log.details.userName}</strong>
                        {log.details.changes && Object.keys(log.details.changes).length > 0 && (
                          <span className="text-gray-400 ml-2">
                            - Campos modificados: {Object.keys(log.details.changes).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'Usuario Eliminado' && log.details.deletedUser && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Usuario eliminado:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm">
                        <strong>{log.details.deletedUser.name}</strong> - {log.details.deletedUser.email}
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'Rol Cambiado' && log.details.userName && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Cambio de rol:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm">
                        <strong>{log.details.userName}</strong>
                        {log.details.changes?.role && (
                          <span className="text-gray-400 ml-2">
                            - Nuevo rol: {log.details.changes.role}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Información específica para productos */}
                  {log.action === 'product_create' && log.details && (
                    <div>
                      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Producto creado
                      </span>
                      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/95 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/70">
                        <div className="space-y-3">
                          <div className="mb-1 flex items-center gap-2 border-b border-zinc-200/90 pb-3 dark:border-zinc-700">
                            <Package
                              className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                              Resumen del producto
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Nombre</span>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {log.details.productName || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Referencia</span>
                              <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                {log.details.productReference || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Marca</span>
                              <div className="text-zinc-900 dark:text-zinc-100">{log.details.brand || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Categoría ID</span>
                              <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                {log.details.category || 'N/A'}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-zinc-200/90 pt-3 dark:border-zinc-700">
                            <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Stock inicial
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                              <div className="rounded-lg border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-950/50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  <Warehouse
                                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                                    strokeWidth={1.5}
                                    aria-hidden
                                  />
                                  Bodega
                                </div>
                                <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {log.details.stockWarehouse || 0} unidades
                                </div>
                              </div>
                              <div className="rounded-lg border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-950/50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  <Store
                                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                                    strokeWidth={1.5}
                                    aria-hidden
                                  />
                                  Local
                                </div>
                                <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {log.details.stockStore || 0} unidades
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-zinc-200/80 bg-zinc-100/90 px-3 py-2.5 text-center dark:border-zinc-600 dark:bg-zinc-800/90">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Total: </span>
                              <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                                {(log.details.stockWarehouse || 0) + (log.details.stockStore || 0)} unidades
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-zinc-200/90 pt-3 dark:border-zinc-700">
                            <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Precios
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                              <div>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">Precio de venta</span>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  ${(log.details.price || 0).toLocaleString('es-CO')}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">Costo</span>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  ${(log.details.cost || 0).toLocaleString('es-CO')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'product_update' && log.details && (
                    <div>
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">Producto</span>
                        </div>
                        <div className="text-sm text-cyan-900 dark:text-cyan-100 font-medium">
                          {log.details.productName || 'ID: ' + (log.details.productId || 'N/A')}
                        </div>
                        {log.details.productReference && (
                          <div className="text-xs text-cyan-700 dark:text-cyan-300 font-mono mt-1">
                            Ref: {log.details.productReference}
                          </div>
                        )}
                      </div>

                      {log.details.updatedFields && log.details.previousValues && (() => {
                        const fieldLabels: { [key: string]: string } = {
                          name: 'Nombre',
                          reference: 'Referencia',
                          brand: 'Marca',
                          price: 'Precio',
                          cost: 'Costo',
                          description: 'Descripción',
                          status: 'Estado',
                          stock: 'Stock'
                        }

                        const formatValue = (value: any, fieldName: string) => {
                          if (value === null || value === undefined || value === '') return null
                          if (fieldName === 'price' || fieldName === 'cost') {
                            return `$${Number(value).toLocaleString('es-CO')}`
                          }
                          if (fieldName === 'stock') {
                            if (typeof value === 'object' && value !== null) {
                              return `Local: ${value.store || 0}, Bodega: ${value.warehouse || 0}, Total: ${value.total || 0}`
                            }
                            return String(value)
                          }
                          if (fieldName === 'status') {
                            return value === 'active' ? 'Activo' : value === 'inactive' ? 'Inactivo' : String(value)
                          }
                          return String(value)
                        }

                        const changes = Object.entries(log.details.updatedFields)
                          .filter(([field]) => {
                            // Filtrar campos técnicos que no son relevantes
                            return !['createdAt', 'updatedAt', 'categoryId'].includes(field)
                          })
                          .map(([field, newValue]) => {
                            const previousValue = (log.details.previousValues as any)?.[field]
                            
                            // Normalizar valores para comparación
                            const prevNormalized = previousValue === null || previousValue === undefined || previousValue === '' ? null : previousValue
                            const newNormalized = newValue === null || newValue === undefined || newValue === '' ? null : newValue
                            
                            // Solo mostrar si el valor realmente cambió y no son ambos null/vacíos
                            if (JSON.stringify(prevNormalized) === JSON.stringify(newNormalized)) {
                              return null
                            }

                            const prevFormatted = formatValue(previousValue, field)
                            const newFormatted = formatValue(newValue, field)

                            // No mostrar si ambos son null o vacíos
                            if (!prevFormatted && !newFormatted) {
                              return null
                            }

                            return {
                              field,
                              label: fieldLabels[field] || field,
                              previous: prevFormatted || 'N/A',
                              new: newFormatted || 'N/A'
                            }
                          })
                          .filter(Boolean) as Array<{ field: string; label: string; previous: string; new: string }>

                        if (changes.length === 0) {
                          return null
                        }

                        return (
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 block mb-3">Cambios realizados:</span>
                            <div className="space-y-2">
                              {changes.map((change) => (
                                <div key={change.field} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                                    {change.label}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Anterior:</div>
                                      <div className="text-sm text-yellow-900 dark:text-yellow-100">
                                        {change.previous}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Nuevo:</div>
                                      <div className="text-sm text-yellow-900 dark:text-yellow-100 font-semibold">
                                        {change.new}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                  
                  {log.action === 'product_delete' && log.details && (
                    <div>
                      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Producto eliminado
                      </span>
                      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/95 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/70">
                        <div className="space-y-3">
                          <div className="mb-1 flex items-center gap-2 border-b border-zinc-200/90 pb-3 dark:border-zinc-700">
                            <Package
                              className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                              Información del producto eliminado
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Nombre</span>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {log.details.productName || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Referencia</span>
                              <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                {log.details.productReference || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Marca</span>
                              <div className="text-zinc-900 dark:text-zinc-100">{log.details.brand || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">Categoría ID</span>
                              <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                {log.details.category || 'N/A'}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-zinc-200/90 pt-3 dark:border-zinc-700">
                            <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Stock al momento de eliminación
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                              <div className="rounded-lg border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-950/50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  <Warehouse
                                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                                    strokeWidth={1.5}
                                    aria-hidden
                                  />
                                  Bodega
                                </div>
                                <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {log.details.stockWarehouse || 0} unidades
                                </div>
                              </div>
                              <div className="rounded-lg border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-950/50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  <Store
                                    className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                                    strokeWidth={1.5}
                                    aria-hidden
                                  />
                                  Local
                                </div>
                                <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {log.details.stockStore || 0} unidades
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-zinc-200/80 bg-zinc-100/90 px-3 py-2.5 text-center dark:border-zinc-600 dark:bg-zinc-800/90">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Total: </span>
                              <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                                {(log.details.stockWarehouse || 0) + (log.details.stockStore || 0)} unidades
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-zinc-200/90 pt-3 dark:border-zinc-700">
                            <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Precios
                            </span>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                              <div>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">Precio de venta</span>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  ${(log.details.price || 0).toLocaleString('es-CO')}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">Costo</span>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  ${(log.details.cost || 0).toLocaleString('es-CO')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'stock_transfer' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Transferencia de stock:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-900 dark:text-white mb-3">
                            <ArrowRightLeft className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-gray-900 dark:text-white">Transferencia de Stock</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Producto:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.productName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Referencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.productReference || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Detalles de la Transferencia:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-red-400 text-xs">Desde:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.fromLocationLabel || 'N/A'}</div>
                                <div className="text-gray-600 dark:text-gray-300 text-xs">-{log.details.quantity || 0} unidades</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-green-600 text-xs">Hacia:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.toLocationLabel || 'N/A'}</div>
                                <div className="text-gray-600 dark:text-gray-300 text-xs">+{log.details.quantity || 0} unidades</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Stock Anterior:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs">
                              <div>
                                <span className="text-gray-400">Bodega:</span>
                                <div className="text-gray-600 dark:text-gray-300">{log.details.previousStock?.warehouse || 0} unidades</div>
                              </div>
                              <div>
                                <span className="text-gray-400">Local:</span>
                                <div className="text-gray-600 dark:text-gray-300">{log.details.previousStock?.store || 0} unidades</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Stock Después:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs">
                              <div>
                                <span className="text-gray-400">Bodega:</span>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.newStock?.warehouse || 0} unidades</div>
                              </div>
                              <div>
                                <span className="text-gray-400">Local:</span>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.newStock?.store || 0} unidades</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'transfer_created' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Transferencia creada:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-900 dark:text-white mb-3">
                            <ArrowRightLeft className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-gray-900 dark:text-white">Transferencia Creada</span>
                          </div>
                          
                          {log.details.transferNumber && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Transferencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono font-medium">{log.details.transferNumber}</div>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Tiendas:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-xs text-yellow-600 dark:text-yellow-400">Desde:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.fromStoreName || 'N/A'}</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-green-600 text-xs">Hacia:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.toStoreName || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Resumen:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-gray-400 text-xs">Productos:</div>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.itemsCount || 0}</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-gray-400 text-xs">Total Unidades:</div>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.totalQuantity || 0}</div>
                              </div>
                              {log.details.totalAmount > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="text-green-600 text-xs">Total:</div>
                                  <div className="text-gray-900 dark:text-white font-bold">${(log.details.totalAmount || 0).toLocaleString('es-CO')}</div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {log.details.products && Array.isArray(log.details.products) && log.details.products.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Productos:</span>
                              <div className="space-y-2">
                                {log.details.products.map((product: any, index: number) => (
                                  <div key={index} className="bg-gray-200 dark:bg-neutral-700 p-2 rounded text-xs">
                                    <div className="font-medium text-gray-900 dark:text-white">{product.productName || 'N/A'}</div>
                                    <div className="text-gray-600 dark:text-gray-300">
                                      {product.quantity || 0} unidades
                                      {product.productReference && ` • Ref: ${product.productReference}`}
                                      {product.unitPrice > 0 && ` • $${product.unitPrice.toLocaleString('es-CO')} c/u`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {log.details.paymentMethod && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Método de Pago:</span>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {log.details.paymentMethod === 'cash' ? 'Efectivo' :
                                 log.details.paymentMethod === 'transfer' ? 'Transferencia (Nequi · Bancolombia)' :
                                 log.details.paymentMethod === 'card' ? 'Tarjeta' :
                                 log.details.paymentMethod === 'mixed' ? 'Mixto' :
                                 log.details.paymentMethod}
                              </div>
                            </div>
                          )}
                          
                          {log.details.transferDescription && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                              <div className="text-gray-900 dark:text-white bg-gray-200 dark:bg-neutral-700 p-2 rounded">{log.details.transferDescription}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'transfer_received' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Recepción de transferencia:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-900 dark:text-white mb-3">
                            <CheckCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-gray-900 dark:text-white">Recepción de Transferencia</span>
                          </div>
                          
                          {log.details.transferNumber && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Transferencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono font-medium">{log.details.transferNumber}</div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Producto:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.productName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Referencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.productReference || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Detalles de la Recepción:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-xs text-yellow-600 dark:text-yellow-400">Desde Tienda:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.fromStoreName || 'N/A'}</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-green-600 text-xs">Hacia Tienda:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.toStoreName || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Cantidades:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="text-green-600 text-xs">Recibidas:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.quantityReceived || 0} unidades</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-gray-400 text-xs">Esperadas:</div>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.quantityExpected || 0} unidades</div>
                              </div>
                            </div>
                            {log.details.isPartial && (
                              <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                                <span className="text-yellow-600 dark:text-yellow-400 text-xs">⚠️ Recepción parcial</span>
                              </div>
                            )}
                          </div>
                          
                          {log.details.note && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Nota:</span>
                              <div className="text-gray-900 dark:text-white bg-gray-200 dark:bg-neutral-700 p-2 rounded">{log.details.note}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'transfer_cancelled' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Transferencia cancelada:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-900 dark:text-white mb-3">
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-gray-900 dark:text-white">Transferencia Cancelada</span>
                          </div>
                          
                          {log.details.transferNumber && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Transferencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono font-medium">{log.details.transferNumber}</div>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Tiendas:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-xs text-yellow-600 dark:text-yellow-400">Desde:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.fromStoreName || 'N/A'}</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-green-600 text-xs">Hacia:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.toStoreName || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {log.details.reason && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Motivo de cancelación:</span>
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="text-gray-900 dark:text-white">{log.details.reason}</div>
                              </div>
                            </div>
                          )}
                          
                          {log.details.totalRefund && log.details.totalRefund > 0 && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Reembolso:</span>
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="text-green-600 dark:text-green-400 text-xs">Dinero devuelto:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">
                                  ${log.details.totalRefund.toLocaleString('es-CO')}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {log.details.invoiceNumber && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Factura cancelada:</span>
                              <div className="text-gray-900 dark:text-white font-mono">{log.details.invoiceNumber}</div>
                            </div>
                          )}
                          
                          {log.details.products && Array.isArray(log.details.products) && log.details.products.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Productos devueltos:</span>
                              <div className="space-y-2">
                                {log.details.products.map((product: any, index: number) => (
                                  <div key={index} className="bg-gray-200 dark:bg-neutral-700 p-2 rounded text-xs">
                                    <div className="font-medium text-gray-900 dark:text-white">{product.productName || 'N/A'}</div>
                                    <div className="text-gray-600 dark:text-gray-300">
                                      {product.quantity || 0} unidades
                                      {product.productReference && ` • Ref: ${product.productReference}`}
                                      {product.fromLocation && ` • Origen: ${product.fromLocation === 'warehouse' ? 'Bodega' : 'Local'}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'stock_adjustment' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Ajuste de stock:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <Package className="h-4 w-4" />
                            <span>Ajuste de Stock</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Producto:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.productName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Referencia:</span>
                              <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.productReference || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Detalles del Ajuste:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-gray-400 text-xs">Ubicación:</div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">{log.details.locationLabel || 'N/A'}</div>
                              </div>
                              <div className="bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                <div className="text-gray-400 text-xs">Tipo de Ajuste:</div>
                                <div className={`font-bold text-lg ${
                                  log.details.actionType === 'incremento' ? 'text-green-600' : 'text-red-400'
                                }`}>
                                  {log.details.actionType === 'incremento' ? 'Incremento' : 'Reducción'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Cantidades:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs">
                              <div>
                                <span className="text-gray-400">Anterior:</span>
                                <div className="text-gray-600 dark:text-gray-300">{log.details.previousQuantity || 0} unidades</div>
                              </div>
                              <div>
                                <span className="text-gray-400">Nueva:</span>
                                <div className="text-gray-900 dark:text-white font-medium">{log.details.newQuantity || 0} unidades</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-gray-400">Diferencia:</span>
                              <div className={`font-bold ${
                                (log.details.difference || 0) > 0 ? 'text-green-600' : 'text-red-400'
                              }`}>
                                {(log.details.difference || 0) > 0 ? '+' : ''}{log.details.difference || 0} unidades
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Razón del Ajuste:</span>
                            <div className="text-gray-900 dark:text-white bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                              {log.details.reason || 'No especificada'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Información específica para categorías */}
                  {log.action === 'category_create' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Categoría creada:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <Tag className="h-4 w-4" />
                            <span>Nueva Categoría</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.categoryName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Estado:</span>
                              <div className={`font-medium ${log.details.status === 'active' ? 'text-green-600' : 'text-red-400'}`}>
                                {log.details.status === 'active' ? 'Activa' : 'Inactiva'}
                              </div>
                            </div>
                          </div>
                          
                          {log.details.description && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción:</span>
                              <div className="text-gray-900 dark:text-white bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                {log.details.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'category_update' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Categoría actualizada:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <Tag className="h-4 w-4" />
                            <span>Categoría Actualizada</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.categoryName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Estado:</span>
                              <div className={`font-medium ${log.details.status === 'active' ? 'text-green-600' : 'text-red-400'}`}>
                                {log.details.status === 'active' ? 'Activa' : 'Inactiva'}
                              </div>
                            </div>
                          </div>
                          
                          {log.details.changes && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                              <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Cambios realizados:</span>
                              <div className="text-gray-900 dark:text-white bg-gray-200 dark:bg-neutral-700 p-3 rounded-lg">
                                {log.details.changes}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {log.action === 'category_delete' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Categoría eliminada:</span>
                      <div className="text-gray-900 dark:text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <Tag className="h-4 w-4" />
                            <span>Categoría Eliminada</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                            <div className="text-gray-900 dark:text-white font-medium">{log.details.categoryName || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información específica para clientes */}
                  {log.action === 'client_create' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Cliente creado:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <User className="h-4 w-4" />
                            <span>Información del Cliente</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Email:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.clientEmail || 'Sin email'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Teléfono:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.clientPhone || 'Sin teléfono'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Tipo:</span>
                              <div className="text-gray-900 dark:text-white">
                                {log.details.clientType === 'mayorista' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                    Mayorista
                                  </span>
                                ) : log.details.clientType === 'minorista' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    Minorista
                                  </span>
                                ) : log.details.clientType === 'consumidor_final' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-300">
                                    Consumidor Final
                                  </span>
                                ) : (
                                  log.details.clientType || 'N/A'
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">NIT / Cédula:</span>
                                <div className="text-gray-900 dark:text-white font-mono text-base font-semibold">
                                  {log.details.clientDocument || 'N/A'}
                                </div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Tipo de Cliente:</span>
                                <div className="text-gray-900 dark:text-white font-semibold">
                                  {log.details.clientType === 'mayorista' ? (
                                    <span className="text-purple-600 dark:text-purple-400">Mayorista</span>
                                  ) : log.details.clientType === 'minorista' ? (
                                    <span className="text-blue-600 dark:text-blue-400">Minorista</span>
                                  ) : log.details.clientType === 'consumidor_final' ? (
                                    <span className="text-gray-600 dark:text-gray-400">Consumidor Final</span>
                                  ) : (
                                    'N/A'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                </div>
              </div>
            )}

                  {log.action === 'client_update' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Cliente actualizado:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <User className="h-4 w-4" />
                            <span>Información del Cliente</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Email:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.clientEmail || 'Sin email'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Teléfono:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.clientPhone || 'Sin teléfono'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Tipo:</span>
                              <div className="text-gray-900 dark:text-white">
                                {log.details.clientType === 'mayorista' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                    Mayorista
                                      </span>
                                ) : log.details.clientType === 'minorista' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    Minorista
                                  </span>
                                ) : log.details.clientType === 'consumidor_final' ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-300">
                                    Consumidor Final
                                  </span>
                                ) : (
                                  log.details.clientType || 'N/A'
                                )}
                              </div>
                            </div>
                          </div>
                          
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                              <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">NIT / Cédula:</span>
                                <div className="text-gray-900 dark:text-white font-mono text-base font-semibold">
                                  {log.details.clientDocument || 'N/A'}
                                  </div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Tipo de Cliente:</span>
                                <div className="text-gray-900 dark:text-white font-semibold">
                                  {log.details.clientType === 'mayorista' ? (
                                    <span className="text-purple-600 dark:text-purple-400">Mayorista</span>
                                  ) : log.details.clientType === 'minorista' ? (
                                    <span className="text-blue-600 dark:text-blue-400">Minorista</span>
                                  ) : log.details.clientType === 'consumidor_final' ? (
                                    <span className="text-gray-600 dark:text-gray-400">Consumidor Final</span>
                                  ) : (
                                    'N/A'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {log.action === 'client_delete' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Cliente eliminado:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <User className="h-4 w-4" />
                            <span>Información del Cliente Eliminado</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Nombre:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Email:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.clientEmail || 'Sin email'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Documento:</span>
                              <div className="text-gray-900 dark:text-white font-mono text-sm">{log.details.clientDocument || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalles específicos para garantías */}
                  {log.action === 'warranty_create' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                            <Shield className="h-4 w-4" />
                        <span>Detalles de la Garantía</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Cliente:</span>
                              <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Estado:</span>
                              <div className="text-gray-900 dark:text-white">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.details.status === 'completed' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                }`}>
                                  {log.details.status === 'completed' ? 'Completada' : log.details.status}
                                </span>
                              </div>
                            </div>
                      </div>
                      
                      {/* Producto Defectuoso */}
                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Producto Defectuoso:</span>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                          <div className="font-medium text-gray-900 dark:text-white">{log.details.productReceivedName || 'N/A'}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Referencia:</div>
                              <div className="text-xs font-semibold text-gray-900 dark:text-white">{log.details.productReceivedReference || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Cantidad:</div>
                              <div className="text-xs font-semibold text-gray-900 dark:text-white">{log.details.quantityReceived || 1} unidad</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400">Valor:</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                ${(log.details.productReceivedPrice || 0).toLocaleString('es-CO')}
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                      
                      {/* Producto de Reemplazo */}
                      {log.details.productDeliveredName && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Producto Entregado:</span>
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                            <div className="font-medium text-gray-900 dark:text-white">{log.details.productDeliveredName}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Referencia:</div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">{log.details.productDeliveredReference || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Cantidad:</div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">{log.details.quantityDelivered || 1} unidad</div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Valor:</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  ${(log.details.productDeliveredPrice || 0).toLocaleString('es-CO')}
                                </div>
                              </div>
                            </div>
                            
                            {/* Información de descuento de stock */}
                            {log.details.stockInfo && (
                              <div className="mt-3 border-t border-zinc-200/80 pt-3 dark:border-zinc-700">
                                <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Descuento de stock</div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {log.details.stockInfo.storeDeduction > 0 && (
                                    <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                      <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                        <Store className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                        Local
                                      </div>
                                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                        -{log.details.stockInfo.storeDeduction} unidad{log.details.stockInfo.storeDeduction !== 1 ? 'es' : ''}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        {log.details.stockInfo.previousStoreStock} → {log.details.stockInfo.newStoreStock}
                                      </div>
                                    </div>
                                  )}
                                  {log.details.stockInfo.warehouseDeduction > 0 && (
                                    <div className="rounded-md border border-zinc-200/80 bg-zinc-50/90 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                                      <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                        <Warehouse className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} aria-hidden />
                                        Bodega
                                      </div>
                                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                        -{log.details.stockInfo.warehouseDeduction} unidad{log.details.stockInfo.warehouseDeduction !== 1 ? 'es' : ''}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        {log.details.stockInfo.previousWarehouseStock} → {log.details.stockInfo.newWarehouseStock}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                      </div>
                        </div>
                      )}
                      
                      {log.details.reason && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Motivo:</span>
                          <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            {log.details.reason}
                          </div>
                        </div>
                      )}
                      
                      {log.details.notes && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-3">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Notas:</span>
                          <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            {log.details.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {log.action === 'warranty_status_update' && log.details && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Estado de garantía actualizado:</span>
                      <div className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 font-medium text-gray-600 mb-3">
                            <Shield className="h-4 w-4" />
                            <span>Cambio de Estado</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Estado Anterior:</span>
                              <div className="text-gray-900 dark:text-white">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-300">
                                  {log.details.previousStatus || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Estado Nuevo:</span>
                              <div className="text-gray-900 dark:text-white">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.details.newStatus === 'completed' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : log.details.newStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}>
                                  {log.details.newStatus || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Notas:</span>
                              <div className="text-gray-900 dark:text-white">{log.details.notes || 'Sin notas adicionales'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalles específicos para creación de crédito */}
                  {log.action === 'credit_create' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <CreditCard className="h-4 w-4" />
                        <span>Detalles del Crédito</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cliente:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Factura:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.invoiceNumber || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Monto Total:</span>
                          <div className="text-gray-900 dark:text-white font-bold text-lg">${(log.details.totalAmount || 0).toLocaleString('es-CO')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Monto Pendiente:</span>
                          <div className="text-gray-900 dark:text-white font-medium">${(log.details.pendingAmount || 0).toLocaleString('es-CO')}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Fecha de Vencimiento:</span>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {log.details.dueDate 
                              ? new Date(log.details.dueDate).toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'Sin fecha de vencimiento'}
                          </div>
                        </div>
                </div>
              </div>
                  )}

                  {/* Detalles específicos para abono a crédito */}
                  {log.action === 'credit_payment' && log.details && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600 mb-3">
                        <CreditCard className="h-4 w-4" />
                        <span>{log.details.isCompleted ? 'Detalles del Pago Completado' : 'Detalles del Abono'}</span>
                        {log.details.isCompleted && (
                          <span className="ml-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                            Crédito Completado
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Cliente:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.clientName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Número de Factura:</span>
                          <div className="text-gray-900 dark:text-white font-medium">{log.details.invoiceNumber || 'N/A'}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-300 text-xs">{log.details.isCompleted ? 'Monto del Pago Final:' : 'Monto del Abono:'}</span>
                          <div className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                            ${(log.details.paymentAmount || 0).toLocaleString('es-CO')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300 text-xs">Método de Pago:</span>
                          <div className="text-gray-900 dark:text-white font-medium">
                            {log.details.paymentMethod === 'cash' ? 'Efectivo' : 
                             log.details.paymentMethod === 'transfer' ? 'Transferencia (Nequi · Bancolombia)' : 
                             log.details.paymentMethod === 'card' ? 'Tarjeta' : 
                             log.details.paymentMethod === 'mixed' ? 'Mixto' : 
                             log.details.paymentMethod || 'N/A'}
                          </div>
                        </div>
                        {log.details.paymentMethod === 'mixed' && (
                          <>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Efectivo:</span>
                              <div className="text-gray-900 dark:text-white font-medium">
                                ${(log.details.cashAmount || 0).toLocaleString('es-CO')}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-xs">Transferencia:</span>
                              <div className="text-gray-900 dark:text-white font-medium">
                                ${(log.details.transferAmount || 0).toLocaleString('es-CO')}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="border-t border-gray-200 dark:border-neutral-600 pt-4">
                        <span className="text-gray-600 dark:text-gray-300 text-xs block mb-3 font-medium">Estado del Crédito:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Pendiente Anterior:</span>
                            <div className="text-gray-900 dark:text-white font-semibold">
                              ${(log.details.previousPendingAmount || 0).toLocaleString('es-CO')}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Pendiente Nuevo:</span>
                            <div className="text-gray-900 dark:text-white font-semibold">
                              ${(log.details.newPendingAmount || 0).toLocaleString('es-CO')}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Pagado Anterior:</span>
                            <div className="text-gray-900 dark:text-white font-semibold">
                              ${(log.details.previousPaidAmount || 0).toLocaleString('es-CO')}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Pagado Nuevo:</span>
                            <div className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              ${(log.details.newPaidAmount || 0).toLocaleString('es-CO')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {log.details.isCompleted && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-4">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-3 font-medium">Resumen del Crédito Completado:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                              <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Monto Total del Crédito:</span>
                              <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                ${(log.details.totalAmount || 0).toLocaleString('es-CO')}
                              </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                              <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Total Pagado:</span>
                              <div className="text-lg font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
                                ${(log.details.totalPaid || 0).toLocaleString('es-CO')}
                              </div>
                            </div>
                            {log.details.completedAt && (
                              <div className="col-span-2 rounded-lg border border-zinc-200/90 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                                <span className="text-gray-600 dark:text-gray-300 text-xs block mb-1">Fecha de Completación:</span>
                                <div className="text-gray-900 dark:text-white font-medium">
                                  {new Date(log.details.completedAt).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.details.paymentDescription && (
                        <div className="border-t border-gray-200 dark:border-neutral-600 pt-4">
                          <span className="text-gray-600 dark:text-gray-300 text-xs block mb-2">Descripción del Pago:</span>
                          <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg">
                            {log.details.paymentDescription}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-zinc-200/80 bg-zinc-50/90 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/60 md:px-6">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-zinc-200/90 bg-white px-4 text-sm font-medium text-zinc-700 shadow-none hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}