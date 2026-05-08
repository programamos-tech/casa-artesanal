'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/auth-context'
import { User, Permission, Store } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Search, Edit, Trash2, Eye, UserCheck, UserX, X, User as UserIcon, Shield, Store as StoreIcon, Users, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { StoresService } from '@/lib/stores-service'
import { canAccessAllStores } from '@/lib/store-helper'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

const roleOptions = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrador' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'inventario', label: 'Inventario' }
]

const moduleOptions = [
  { value: 'dashboard', label: 'Reportes' },
  { value: 'products', label: 'Productos' },
  { value: 'transfers', label: 'Transferencias' },
  { value: 'receptions', label: 'Recepciones' },
  { value: 'clients', label: 'Clientes' },
  { value: 'sales', label: 'Ventas' },
  { value: 'payments', label: 'Créditos' },
  { value: 'supplier_invoices', label: 'Facturador' },
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
    { module: 'warranties', actions: allActions },
    { module: 'roles', actions: allActions },
    { module: 'logs', actions: allActions }
  ],
  'admin': [
    { module: 'dashboard', actions: allActions },
    { module: 'sales', actions: allActions },
    { module: 'payments', actions: allActions },
    { module: 'supplier_invoices', actions: allActions }
  ],
  'vendedor': [
    { module: 'dashboard', actions: allActions },
    { module: 'products', actions: ['view'] }, // Solo ver productos, no editar/eliminar
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
    { module: 'warranties', actions: allActions }
  ],
  'inventario': [
    { module: 'products', actions: allActions },
    { module: 'supplier_invoices', actions: allActions }
  ]
}

// Descripciones de cada rol
const roleDescriptions = {
  'superadmin': 'Acceso completo a todos los módulos del sistema (Diego)',
  'admin': 'Acceso a reportes, ventas y créditos',
  'cajero': 'Atiende caja: ventas, clientes, créditos, garantías y reportes (productos solo lectura)',
  'vendedor': 'Acceso a reportes, productos, clientes, ventas y créditos',
  'inventario': 'Solo productos (permisos según lo que marques abajo)'
}

// Estilos compartidos — alineados al formulario "Nueva venta" / "Nuevo producto"
const formInputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'
const formLabelClass =
  'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
const sectionHeaderClass =
  'space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800'
const sectionTitleClass =
  'flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50'
const sectionIconClass = 'h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-300'
const sectionContentClass = 'space-y-3 p-4 md:p-6 md:pt-4'

/** Mismo patrón que facturador / búsqueda unificada (select nativo + chevron) */
const nativeSelectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.65rem center',
  backgroundSize: '1rem'
} as const

// Helper: detecta usuarios con rol vendedor / vendedora (con o sin acentos / mayúsculas)
const isSellerRole = (role: string | undefined | null): boolean => {
  const r = (role || '').toString().toLowerCase()
  return r === 'vendedor' || r === 'vendedora'
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

      const success = await updateUser(selectedUser.id, formData)
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
        // Si no hay permisos, crear uno nuevo con todas las acciones
        const allActions = ['view', 'create', 'edit', 'delete', 'cancel']
        setFormData({ ...formData, permissions: [{ module, actions: allActions }] })
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
        // Si no existe, agregar el módulo con todas las acciones
        const allActions = ['view', 'create', 'edit', 'delete', 'cancel']
        newPermissions.push({ module, actions: allActions })
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
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500 dark:border-zinc-700 dark:border-t-emerald-500"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className={cardShell}>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex flex-wrap items-center gap-2.5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Users
                  className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Gestión de usuarios</span>
              </CardTitle>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Administra los usuarios y sus permisos del sistema
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={openCreateModal}
              className="h-9 shrink-0 gap-2 rounded-lg border-0 bg-emerald-600 px-4 text-sm font-medium text-white shadow-none hover:translate-y-0 hover:bg-emerald-700 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 dark:hover:bg-emerald-500 [&_svg]:text-white"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Nuevo usuario</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Modal de creación */}
      {isCreateModalOpen &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/[0.18] p-3 backdrop-blur-[3px] dark:bg-black/45 sm:p-6 sm:py-10 xl:left-60"
              style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
              }}
            >
              <div className="flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 sm:max-h-[min(94vh,920px)] sm:max-w-2xl lg:max-w-4xl">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserCheck className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-lg">
                        Nuevo usuario
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        Datos, rol y permisos del usuario.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      resetForm()
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide bg-gradient-to-b from-zinc-50/60 via-white to-white px-4 py-5 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 md:px-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                    {/* Columna izquierda — datos + rol/estado */}
                    <div className="space-y-4 lg:col-span-2">
                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <UserIcon className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Información
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Datos básicos para iniciar sesión.
                          </p>
                        </CardHeader>
                        <CardContent className={sectionContentClass}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className={formLabelClass}>Nombre completo *</label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={formInputClass}
                                placeholder="Ej: Juan Pérez"
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <label className={formLabelClass}>Email *</label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={formInputClass}
                                placeholder="juan@casa-artesanal.com"
                                autoComplete="off"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className={formLabelClass}>Contraseña *</label>
                              <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={formInputClass}
                                placeholder="Mínimo 6 caracteres"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <Shield className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Rol y estado
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Define qué puede hacer y dónde.
                          </p>
                        </CardHeader>
                        <CardContent className={sectionContentClass}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className={formLabelClass}>Rol *</label>
                              <Select value={formData.role} onValueChange={applyRolePermissions}>
                                <SelectTrigger className={cn(formInputClass, 'h-auto justify-between text-left [&>svg]:text-zinc-400')}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {canManageStores && (
                              <div>
                                <label className={cn(formLabelClass, 'flex items-center gap-1.5')}>
                                  <StoreIcon className="h-3 w-3" />
                                  Tienda (opcional)
                                </label>
                                <Select
                                  value={formData.storeId || (mainStore?.id || '')}
                                  onValueChange={(value) => {
                                    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
                                    setFormData({ ...formData, storeId: value === MAIN_STORE_ID ? '' : value })
                                  }}
                                >
                                  <SelectTrigger className={cn(formInputClass, 'h-auto justify-between text-left [&>svg]:text-zinc-400')}>
                                    <SelectValue placeholder="Seleccionar tienda" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mainStore && (
                                      <SelectItem value={mainStore.id}>
                                        {mainStore.name} {mainStore.city && `(${mainStore.city})`} — Principal
                                      </SelectItem>
                                    )}
                                    {stores.filter(store => {
                                      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
                                      return store.id !== MAIN_STORE_ID
                                    }).map(store => (
                                      <SelectItem key={store.id} value={store.id}>
                                        {store.name} {store.city && `(${store.city})`} {!store.isActive && '(Inactiva)'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                            {roleDescriptions[formData.role as keyof typeof roleDescriptions]}
                          </p>

                          <label
                            htmlFor="createIsActive"
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                          >
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                Usuario activo
                              </span>
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Si está apagado, no podrá iniciar sesión.
                              </span>
                            </div>
                            <Switch
                              id="createIsActive"
                              checked={formData.isActive}
                              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                              className="data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Columna derecha — permisos */}
                    <div className="space-y-4">
                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <Shield className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Permisos
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Módulos a los que tiene acceso.
                          </p>
                        </CardHeader>
                        <CardContent className="p-3">
                          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Rol
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                              {roleOptions.find(r => r.value === formData.role)?.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                            {moduleOptions.map(module => {
                              const checked = hasModuleAccess(module.value)
                              return (
                                <label
                                  key={module.value}
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                                    checked
                                      ? 'bg-zinc-100/80 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-50'
                                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/40'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModule(module.value)}
                                    className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900 focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:accent-zinc-200"
                                  />
                                  <span className="truncate font-medium">{module.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div
                  className="flex flex-col-reverse justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
                  style={{
                    paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      resetForm()
                    }}
                    className="h-10 w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateUser}
                    className="h-10 w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
                  >
                    <UserCheck className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Crear usuario
                  </Button>
                </div>
              </div>
            </div>
          ),
          document.body
        )}

      {/* Search and Filters — input nativo + selects nativos (misma línea base que facturador / logs) */}
      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:h-11 md:min-h-[2.75rem] md:flex-row md:gap-0 md:overflow-hidden md:rounded-xl md:border md:border-zinc-200/90 md:bg-white md:shadow-sm dark:md:border-zinc-700 dark:md:bg-zinc-950">
            <div className="group relative min-w-0 flex-1">
              <span className="sr-only">Buscar usuario</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                id="search"
                type="search"
                autoComplete="off"
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-zinc-200/90 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 md:h-full md:rounded-none md:border-0 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-emerald-500/25 dark:md:bg-transparent dark:md:focus-visible:ring-emerald-500/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:contents">
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-zinc-200/90 bg-white px-3 py-2 pr-9 text-sm text-zinc-900 focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 md:h-full md:w-[min(18rem,32vw)] md:min-w-[14rem] md:shrink-0 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-emerald-500/25 dark:md:border-zinc-700 dark:md:bg-zinc-950 dark:md:focus-visible:ring-emerald-500/20"
                style={nativeSelectChevronStyle}
                aria-label="Filtrar por rol"
              >
                <option value="all">Todos los roles</option>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-zinc-200/90 bg-white px-3 py-2 pr-9 text-sm text-zinc-900 focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 md:h-full md:w-44 md:shrink-0 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-emerald-500/25 dark:md:border-zinc-700 dark:md:bg-zinc-950 dark:md:focus-visible:ring-emerald-500/20"
                style={nativeSelectChevronStyle}
                aria-label="Filtrar por estado"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className={cardShell}>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-14 text-center md:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200/80 bg-zinc-50/80 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60">
                <Users className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No se encontraron usuarios
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Comienza creando un nuevo usuario
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={openCreateModal}
                className="mt-4 h-9 gap-2 rounded-lg border-0 bg-emerald-600 px-4 text-sm font-medium text-white shadow-none hover:translate-y-0 hover:bg-emerald-700 hover:shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 dark:hover:bg-emerald-500 [&_svg]:text-white"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Nuevo usuario
              </Button>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {filteredUsers.map((user, index) => {
                  const formatDateTime = (dateString: string) => {
                    if (!dateString) return 'Nunca'
                    const date = new Date(dateString)
                    return date.toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }
                  return (
                    <div
                      key={user.id}
                      className="space-y-3 rounded-xl border border-solid border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            seed={user.id}
                            size="md"
                            className="shrink-0 ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">#{index + 1}</span>
                              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50" title={user.name}>
                                {user.name}
                              </h3>
                            </div>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={user.email}>
                              {user.email}
                            </p>
                            <p
                              className="truncate text-xs text-zinc-500 dark:text-zinc-400"
                              title={roleOptions.find(r => r.value === user.role)?.label || user.role}
                            >
                              {roleOptions.find(r => r.value === user.role)?.label || user.role}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                            user.isActive
                              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'border-zinc-600 bg-zinc-800/60 text-zinc-400 dark:border-zinc-600'
                          }`}
                        >
                          <UserCheck className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-800">
                        <div className="text-center">
                          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Rol
                          </div>
                          <div
                            className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100"
                            title={roleOptions.find(r => r.value === user.role)?.label || user.role}
                          >
                            {roleOptions.find(r => r.value === user.role)?.label || user.role}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Último acceso
                          </div>
                          <div
                            className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100"
                            title={formatDateTime(user.lastLogin || '')}
                          >
                            {formatDateTime(user.lastLogin || '').split(',')[0]}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-800">
                        <p
                          className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400"
                          title={user.lastLogin ? formatDateTime(user.lastLogin) : undefined}
                        >
                          {user.lastLogin ? formatDateTime(user.lastLogin) : 'Nunca ha iniciado sesión'}
                        </p>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {isSellerRole(user.role) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/sellers/${user.id}`)}
                              className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-600 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                              title="Ver ventas del vendedor"
                            >
                              <BarChart3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(user)}
                            className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-600 hover:bg-zinc-100 hover:text-emerald-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
                          >
                            <Edit className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteModal(user)}
                              className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-600 hover:bg-red-500/10 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vista de Lista para Desktop */}
              <div className="hidden md:block divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="p-4 transition-colors hover:bg-zinc-50/90 md:p-5 dark:hover:bg-zinc-800/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          seed={user.id}
                          size="md"
                          className="shrink-0 ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{user.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                                user.isActive
                                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : 'border-zinc-600 bg-zinc-800/60 text-zinc-400 dark:border-zinc-600'
                              }`}
                            >
                              {user.isActive ? (
                                <UserCheck className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                              ) : (
                                <UserX className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                              )}
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="inline-flex items-center rounded-md border border-zinc-300/90 bg-transparent px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
                              {roleOptions.find(r => r.value === user.role)?.label || user.role}
                            </span>
                          </div>
                          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Último acceso:{' '}
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {isSellerRole(user.role) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/sellers/${user.id}`)}
                            className="h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-zinc-600 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                            title="Ver ventas del vendedor"
                          >
                            <BarChart3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                            <span className="hidden text-xs lg:inline">Ver ventas</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-600 hover:bg-zinc-100 hover:text-emerald-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
                        >
                          <Edit className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </Button>

                        {user.id !== currentUser?.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(user)}
                            className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-600 hover:bg-red-500/10 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      {isEditModalOpen &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/[0.18] p-3 backdrop-blur-[3px] dark:bg-black/45 sm:p-6 sm:py-10 xl:left-60"
              style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
              }}
            >
              <div className="flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 sm:max-h-[min(94vh,920px)] sm:max-w-2xl lg:max-w-4xl">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <Edit className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-lg">
                        Editar usuario
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {selectedUser?.name || 'Datos, rol y permisos.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide bg-gradient-to-b from-zinc-50/60 via-white to-white px-4 py-5 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 md:px-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                    {/* Columna izquierda — datos + rol/estado */}
                    <div className="space-y-4 lg:col-span-2">
                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <UserIcon className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Información
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Edita nombre, correo y, opcionalmente, contraseña.
                          </p>
                        </CardHeader>
                        <CardContent className={sectionContentClass}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className={formLabelClass}>Nombre completo</label>
                              <input
                                type="text"
                                id="editName"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={formInputClass}
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <label className={formLabelClass}>Email</label>
                              <input
                                type="email"
                                id="editEmail"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={formInputClass}
                                autoComplete="off"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className={formLabelClass}>
                                Nueva contraseña (opcional)
                              </label>
                              <input
                                type="password"
                                id="editPassword"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={formInputClass}
                                placeholder="Dejar vacío para mantener la actual"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <Shield className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Rol y estado
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Define qué puede hacer y dónde.
                          </p>
                        </CardHeader>
                        <CardContent className={sectionContentClass}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className={formLabelClass}>Rol</label>
                              <Select value={formData.role} onValueChange={applyRolePermissions}>
                                <SelectTrigger
                                  id="editRole"
                                  className={cn(formInputClass, 'h-auto justify-between text-left [&>svg]:text-zinc-400')}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {canManageStores && (
                              <div>
                                <label className={cn(formLabelClass, 'flex items-center gap-1.5')}>
                                  <StoreIcon className="h-3 w-3" />
                                  Tienda
                                </label>
                                <Select
                                  value={formData.storeId || (mainStore?.id || '')}
                                  onValueChange={(value) => {
                                    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
                                    setFormData({ ...formData, storeId: value === MAIN_STORE_ID ? '' : value })
                                  }}
                                >
                                  <SelectTrigger
                                    id="editStore"
                                    className={cn(formInputClass, 'h-auto justify-between text-left [&>svg]:text-zinc-400')}
                                  >
                                    <SelectValue placeholder="Seleccionar tienda" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mainStore && (
                                      <SelectItem value={mainStore.id}>
                                        {mainStore.name} {mainStore.city && `(${mainStore.city})`} — Principal
                                      </SelectItem>
                                    )}
                                    {stores.filter(store => {
                                      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
                                      return store.id !== MAIN_STORE_ID
                                    }).map(store => (
                                      <SelectItem key={store.id} value={store.id}>
                                        {store.name} {store.city && `(${store.city})`} {!store.isActive && '(Inactiva)'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                            {roleDescriptions[formData.role as keyof typeof roleDescriptions]}
                          </p>

                          <label
                            htmlFor="editIsActive"
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                          >
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                Usuario activo
                              </span>
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Si está apagado, no podrá iniciar sesión.
                              </span>
                            </div>
                            <Switch
                              id="editIsActive"
                              checked={formData.isActive}
                              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                              className="data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Columna derecha — permisos */}
                    <div className="space-y-4">
                      <Card className={cardShell}>
                        <CardHeader className={sectionHeaderClass}>
                          <CardTitle className={sectionTitleClass}>
                            <Shield className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                            Permisos
                          </CardTitle>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Módulos a los que tiene acceso.
                          </p>
                        </CardHeader>
                        <CardContent className="p-3">
                          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Rol
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                              {roleOptions.find(r => r.value === formData.role)?.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                            {moduleOptions.map(module => {
                              const checked = hasModuleAccess(module.value)
                              return (
                                <label
                                  key={module.value}
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                                    checked
                                      ? 'bg-zinc-100/80 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-50'
                                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/40'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModule(module.value)}
                                    className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900 focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:accent-zinc-200"
                                  />
                                  <span className="truncate font-medium">{module.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div
                  className="flex flex-col-reverse justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
                  style={{
                    paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(false)}
                    className="h-10 w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUpdateUser}
                    className="h-10 w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
                  >
                    <Edit className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </div>
          ),
          document.body
        )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        description={`¿Estás seguro de que quieres eliminar a ${userToDelete?.name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Usuario"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  )
}
