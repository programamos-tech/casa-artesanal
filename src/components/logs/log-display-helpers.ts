/**
 * Texto y derivación de tipo para logs de actividad (una sola fuente para la UI).
 */

export interface ActivityLogRecord {
  id: string
  action: string
  module: string
  details: any
  user_id?: string | null
  user_name?: string | null
  created_at: string
  description?: string | null
}

export function resolveLogType(log: ActivityLogRecord): string {
  if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
  if (log.action === 'sale_cancellation_stock_return_batch') return 'sale_cancellation_stock_return'

  if (log.module === 'sales') {
    if (log.action === 'sale_create') return 'sale'
    if (log.action === 'credit_sale_create') return 'credit_sale_create'
    if (log.action === 'sale_cancel') {
      return (log.details as any)?.isCreditSale ? 'credit_sale_cancel' : 'sale_cancel'
    }
    if (log.action === 'sale_stock_deduction') return 'sale_stock_deduction'
    if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
    return 'sale'
  }
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
  if (log.module === 'products') {
    if (log.action === 'product_create') return 'product_create'
    if (log.action === 'product_update') return 'product_update'
    if (log.action === 'product_delete') return 'product_delete'
    if (log.action === 'stock_transfer') return 'transfer'
    if (log.action === 'stock_adjustment') return 'adjustment'
    if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
    return 'product_create'
  }
  if (log.module === 'categories') {
    if (log.action === 'category_create') return 'category_create'
    if (log.action === 'category_update') return 'category_update'
    if (log.action === 'category_delete') return 'category_delete'
    return 'category_create'
  }
  if (log.module === 'clients') {
    if (log.action === 'client_create') return 'client_create'
    if (log.action === 'client_update') return 'client_update'
    if (log.action === 'client_delete') return 'client_delete'
    return 'client_create'
  }
  if (log.module === 'warranties') {
    if (log.action === 'warranty_create') return 'warranty_create'
    if (log.action === 'warranty_status_update') return 'warranty_status_update'
    if (log.action === 'warranty_update') return 'warranty_update'
    return 'warranty_create'
  }
  if (log.module === 'sales' && log.action.includes('Venta')) return 'sale'
  if (log.module === 'payments') {
    if (log.action.includes('Transferencia')) return 'transfer'
    return 'transfer'
  }
  if (log.module === 'credits') {
    if (log.action === 'credit_create') return 'credit_create'
    if (log.action === 'credit_payment') {
      return (log.details as any)?.isCompleted ? 'credit_completed' : 'credit_payment'
    }
    if (log.action === 'credit_completed') return 'credit_completed'
    if (log.action === 'credit_cancelled') return 'credit_cancelled'
    return 'credit_create'
  }
  if (log.module === 'auth') return 'login'
  if (log.module === 'transfers') {
    if (log.action === 'transfer_created') return 'transfer'
    if (log.action === 'transfer_received') return 'transfer'
    if (log.action === 'transfer_cancelled') return 'transfer'
    return 'transfer'
  }
  return 'roles'
}

export function labelForLogType(type: string): string {
  switch (type) {
    case 'transfer':
      return 'Transferencia de Stock'
    case 'sale':
    case 'sale_create':
      return 'Venta'
    case 'credit_sale_create':
      return 'Venta a Crédito'
    case 'sale_cancel':
      return 'Venta Cancelada'
    case 'credit_sale_cancel':
      return 'Venta tipo crédito cancelada'
    case 'sale_stock_deduction':
      return 'Descuento de Stock'
    case 'sale_cancellation_stock_return':
      return 'Devolución de Stock'
    case 'sale_cancellation_stock_return_batch':
      return 'Devolución de Stock Masiva'
    case 'product_create':
      return 'Producto Creado'
    case 'product_update':
      return 'Producto Actualizado'
    case 'product_edit':
      return 'Producto Editado'
    case 'product_delete':
      return 'Producto Eliminado'
    case 'adjustment':
      return 'Ajuste de Stock'
    case 'category_create':
      return 'Categoría Creada'
    case 'category_update':
      return 'Categoría Actualizada'
    case 'category_delete':
      return 'Categoría Eliminada'
    case 'category_edit':
      return 'Categoría Editada'
    case 'client_create':
      return 'Cliente Creado'
    case 'client_edit':
    case 'client_update':
      return 'Cliente Editado'
    case 'client_delete':
      return 'Cliente Eliminado'
    case 'warranty_create':
      return 'Garantía Creada'
    case 'warranty_status_update':
      return 'Estado de Garantía Actualizado'
    case 'warranty_update':
      return 'Garantía Actualizada'
    case 'credit_create':
      return 'Crédito Creado'
    case 'credit_payment':
      return 'Abono Registrado'
    case 'credit_completed':
      return 'Pago Completado'
    case 'credit_cancelled':
      return 'Crédito Cancelado'
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
    case 'login':
      return 'Inicio de Sesión'
    default:
      return type || 'Actividad'
  }
}

export function getModuleBadgeLabel(log: ActivityLogRecord): string {
  switch (log.module) {
    case 'roles':
      return 'Usuarios'
    case 'products':
      return 'Productos'
    case 'clients':
      return 'Clientes'
    case 'credits':
      return 'Créditos'
    case 'warranties':
      return 'Garantías'
    case 'sales':
      return 'Ventas'
    case 'payments':
      return 'Abonos'
    case 'transfers':
      return 'Transferencias'
    case 'logs':
      return 'Logs'
    case 'auth':
      return 'Acceso'
    case 'categories':
      return 'Categorías'
    default:
      return log.module || 'Sistema'
  }
}

export function getLogActionLabel(log: ActivityLogRecord): string {
  if (log.module === 'auth') return 'Acceso'
  if (log.module === 'sales') {
    if (log.action === 'sale_create') return 'Crear Venta'
    if (log.action === 'credit_sale_create') return 'Crear Venta a Crédito'
    if (log.action === 'sale_cancel') {
      return (log.details as any)?.isCreditSale ? 'Cancelar Factura de Crédito' : 'Cancelar Venta'
    }
    if (log.action === 'sale_stock_deduction') return 'Descontar Stock'
    if (log.action === 'sale_cancellation_stock_return') return 'Devolver Stock'
    if (log.action === 'sale_cancellation_stock_return_batch') return 'Devolver Stock Masivo'
    return log.action
  }
  if (log.module === 'products') {
    if (log.action === 'product_create') return 'Crear'
    if (log.action === 'product_update') return 'Actualizar'
    if (log.action === 'product_delete') return 'Eliminar'
    if (log.action === 'stock_transfer') return 'Transferir'
    if (log.action === 'stock_adjustment') return 'Ajustar'
    if (log.action === 'sale_cancellation_stock_return') return 'Devolver Stock'
    if (log.action === 'sale_cancellation_stock_return_batch') return 'Devolver Stock Masivo'
    return log.action
  }
  if (log.module === 'transfers') {
    if (log.action === 'transfer_created') return 'Transferencia Creada'
    if (log.action === 'transfer_received') return 'Transferencia Recibida'
    if (log.action === 'transfer_cancelled') return 'Transferencia Cancelada'
    return log.action
  }
  if (log.module === 'categories') {
    if (log.action === 'category_create') return 'Crear'
    if (log.action === 'category_update') return 'Actualizar'
    if (log.action === 'category_delete') return 'Eliminar'
    return log.action
  }
  if (log.module === 'clients') {
    if (log.action === 'client_create') return 'Crear Cliente'
    if (log.action === 'client_update') return 'Actualizar Cliente'
    if (log.action === 'client_delete') return 'Eliminar Cliente'
    return log.action
  }
  if (log.module === 'warranties') {
    if (log.action === 'warranty_create') return 'Crear Garantía'
    if (log.action === 'warranty_status_update') return 'Actualizar Estado'
    if (log.action === 'warranty_update') return 'Actualizar Garantía'
    return log.action
  }
  if (log.module === 'credits') {
    if (log.action === 'credit_create') return 'Crear Crédito'
    if (log.action === 'credit_payment') {
      return (log.details as any)?.isCompleted ? 'Pago Completado' : 'Registrar Abono'
    }
    if (log.action === 'credit_completed') return 'Completar Crédito'
    if (log.action === 'credit_cancelled') return 'Cancelar Crédito'
    return log.action
  }
  return log.action
}

export function getLogDescriptionText(log: ActivityLogRecord): string {
  if (log.description?.trim()) return log.description.trim()

  if (log.details) {
    if (log.module === 'sales') {
      if (log.action === 'sale_create') {
        return `Nueva venta: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}`
      }
      if (log.action === 'credit_sale_create') {
        return `Venta a crédito: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}`
      }
      if (log.action === 'sale_cancel') {
        return (log.details as any)?.isCreditSale
          ? `Factura perteneciente a un crédito cancelada: ${log.details.invoiceNumber || 'N/A'} - ${log.details.reason || 'Sin motivo'}`
          : `Venta cancelada: ${log.details.reason || 'Sin motivo'}`
      }
      if (log.action === 'sale_stock_deduction') return log.details.description || 'Stock descontado por venta'
      if (log.action === 'sale_cancellation_stock_return') {
        return log.details.description || 'Stock devuelto por cancelación'
      }
      return log.details.description || log.action
    }
    if (log.module === 'roles') {
      if (log.action === 'Usuario Creado') return `Nuevo usuario: ${log.details.newUser?.name || 'Usuario'}`
      if (log.action === 'Usuario Editado') return `Actualización: ${log.details.userName || 'Usuario'}`
      if (log.action === 'Usuario Eliminado') return `Usuario eliminado: ${log.details.deletedUser?.name || 'Usuario'}`
      if (log.action === 'Permisos Asignados') return `${log.details.description || 'Permisos asignados'}`
      return log.action
    }
    if (log.module === 'transfers') {
      if (log.action === 'transfer_created' || log.action === 'transfer_received' || log.action === 'transfer_cancelled') {
        if (log.action === 'transfer_cancelled') {
          return log.details.description || 'Transferencia cancelada'
        }
        const products = (log.details as any)?.products
        if (products && Array.isArray(products) && products.length > 0) {
          return products
            .map(
              (p: any) =>
                `${p.quantity || 0} ${p.productName || 'Producto'}${p.productReference ? ` (${p.productReference})` : ''}`
            )
            .join(', ')
        }
        return log.details.description || 'Transferencia de productos'
      }
      return log.details.description || 'Transferencia'
    }
    if (log.module === 'products') {
      return log.details.description || log.action
    }
    if (log.module === 'categories') {
      if (log.action === 'category_create') return `Nueva categoría: "${log.details.categoryName || 'Categoría'}"`
      if (log.action === 'category_update') return `Categoría actualizada: "${log.details.categoryName || 'Categoría'}"`
      if (log.action === 'category_delete') return `Categoría eliminada: "${log.details.categoryName || 'Categoría'}"`
      return log.details.description || log.action
    }
    if (log.module === 'clients') {
      if (log.action === 'client_create') return `Nuevo cliente: "${log.details.clientName || 'Cliente'}"`
      if (log.action === 'client_update') {
        return log.details.changes && Object.keys(log.details.changes).length > 0
          ? `Cliente actualizado: "${log.details.clientName || 'Cliente'}" - Campos: ${Object.keys(log.details.changes).join(', ')}`
          : `Cliente actualizado: "${log.details.clientName || 'Cliente'}"`
      }
      if (log.action === 'client_delete') return `Cliente eliminado: "${log.details.clientName || 'Cliente'}"`
      return log.details.description || log.action
    }
    if (log.module === 'warranties') {
      if (log.action === 'warranty_create') {
        return `Nueva garantía: "${log.details.clientName || 'Cliente'}" - ${log.details.productReceivedName || 'Producto'}`
      }
      if (log.action === 'warranty_status_update') {
        return `Estado actualizado: ${log.details.previousStatus || 'N/A'} → ${log.details.newStatus || 'N/A'}`
      }
      if (log.action === 'warranty_update') return `Garantía actualizada: "${log.details.clientName || 'Cliente'}"`
      return log.details.description || log.action
    }
    if (log.module === 'credits') {
      if (log.action === 'credit_create') {
        return `Crédito creado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.totalAmount || 0).toLocaleString('es-CO')}`
      }
      if (log.action === 'credit_payment') {
        return (log.details as any)?.isCompleted
          ? `Pago completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`
          : `Abono registrado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`
      }
      if (log.action === 'credit_completed') {
        return `Crédito completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}`
      }
      if (log.action === 'credit_cancelled') {
        return `Crédito cancelado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}`
      }
      return log.details.description || log.action
    }
    if (log.module === 'auth') return 'Ingresó al sistema'
    return log.action
  }
  if (log.module === 'auth') return 'Ingresó al sistema'
  return log.action
}

export function formatLogDateTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
