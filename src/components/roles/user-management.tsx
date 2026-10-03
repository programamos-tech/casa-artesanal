'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/auth-context'
import { User, Permission, Store } from '@/types'
import { ChevronDown, Eye, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { StoresService } from '@/lib/stores-service'
import { canAccessAllStores } from '@/lib/store-helper'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'
import { StatusDot } from '@/components/dashboard/report-ui'
import { cn } from '@/lib/utils'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'
import { isOwnerRole, isProductAdminAction } from '@/lib/roles'

export const roleOptions = [
  { value: 'superadmin', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'contador', label: 'Contador' },
  { value: 'supervisor_tienda', label: 'Supervisor de tienda' },
]

export const moduleOptions = [
  { value: 'dashboard', label: 'Reportes' },
  { value: 'products', label: 'Productos' },
  ...(isTransfersAndReceptionsEnabled()
    ? [
        { value: 'transfers', label: 'Traslados' },
        { value: 'receptions', label: 'Recepciones' },
      ]
    : []),
  { value: 'clients', label: 'Clientes' },
  { value: 'sales', label: 'Ventas' },
  { value: 'payments', label: 'Créditos' },
  { value: 'supplier_invoices', label: 'Facturador' },
  { value: 'egresos', label: 'Egresos' },
  { value: 'cash_register', label: 'Caja' },
  { value: 'warranties', label: 'Garantías' },
  { value: 'roles', label: 'Roles' },
  { value: 'logs', label: 'Actividades' }
]

const actionOptions = [
  { value: 'view', label: 'Ver' },
  { value: 'create', label: 'Crear' },
  { value: 'edit', label: 'Editar' },
  { value: 'delete', label: 'Eliminar' },
  { value: 'cancel', label: 'Cancelar' }
]

/** Inventario: create/edit/delete solo en rol propietario; el resto queda en view. */
function sanitizePermissionsForRole(role: string, permissions: Permission[]): Permission[] {
  if (isOwnerRole(role)) return permissions
  return (permissions || []).map((p) => {
    if (!p || p.module !== 'products') return p
    const actions = (p.actions || (p as { permissions?: string[] }).permissions || []).filter(
      (a) => !isProductAdminAction(a)
    )
    const next = actions.includes('view') ? actions : ['view', ...actions]
    return { ...p, actions: Array.from(new Set(next)) }
  })
}

// Permisos predefinidos por rol - todas las acciones se asignan automáticamente
const allActions = ['view', 'create', 'edit', 'delete', 'cancel']

const rolePermissions = {
  'superadmin': [
    { module: 'dashboard', actions: allActions },
    { module: 'products', actions: allActions },
    { module: 'clients', actions: allActions },
    { module: 'sales', actions: allActions },
    { module: 'payments', actions: allActions },
    { module: 'supplier_invoices', actions: allActions },
    { module: 'egresos', actions: allActions },
    { module: 'cash_register', actions: allActions },
    { module: 'warranties', actions: allActions },
    { module: 'roles', actions: allActions },
    { module: 'logs', actions: allActions }
  ],
  'admin': [
    { module: 'dashboard', actions: allActions },
    { module: 'sales', actions: allActions },
    { module: 'payments', actions: allActions },
    { module: 'supplier_invoices', actions: allActions },
    { module: 'egresos', actions: allActions },
    { module: 'cash_register', actions: allActions }
  ],
  'vendedor': [
    { module: 'dashboard', actions: allActions },
    { module: 'products', actions: ['view'] }, // Solo ver productos, no editar/eliminar
    ...(isTransfersAndReceptionsEnabled()
      ? [
          { module: 'transfers', actions: allActions },
          { module: 'receptions', actions: allActions },
        ]
      : []),
    { module: 'egresos', actions: allActions },
    { module: 'cash_register', actions: allActions },
    { module: 'clients', actions: allActions },
    { module: 'sales', actions: allActions },
    { module: 'payments', actions: allActions }
  ],
  'cajero': [
    { module: 'dashboard', actions: allActions },
    { module: 'sales', actions: allActions },
    { module: 'clients', actions: allActions },
    { module: 'products', actions: ['view'] }, // Solo ver productos
    { module: 'payments', actions: allActions },
    { module: 'warranties', actions: allActions },
    { module: 'egresos', actions: ['view', 'create'] },
    { module: 'cash_register', actions: allActions }
  ],
  'inventario': [
    { module: 'products', actions: ['view'] },
    { module: 'supplier_invoices', actions: allActions }
  ],
  'contador': [
    { module: 'dashboard', actions: ['view'] },
    { module: 'payments', actions: allActions },
    { module: 'supplier_invoices', actions: allActions },
    { module: 'egresos', actions: allActions }
  ],
  'supervisor_tienda': [
    { module: 'dashboard', actions: allActions },
    { module: 'products', actions: ['view'] },
    { module: 'sales', actions: allActions },
    { module: 'clients', actions: allActions },
    { module: 'egresos', actions: allActions }
  ],
}

const roleDescriptions: Record<string, string> = {
  superadmin: 'Acceso completo. Único rol que administra inventario: productos, stock y precios.',
  admin: 'Reportes, ventas, créditos, proveedores, egresos y caja.',
  cajero: 'Reportes, ventas, clientes, créditos, garantías, caja y registro de egresos. Productos solo lectura.',
  vendedor: 'Reportes, ventas, clientes, créditos, egresos y caja. Productos solo lectura.',
  inventario: 'Consulta de productos y facturas de proveedores. No edita stock ni precios.',
  contador: 'Reportes (lectura), créditos, proveedores y egresos.',
  supervisor_tienda: 'Reportes, ventas, clientes y egresos de su tienda. Productos solo lectura.',
}

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const rowDangerIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 dark:text-white/40 dark:hover:text-rose-400'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const filterSelectWrapClass = 'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const filterChevronClass =
  'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40'

const selectChevronClass =
  'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40'

function formatLastLogin(value?: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function UserManagement() {
  const router = useRouter()
  const { user: currentUser, getAllUsers, createUser, updateUser, deleteUser } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [mainStore, setMainStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const canManageStores = currentUser && canAccessAllStores(currentUser)

  // Formulario para crear/editar usuario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    permissions: [] as any[],
    isActive: true,
    storeId: '' // ID de la tienda asignada
  })

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  // Aplicar permisos cuando se cambia el rol (solo al crear, no al editar)
  useEffect(() => {
    // Solo aplicar permisos del rol si estamos creando un usuario nuevo (no hay selectedUser y estamos en modal de creación)
    if (formData.role && !selectedUser && isCreateModalOpen && !isEditModalOpen) {
      const permissions = rolePermissions[formData.role as keyof typeof rolePermissions] || []
      setFormData(prev => {
        // Solo actualizar si los permisos son diferentes para evitar loops
        const currentModules = prev.permissions.map(p => p.module).sort().join(',')
        const newModules = permissions.map(p => p.module).sort().join(',')
        if (currentModules !== newModules) {
          return { ...prev, permissions }
        }
        return prev
      })
    }
  }, [formData.role, selectedUser, isCreateModalOpen, isEditModalOpen])

  // Cargar usuarios y tiendas
  useEffect(() => {
    loadUsers()
    if (canManageStores) {
      loadStores()
    }
  }, [canManageStores])

  const loadStores = async () => {
    try {
      const storesData = await StoresService.getAllStores(true) // Incluir inactivas
      // Obtener la tienda principal
      const mainStoreData = await StoresService.getMainStore()
      setStores(storesData)
      setMainStore(mainStoreData)
    } catch (error) {
      console.error('Error loading stores:', error)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {

      const usersData = await getAllUsers()

      setUsers(usersData)
    } catch (error) {
      // Error silencioso en producción
      toast.error('Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Crear usuario
  const handleCreateUser = async () => {
    try {
      const userData = {
        ...formData,
        permissions: sanitizePermissionsForRole(formData.role, formData.permissions),
        storeId: formData.storeId || undefined // Convertir string vacío a undefined
      }

      const success = await createUser(userData)

      if (success) {
        toast.success('Usuario creado exitosamente')
        setIsCreateModalOpen(false)
        resetForm()
        // Recargar usuarios después de crear
        await loadUsers()
      } else {
        toast.error('Error creando usuario')
      }
    } catch (error) {
      // Error silencioso en producción
      toast.error('Error creando usuario')
    }
  }

  // Actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {

      const success = await updateUser(selectedUser.id, {
        ...formData,
        permissions: sanitizePermissionsForRole(formData.role, formData.permissions),
      })
      if (success) {
        toast.success('Usuario actualizado exitosamente')
        setIsEditModalOpen(false)
        setSelectedUser(null)
        loadUsers()
      } else {
        toast.error('Error actualizando usuario')
      }
    } catch (error) {
      // Error silencioso en producción
      toast.error('Error actualizando usuario')
    }
  }

  // Abrir modal de confirmación de eliminación
  const openDeleteModal = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminar tu propio usuario')
      return
    }
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteUser(userToDelete.id)
      if (success) {
        toast.success('Usuario eliminado exitosamente')
        loadUsers()
        setIsDeleteModalOpen(false)
        setUserToDelete(null)
      } else {
        toast.error('Error eliminando usuario')
      }
    } catch (error) {
      toast.error('Error eliminando usuario')
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancelar eliminación
  const cancelDelete = () => {
    setIsDeleteModalOpen(false)
    setUserToDelete(null)
  }

  // Abrir modal de edición
  const openEditModal = (user: User) => {
    try {
      setSelectedUser(user)
      
      // Validar y normalizar permisos
      // Soporta dos formatos:
      // 1. Formato nuevo: { module: "dashboard", actions: ["view"] }
      // 2. Formato DB actual: { module: "dashboard", permissions: ["view", "create", ...] }
      let normalizedPermissions: Permission[] = []
      if (user.permissions) {
        if (Array.isArray(user.permissions)) {
          normalizedPermissions = user.permissions
            .filter((p: any) => p && typeof p === 'object' && p.module)
            .map((p: any) => {
              // Detectar formato: si tiene 'permissions' (DB) o 'actions' (código)
              const actionsArray = p.actions || p.permissions || []
              return {
                module: String(p.module),
                actions: Array.isArray(actionsArray) ? actionsArray.map((a: any) => String(a)) : []
              }
            })
        } else if (typeof user.permissions === 'string') {
          // Intentar parsear si es un string JSON
          try {
            const parsed = JSON.parse(user.permissions)
            if (Array.isArray(parsed)) {
              normalizedPermissions = parsed
                .filter((p: any) => p && typeof p === 'object' && p.module)
                .map((p: any) => {
                  const actionsArray = p.actions || p.permissions || []
                  return {
                    module: String(p.module),
                    actions: Array.isArray(actionsArray) ? actionsArray.map((a: any) => String(a)) : []
                  }
                })
            }
          } catch (e) {
            console.error('[UserManagement] Error parsing permissions:', e)
            normalizedPermissions = []
          }
        }
      }
      
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', // No mostrar contraseña
        role: user.role || 'vendedor',
        permissions: normalizedPermissions,
        isActive: user.isActive !== undefined ? user.isActive : true,
        storeId: user.storeId || ''
      })
      setIsEditModalOpen(true)
    } catch (error: any) {
      console.error('[UserManagement] Error opening edit modal:', error)
      toast.error('Error al abrir el modal de edición. Por favor, intenta nuevamente.')
    }
  }

  // Resetear formulario
  const resetForm = () => {
    const defaultRole = 'vendedor'
    const defaultPermissions = rolePermissions[defaultRole as keyof typeof rolePermissions] || []
    setFormData({
      name: '',
      email: '',
      password: '',
      storeId: '',
      role: defaultRole,
      permissions: defaultPermissions,
      isActive: true
    })
    setSelectedUser(null)
  }
  
  // Abrir modal de creación
  const openCreateModal = () => {
    const defaultRole = 'vendedor'
    const defaultPermissions = rolePermissions[defaultRole as keyof typeof rolePermissions] || []
    setFormData({
      name: '',
      email: '',
      password: '',
      storeId: '',
      role: defaultRole,
      permissions: defaultPermissions,
      isActive: true
    })
    setSelectedUser(null)
    setIsCreateModalOpen(true)
  }

  // Toggle permiso de módulo completo
  // Cuando se activa un módulo, se le dan todas las acciones automáticamente
  const toggleModule = (module: string) => {
    try {
      if (!formData.permissions || !Array.isArray(formData.permissions)) {
        // Si no hay permisos, crear uno nuevo (productos: solo view salvo propietario)
        const allActions = ['view', 'create', 'edit', 'delete', 'cancel']
        const actions =
          module === 'products' && !isOwnerRole(formData.role) ? ['view'] : allActions
        setFormData({ ...formData, permissions: [{ module, actions }] })
        return
      }
      
      const newPermissions = [...formData.permissions]
      const existingPermission = newPermissions.find(p => 
        p && typeof p === 'object' && p.module === module
      )
      
      if (existingPermission) {
        // Si existe, eliminar el módulo (desactivar)
        const index = newPermissions.indexOf(existingPermission)
        if (index > -1) {
          newPermissions.splice(index, 1)
        }
      } else {
        // Si no existe, agregar el módulo (productos: solo view salvo propietario)
        const allActions = ['view', 'create', 'edit', 'delete', 'cancel']
        const actions =
          module === 'products' && !isOwnerRole(formData.role) ? ['view'] : allActions
        newPermissions.push({ module, actions })
      }
      
      setFormData({ ...formData, permissions: newPermissions })
    } catch (error: any) {
      console.error('[UserManagement] Error toggling module:', error)
      toast.error('Error al modificar el permiso')
    }
  }

  // Verificar si tiene acceso al módulo (cualquier acción significa que tiene acceso)
  const hasModuleAccess = (module: string) => {
    try {
      if (!formData.permissions || !Array.isArray(formData.permissions)) {
        return false
      }
      
      const permission = formData.permissions.find(p => 
        p && 
        typeof p === 'object' && 
        p.module === module
      )
      
      if (!permission) {
        return false
      }
      
      // Soportar ambos formatos: 'actions' (código) o 'permissions' (DB)
      const actionsArray = permission.actions || permission.permissions || []
      if (!Array.isArray(actionsArray)) {
        return false
      }
      
      // Si tiene al menos una acción, tiene acceso al módulo
      return actionsArray.length > 0
    } catch (error: any) {
      console.error('[UserManagement] Error checking module access:', error)
      return false
    }
  }

  // Aplicar permisos predefinidos del rol
  // Solo aplica permisos cuando se está creando un usuario nuevo, no al editar
  const applyRolePermissions = (role: string) => {
    // Si estamos editando, solo cambiar el rol sin tocar los permisos
    if (selectedUser || isEditModalOpen) {
      setFormData(prev => ({ ...prev, role }))
      return
    }
    
    // Si estamos creando, aplicar permisos del rol inmediatamente
    const permissions = rolePermissions[role as keyof typeof rolePermissions] || []
    setFormData(prev => ({ ...prev, role, permissions }))
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
          aria-hidden
        />
      </div>
    )
  }

  const roleLabel = (role: string) => roleOptions.find((r) => r.value === role)?.label || role

  const storeLabel = (storeId?: string | null) => {
    if (!storeId || storeId === MAIN_STORE_ID) return mainStore?.name || 'Principal'
    return stores.find((s) => s.id === storeId)?.name || '—'
  }

  const closeUserModal = (mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setIsCreateModalOpen(false)
      resetForm()
    } else {
      setIsEditModalOpen(false)
    }
  }

  const renderUserModal = (mode: 'create' | 'edit') => {
    const isCreate = mode === 'create'
    return createPortal(
      <div className={modalOverlayClass} role="presentation" onClick={() => closeUserModal(mode)}>
        <div
          className={cn(modalPanelClass, 'max-w-3xl')}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={modalHeaderClass}>
            <div className="min-w-0">
              <h2 id="user-modal-title" className={modalTitleClass}>
                {isCreate ? 'Nuevo usuario' : 'Editar usuario'}
              </h2>
              <p className={modalSubtitleClass}>
                {isCreate ? 'Datos, rol y permisos' : selectedUser?.name || 'Datos, rol y permisos'}
              </p>
            </div>
            <button
              type="button"
              className={modalCloseButtonClass}
              onClick={() => closeUserModal(mode)}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className={modalBodyClass}>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <label htmlFor="user-name" className={modalLabelClass}>
                    Nombre completo{isCreate ? ' *' : ''}
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={modalInputClass}
                    placeholder="Ej: Juan Pérez"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="user-email" className={modalLabelClass}>
                    Email{isCreate ? ' *' : ''}
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={modalInputClass}
                    placeholder="juan@casa-artesanal.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="user-password" className={modalLabelClass}>
                    {isCreate ? 'Contraseña *' : 'Nueva contraseña'}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={modalInputClass}
                    placeholder={isCreate ? 'Mínimo 6 caracteres' : 'Dejar vacío para mantener la actual'}
                    autoComplete="new-password"
                  />
                </div>

                <div className={cn('grid gap-3', canManageStores && 'sm:grid-cols-2')}>
                  <div>
                    <label htmlFor="user-role" className={modalLabelClass}>
                      Rol{isCreate ? ' *' : ''}
                    </label>
                    <div className="relative">
                      <select
                        id="user-role"
                        value={formData.role}
                        onChange={(e) => applyRolePermissions(e.target.value)}
                        className={cn(modalInputClass, 'cursor-pointer appearance-none pr-8')}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={selectChevronClass} strokeWidth={1.75} aria-hidden />
                    </div>
                  </div>
                  {canManageStores && (
                    <div>
                      <label htmlFor="user-store" className={modalLabelClass}>
                        Tienda
                      </label>
                      <div className="relative">
                        <select
                          id="user-store"
                          value={formData.storeId || mainStore?.id || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setFormData({ ...formData, storeId: value === MAIN_STORE_ID ? '' : value })
                          }}
                          className={cn(modalInputClass, 'cursor-pointer appearance-none pr-8')}
                        >
                          {mainStore && (
                            <option value={mainStore.id}>
                              {mainStore.name}
                              {mainStore.city ? ` (${mainStore.city})` : ''} — Principal
                            </option>
                          )}
                          {stores
                            .filter((store) => store.id !== MAIN_STORE_ID)
                            .map((store) => (
                              <option key={store.id} value={store.id}>
                                {store.name}
                                {store.city ? ` (${store.city})` : ''}
                                {!store.isActive ? ' (Inactiva)' : ''}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className={selectChevronClass} strokeWidth={1.75} aria-hidden />
                      </div>
                    </div>
                  )}
                </div>
                {roleDescriptions[formData.role] ? (
                  <p className="-mt-1 text-xs leading-relaxed text-zinc-500 dark:text-white/50">
                    <span className="font-medium text-zinc-700 dark:text-white/75">{roleLabel(formData.role)}:</span>{' '}
                    {roleDescriptions[formData.role]}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-white/[0.07]">
                  <span className="text-[13px] font-medium text-zinc-900 dark:text-white">Usuario activo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isActive}
                    aria-label="Usuario activo"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={cn(
                      'casa-artesanal-preserve-surface relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                      formData.isActive ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-white/15'
                    )}
                  >
                    <span
                      className={cn(
                        'casa-artesanal-preserve-surface inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900',
                        formData.isActive ? 'translate-x-[18px]' : 'translate-x-0.5',
                        !formData.isActive && 'dark:bg-white/70'
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="md:border-l md:border-zinc-200 md:pl-8 md:dark:border-white/[0.07]">
                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-white/50">Permisos</p>
                <div className="grid grid-cols-2 gap-x-3 md:grid-cols-1">
                  {moduleOptions.map((module) => {
                    const checked = hasModuleAccess(module.value)
                    return (
                      <label
                        key={module.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-[13px] transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]',
                          checked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-white/50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModule(module.value)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-200"
                        />
                        <span className="truncate">{module.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className={modalFooterClass}>
            <button type="button" className={modalSecondaryButtonClass} onClick={() => closeUserModal(mode)}>
              Cancelar
            </button>
            <button
              type="button"
              className={modalPrimaryButtonClass}
              onClick={isCreate ? handleCreateUser : handleUpdateUser}
            >
              {isCreate ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">Roles</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">Usuarios, roles y permisos.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadUsers()}
            className={headerIconBtnClass}
            title="Actualizar"
            aria-label="Actualizar"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={openCreateModal} className={headerPrimaryBtnClass}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nuevo usuario
          </button>
        </div>
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative mt-5 flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors md:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35"
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            type="search"
            autoComplete="off"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar usuario"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <div className={cn(filterSelectWrapClass, 'w-44')}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filtrar por rol"
            className={filterSelectClass}
          >
            <option value="all">Todos los roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <ChevronDown className={filterChevronClass} strokeWidth={1.75} aria-hidden />
        </div>
        <div className={cn(filterSelectWrapClass, 'w-32')}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className={filterSelectClass}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <ChevronDown className={filterChevronClass} strokeWidth={1.75} aria-hidden />
        </div>
      </div>

      <div className="mt-4">
        {filteredUsers.length === 0 ? (
          <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron usuarios</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Ajusta la búsqueda o crea un usuario nuevo.
            </p>
          </div>
        ) : (
          <>
            <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return
                    router.push(`/roles/${user.id}`)
                  }}
                  className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <UserAvatar name={user.name} seed={user.id} size="sm" className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.name}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot tone={user.isActive ? 'success' : 'neutral'} />
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-zinc-300 dark:text-white/20">·</span>
                      <span className="text-zinc-700 dark:text-zinc-200">{roleLabel(user.role)}</span>
                      {canManageStores && (
                        <>
                          <span className="text-zinc-300 dark:text-white/20">·</span>
                          <span>{storeLabel(user.storeId)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className={rowIconBtnClass}
                      title="Editar"
                      aria-label={`Editar ${user.name}`}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(user)}
                        className={rowDangerIconBtnClass}
                        title="Eliminar"
                        aria-label={`Eliminar ${user.name}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <th className={thClass}>Usuario</th>
                    <th className={thClass}>Rol</th>
                    {canManageStores && <th className={thClass}>Tienda</th>}
                    <th className={thClass}>Último acceso</th>
                    <th className={thClass}>Estado</th>
                    <th className="w-24 px-2 py-2.5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return
                        router.push(`/roles/${user.id}`)
                      }}
                      className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} seed={user.id} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {user.name}
                              {user.id === currentUser?.id && (
                                <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-white/40">(tú)</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap')}>{roleLabel(user.role)}</td>
                      {canManageStores && (
                        <td className={cn(tdClass, 'whitespace-nowrap text-zinc-600 dark:text-zinc-300')}>
                          {storeLabel(user.storeId)}
                        </td>
                      )}
                      <td className={cn(tdClass, 'whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-300')}>
                        {formatLastLogin(user.lastLogin)}
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap')}>
                        <span className="inline-flex items-center gap-1.5 text-[13px]">
                          <StatusDot tone={user.isActive ? 'success' : 'neutral'} />
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => router.push(`/roles/${user.id}`)}
                            className={rowIconBtnClass}
                            title="Ver detalle"
                            aria-label={`Ver detalle de ${user.name}`}
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className={rowIconBtnClass}
                            title="Editar"
                            aria-label={`Editar ${user.name}`}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(user)}
                              className={rowDangerIconBtnClass}
                              title="Eliminar"
                              aria-label={`Eliminar ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isCreateModalOpen && mounted && typeof document !== 'undefined' && renderUserModal('create')}
      {isEditModalOpen && mounted && typeof document !== 'undefined' && renderUserModal('edit')}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={cancelDelete}
        onConfirm={() => {
          if (!isDeleting) void confirmDelete()
        }}
        title="Eliminar usuario"
        message={`¿Seguro que quieres eliminar a ${userToDelete?.name ?? 'este usuario'}? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}
