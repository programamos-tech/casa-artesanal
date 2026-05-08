'use client'

import { User, Permission } from '@/types'
import { useAuth } from '@/contexts/auth-context'

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'cancel']

// Permisos por defecto cuando un usuario con rol "vendedor"/"vendedora" no tiene permisos explícitos guardados.
const defaultVendedorPermissions: Record<string, string[]> = {
  dashboard: ALL_ACTIONS,
  clients: ALL_ACTIONS,
  sales: ALL_ACTIONS,
  payments: ALL_ACTIONS,
}

// Permisos por defecto del rol "cajero" (atiende caja, no edita productos ni hace transferencias).
const defaultCajeroPermissions: Record<string, string[]> = {
  dashboard: ALL_ACTIONS,
  sales: ALL_ACTIONS,
  clients: ALL_ACTIONS,
  payments: ALL_ACTIONS,
  warranties: ALL_ACTIONS,
}

export function usePermissions() {
  const { user: currentUser } = useAuth()

  const hasPermission = (module: string, action: string): boolean => {
    if (!currentUser) return false
    
    // Super admin tiene todos los permisos (cualquier variante del rol)
    const roleNorm = (currentUser.role || '').toLowerCase().trim()
    if (roleNorm === 'superadmin' || (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))) return true

    // El dashboard es accesible para todos los usuarios autenticados
    if (module === 'dashboard' && action === 'view') return true
    
    const userRole = currentUser.role?.toLowerCase() || ''

    // Rol inventario: solo productos por defecto (el resto según permisos guardados del usuario)
    if (userRole === 'inventario' && module === 'products') {
      return ALL_ACTIONS.includes(action)
    }

    // Restricción especial para vendedores
    if (userRole === 'vendedor' || userRole === 'vendedora') {
      if (module === 'products') {
        return action === 'view' // Solo permitir ver productos
      }
      if (module === 'transfers') {
        return false // Vendedores no pueden transferir
      }
      
      // Los vendedores SIEMPRE pueden crear ventas, sin importar los permisos explícitos
      if (module === 'sales' && action === 'create') {
        return true
      }
      
      const hasExplicitPermissions = currentUser.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0
      if (!hasExplicitPermissions) {
        const allowedActions = defaultVendedorPermissions[module] || []
        return allowedActions.includes(action)
      }
    }

    // Restricciones del rol cajero (atiende caja: ventas, clientes, pagos, garantías; productos solo ver).
    if (userRole === 'cajero') {
      if (module === 'products') {
        return action === 'view'
      }
      if (
        module === 'transfers' ||
        module === 'receptions' ||
        module === 'supplier_invoices' ||
        module === 'roles' ||
        module === 'logs'
      ) {
        return false
      }

      // El cajero SIEMPRE puede crear ventas, igual que el vendedor.
      if (module === 'sales' && action === 'create') {
        return true
      }

      const hasExplicitPermissions =
        currentUser.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0
      if (!hasExplicitPermissions) {
        const allowedActions = defaultCajeroPermissions[module] || []
        return allowedActions.includes(action)
      }
    }
    
    // Verificar que el usuario tenga permisos explícitos
    if (!currentUser.permissions || !Array.isArray(currentUser.permissions) || currentUser.permissions.length === 0) {
      // Si no hay permisos explícitos, NO dar permisos por defecto (excepto para vendedores que ya se manejó arriba)
      return false
    }
    
    // Buscar el módulo en los permisos del usuario
    const modulePermission = currentUser.permissions.find(p => p.module === module)
    if (!modulePermission) {
      // Si es vendedor y no encuentra el módulo en permisos explícitos, usar permisos por defecto
      if (userRole === 'vendedor' || userRole === 'vendedora') {
        const allowedActions = defaultVendedorPermissions[module] || []
        return allowedActions.includes(action)
      }
      if (userRole === 'cajero') {
        const allowedActions = defaultCajeroPermissions[module] || []
        return allowedActions.includes(action)
      }
      return false
    }
    
    // Soporte para ambas estructuras: "actions" o "permissions"
    const actions = modulePermission.actions || modulePermission.permissions || []
    if (!Array.isArray(actions)) {
      // Si es vendedor y las acciones no son válidas, usar permisos por defecto
      if (userRole === 'vendedor' || userRole === 'vendedora') {
        const allowedActions = defaultVendedorPermissions[module] || []
        return allowedActions.includes(action)
      }
      if (userRole === 'cajero') {
        const allowedActions = defaultCajeroPermissions[module] || []
        return allowedActions.includes(action)
      }
      return false
    }
    
    // Verificar si tiene la acción específica
    const hasAction = actions.includes(action)
    
    // Si es vendedor y no tiene la acción pero el módulo es sales/clients/payments, usar permisos por defecto
    if (!hasAction && (userRole === 'vendedor' || userRole === 'vendedora')) {
      const allowedActions = defaultVendedorPermissions[module] || []
      return allowedActions.includes(action)
    }
    if (!hasAction && userRole === 'cajero') {
      const allowedActions = defaultCajeroPermissions[module] || []
      return allowedActions.includes(action)
    }
    
    return hasAction
  }

  const canView = (module: string): boolean => {
    return hasPermission(module, 'view')
  }

  const canCreate = (module: string): boolean => {
    return hasPermission(module, 'create')
  }

  const canEdit = (module: string): boolean => {
    return hasPermission(module, 'edit')
  }

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete')
  }

  const canCancel = (module: string): boolean => {
    return hasPermission(module, 'cancel')
  }

  const getAccessibleModules = (): string[] => {
    if (!currentUser) return []
    
    const roleNorm = (currentUser.role || '').toLowerCase().trim()
    if (roleNorm === 'superadmin' || (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))) {
      return ['dashboard', 'products', 'transfers', 'receptions', 'clients', 'sales', 'payments', 'supplier_invoices', 'warranties', 'roles', 'logs', 'stores']
    }

    // Inventario: dashboard + solo los módulos que tenga marcados en permisos (ej. solo Productos)
    if (currentUser.role?.toLowerCase() === 'inventario') {
      const fromPermissions = currentUser.permissions && Array.isArray(currentUser.permissions)
        ? currentUser.permissions
            .filter(p => (p.actions || p.permissions || []).includes('view'))
            .map(p => p.module)
        : []
      return Array.from(new Set(['dashboard', ...fromPermissions]))
    }

    // Cajero: si no hay permisos explícitos, usar la lista por defecto del rol.
    if (currentUser.role?.toLowerCase() === 'cajero') {
      const hasExplicit = currentUser.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0
      if (!hasExplicit) {
        return Object.keys(defaultCajeroPermissions)
      }
      const fromPermissions = currentUser.permissions
        .filter(p => (p.actions || p.permissions || []).includes('view'))
        .map(p => p.module)
      return Array.from(new Set(['dashboard', ...Object.keys(defaultCajeroPermissions), ...fromPermissions]))
    }
    
    if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) return []
    
    const modules = currentUser.permissions
      .filter(p => {
        const actions = p.actions || p.permissions || []
        return Array.isArray(actions) && actions.includes('view')
      })
      .map(p => p.module)

    return Array.from(new Set(['dashboard', ...modules]))
  }

  const getModuleActions = (module: string): string[] => {
    if (!currentUser) return []
    
    const roleNorm = (currentUser.role || '').toLowerCase().trim()
    if (roleNorm === 'superadmin' || (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))) {
      return ['view', 'create', 'edit', 'delete', 'cancel']
    }

    if (currentUser.role?.toLowerCase() === 'inventario') {
      if (module === 'products') return ALL_ACTIONS
      // transfers y receptions solo si están en los permisos del usuario
    }

    if (currentUser.role?.toLowerCase() === 'cajero') {
      const defaults = defaultCajeroPermissions[module]
      if (defaults) return defaults
      if (module === 'products') return ['view']
    }
    
    if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) return []
    
    const modulePermission = currentUser.permissions.find(p => p.module === module)
    if (!modulePermission) return []
    
    // Soporte para ambas estructuras: "actions" o "permissions"
    const actions = modulePermission.actions || modulePermission.permissions || []
    return Array.isArray(actions) ? actions : []
  }

  return {
    currentUser,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canCancel,
    getAccessibleModules,
    getModuleActions
  }
}
