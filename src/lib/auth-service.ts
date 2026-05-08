import { supabase, supabaseAdmin } from './supabase'
import { User } from '@/types'
import { getCurrentUserStoreId } from './store-helper'

export class AuthService {
  // Login de usuario
  static async login(email: string, password: string): Promise<User | null> {
    try {

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !user) {

        return null
      }

      // En un entorno real, aquí verificarías el hash de la contraseña
      // Por ahora, comparamos directamente (solo para desarrollo)
      if (user.password !== password) {

        return null
      }

      // Actualizar último login
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {

      } else {

      }

      // Si el usuario no tiene permisos o tiene permisos vacíos, obtenerlos del rol
      let permissions = user.permissions || []
      if (!permissions || permissions.length === 0) {
        permissions = await this.getRolePermissions(user.role)
        
        // Actualizar los permisos del usuario en la BD si se obtuvieron del rol
        if (permissions.length > 0) {
          await supabaseAdmin
            .from('users')
            .update({ permissions, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      }

      // Registrar log de login (no bloquear si falla)
      try {
        await this.logActivity(user.id, 'login', 'auth', {
          email: user.email,
          timestamp: new Date().toISOString()
        })

      } catch (logError) {
        // Error registrando log (no crítico)
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissions,
        isActive: user.is_active,
        storeId: user.store_id || undefined,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Crear usuario (solo para Diego como superadmin)
  static async createUser(userData: {
    name: string
    email: string
    password: string
    role: string
    permissions: any[]
    storeId?: string
  }, currentUserId?: string): Promise<User | null> {
    try {

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          name: userData.name,
          email: userData.email,
          password: userData.password, // En producción, hashear la contraseña
          role: userData.role,
          permissions: userData.permissions,
          store_id: userData.storeId || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        return null
      }

      // Registrar actividad
      await this.logActivity(
        currentUserId || '00000000-0000-0000-0000-000000000001', // Usuario actual o Diego Admin
        'Usuario Creado',
        'roles',
        {
          newUser: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions || []
          },
          createdBy: currentUserId ? 'Usuario Actual' : 'Diego Admin'
        }
      )
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.is_active,
        storeId: user.store_id || undefined,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Obtener usuario por ID
  static async getUserById(id: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !user) {
        return null
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.is_active,
        storeId: user.store_id || undefined,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Obtener todos los usuarios
  static async getAllUsers(): Promise<User[]> {
    try {

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        return []
      }

      const mappedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.is_active,
        storeId: user.store_id || undefined,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))

      return mappedUsers
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Actualizar usuario
  static async updateUser(id: string, updates: Partial<User>, currentUserId?: string): Promise<boolean> {
    try {
      // Obtener datos del usuario antes de actualizar
      const currentUser = await this.getUserById(id)
      
      // Mapear nombres de columnas de camelCase a snake_case
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name) dbUpdates.name = updates.name
      if (updates.email) dbUpdates.email = updates.email
      if (updates.password) dbUpdates.password = updates.password
      if (updates.role) dbUpdates.role = updates.role
      if (updates.permissions) dbUpdates.permissions = updates.permissions
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
      if (updates.storeId !== undefined) dbUpdates.store_id = updates.storeId || null
      if (updates.lastLogin) dbUpdates.last_login = updates.lastLogin

      const { error } = await supabaseAdmin
        .from('users')
        .update(dbUpdates)
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        return false
      }

      // Registrar actividad específica según el tipo de cambio
      let actionType = 'Usuario Editado'
      let description = `Actualización general de usuario: ${currentUser?.name || 'Usuario Desconocido'}`
      
      if (updates.permissions) {
        actionType = 'Permisos Asignados'
        
        // Comparar permisos anteriores con los nuevos para detectar cambios específicos
        const previousPermissions = currentUser?.permissions || []
        const newPermissions = updates.permissions || []
        
        // Detectar permisos agregados y removidos
        const addedPermissions = []
        const removedPermissions = []
        
        // Obtener todos los módulos únicos
        const allModules = [...new Set([
          ...previousPermissions.map((p: any) => p.module),
          ...newPermissions.map((p: any) => p.module)
        ])]
        
        for (const module of allModules) {
          const prevModule = previousPermissions.find((p: any) => p.module === module)
          const newModule = newPermissions.find((p: any) => p.module === module)
          
          const prevActions = prevModule?.actions || []
          const newActions = newModule?.actions || []
          
          const addedActions = newActions.filter((action: string) => !prevActions.includes(action))
          const removedActions = prevActions.filter((action: string) => !newActions.includes(action))
          
          if (addedActions.length > 0) {
            addedPermissions.push(`${module}: ${addedActions.join(', ')}`)
          }
          if (removedActions.length > 0) {
            removedPermissions.push(`${module}: ${removedActions.join(', ')}`)
          }
        }
        
        // Construir descripción detallada
        let changesDescription = []
        if (addedPermissions.length > 0) {
          changesDescription.push(`Agregados: ${addedPermissions.join('; ')}`)
        }
        if (removedPermissions.length > 0) {
          changesDescription.push(`Removidos: ${removedPermissions.join('; ')}`)
        }
        
        // Crear resumen de permisos actuales
        const permissionsSummary = newPermissions.map((p: any) => {
          const moduleName = p.module === 'dashboard' ? 'Reportes' :
                            p.module === 'products' ? 'Productos' :
                            p.module === 'clients' ? 'Clientes' :
                            p.module === 'sales' ? 'Ventas' :
                            p.module === 'payments' ? 'Abonos' :
                            p.module === 'roles' ? 'Roles' :
                            p.module === 'logs' ? 'Logs' :
                            p.module
          
          const actionsText = p.actions.map((action: string) => {
            return action === 'view' ? 'Ver' :
                   action === 'create' ? 'Crear' :
                   action === 'edit' ? 'Editar' :
                   action === 'delete' ? 'Eliminar' :
                   action === 'cancel' ? 'Cancelar' :
                   action
          }).join(', ')
          
          return `${moduleName}: ${actionsText}`
        }).join(' | ')
        
        if (changesDescription.length > 0) {
          description = `${currentUser?.name || 'Usuario Desconocido'} - Módulos: ${changesDescription.join(' | ')}. Resumen: ${permissionsSummary}`
        } else {
          description = `${currentUser?.name || 'Usuario Desconocido'} - Resumen: ${permissionsSummary}`
        }
      } else if (updates.role) {
        actionType = 'Rol Cambiado'
        description = `Cambio de rol: ${currentUser?.name || 'Usuario Desconocido'} - De: ${currentUser?.role || 'Desconocido'} a: ${updates.role}`
      } else if (updates.isActive !== undefined) {
        actionType = updates.isActive ? 'Usuario Reactivado' : 'Usuario Desactivado'
        description = `${actionType}: ${currentUser?.name || 'Usuario Desconocido'}`
      }

      await this.logActivity(
        currentUserId || '00000000-0000-0000-0000-000000000001', // Usuario actual o Diego Admin
        actionType,
        'roles',
        {
          userId: id,
          userName: currentUser?.name || 'Usuario Desconocido',
          changes: updates,
          description: description,
          updatedBy: currentUserId ? 'Usuario Actual' : 'Diego Admin'
        }
      )

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Eliminar usuario
  static async deleteUser(id: string, currentUserId?: string): Promise<boolean> {
    try {
      // Obtener datos del usuario antes de eliminar
      const currentUser = await this.getUserById(id)
      
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        return false
      }

      // Registrar actividad
      await this.logActivity(
        currentUserId || '00000000-0000-0000-0000-000000000001', // Usuario actual o Diego Admin
        'Usuario Eliminado',
        'roles',
        {
          deletedUser: {
            id: currentUser?.id || id,
            name: currentUser?.name || 'Usuario Desconocido',
            email: currentUser?.email || 'Email Desconocido',
            role: currentUser?.role || 'Rol Desconocido'
          },
          deletedBy: currentUserId ? 'Usuario Actual' : 'Diego Admin'
        }
      )

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Registrar actividad en logs
  static async logActivity(
    userId: string, 
    action: string, 
    module: string, 
    details: any
  ): Promise<void> {
    try {
      // Obtener store_id del usuario actual desde localStorage (donde se guarda cuando se cambia de tienda)
      // Usar getCurrentUserStoreId() en lugar de getCurrentUser() para obtener el storeId actualizado
      let storeId: string | null = null
      try {
        storeId = getCurrentUserStoreId()
      } catch (error) {
        console.error('[AUTH SERVICE] Error getting storeId for log:', error)
        // Error silencioso - continuar sin store_id
      }

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const finalStoreId = storeId || MAIN_STORE_ID

      const { data, error } = await supabaseAdmin
        .from('logs')
        .insert({
          user_id: userId,
          action,
          module,
          details,
          store_id: finalStoreId,
          ip_address: null, // Se puede obtener del request
          user_agent: null, // Se puede obtener del request
          created_at: new Date().toISOString()
        })
        .select()
        
      if (error) {
        console.error('[AUTH SERVICE] Error inserting log:', error)
      }
    } catch (error) {
      console.error('[AUTH SERVICE] Exception in logActivity:', error)
    }
  }

  // Función específica para registrar cambios de permisos
  static async logPermissionChange(
    currentUserId: string,
    targetUserId: string,
    targetUserName: string,
    module: string,
    previousPermissions: string[],
    newPermissions: string[],
    action: 'granted' | 'revoked'
  ): Promise<void> {
    try {
      const actionType = action === 'granted' ? 'Permisos Asignados' : 'Permisos Revocados'
      const description = action === 'granted' 
        ? `Permisos asignados a ${targetUserName} en módulo ${module}: ${newPermissions.join(', ')}`
        : `Permisos revocados a ${targetUserName} en módulo ${module}: ${previousPermissions.join(', ')}`

      await this.logActivity(
        currentUserId,
        actionType,
        'roles',
        {
          targetUserId,
          targetUserName,
          module,
          previousPermissions,
          newPermissions,
          action,
          description
        }
      )
    } catch (error) {
      // Error silencioso en producción
    }
  }

  // Inicializar datos por defecto (solo para Diego)
  static async initializeDefaultData(): Promise<void> {
    try {
      // Verificar si Diego ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'tech@programamos.com')
        .single()

      if (existingUser) {

        return
      }

      // Crear Diego como superadmin
      await this.createUser({
        name: 'Diego Admin',
        email: 'tech@programamos.com',
        password: 'admin123',
        role: 'superadmin',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'logs', actions: ['view'] }
        ]
      })

    } catch (error) {
      // Error silencioso en producción
    }
  }

  // Obtener permisos del rol desde la tabla roles
  static async getRolePermissions(roleName: string): Promise<any[]> {
    try {
      // Mapear nombres de roles comunes
      const roleMap: { [key: string]: string } = {
        'superadmin': 'Super Administrador',
        'super administrador': 'Super Administrador',
        'admin': 'Administrador',
        'administrador': 'Administrador',
        'vendedor': 'Vendedor',
        'vendedora': 'Vendedor',
        'cajero': 'Cajero',
        'cajera': 'Cajero',
        'inventario': 'Inventario',
        'contador': 'Contador'
      }
      
      const normalizedRoleName = roleName.toLowerCase().trim()
      const mappedRole = roleMap[normalizedRoleName] || roleName
      
      // Intentar buscar primero con el nombre exacto mapeado
      let { data: role, error } = await supabaseAdmin
        .from('roles')
        .select('permissions')
        .ilike('name', mappedRole)
        .single()

      // Si no se encuentra, intentar con búsqueda más flexible
      if (error || !role) {
        const { data: roles, error: rolesError } = await supabaseAdmin
          .from('roles')
          .select('permissions, name')
        
        if (!rolesError && roles) {
          // Buscar el rol que contenga el nombre normalizado
          const foundRole = roles.find(r => 
            r.name?.toLowerCase().includes(normalizedRoleName) || 
            normalizedRoleName.includes(r.name?.toLowerCase() || '')
          )
          if (foundRole) {
            role = foundRole
            error = null
          }
        }
      }

      if (error || !role) {
        // Si es vendedor y no se encuentra el rol, retornar permisos por defecto
        if (normalizedRoleName === 'vendedor' || normalizedRoleName === 'vendedora') {
          return [
            { module: 'dashboard', actions: ['view'] },
            { module: 'products', actions: ['view'] },
            { module: 'clients', actions: ['view', 'create', 'edit'] },
            { module: 'sales', actions: ['view', 'create', 'edit'] },
            { module: 'payments', actions: ['view', 'create', 'edit'] }
          ]
        }
        // Si es cajero y no se encuentra el rol, retornar permisos por defecto
        if (normalizedRoleName === 'cajero' || normalizedRoleName === 'cajera') {
          return [
            { module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'clients', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'products', actions: ['view'] },
            { module: 'payments', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'warranties', actions: ['view', 'create', 'edit', 'delete', 'cancel'] }
          ]
        }
        return []
      }

      return role.permissions || []
    } catch (error) {
      // Si falla y es vendedor, retornar permisos por defecto
      const normalizedRoleName = roleName.toLowerCase().trim()
      if (normalizedRoleName === 'vendedor' || normalizedRoleName === 'vendedora') {
        return [
          { module: 'dashboard', actions: ['view'] },
          { module: 'products', actions: ['view'] },
          { module: 'clients', actions: ['view', 'create', 'edit'] },
          { module: 'sales', actions: ['view', 'create', 'edit'] },
          { module: 'payments', actions: ['view', 'create', 'edit'] }
        ]
      }
      if (normalizedRoleName === 'cajero' || normalizedRoleName === 'cajera') {
        return [
          { module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'clients', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'products', actions: ['view'] },
          { module: 'payments', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'warranties', actions: ['view', 'create', 'edit', 'delete', 'cancel'] }
        ]
      }
      return []
    }
  }

  // Obtener usuario actual
  static async getCurrentUser(): Promise<User | null> {
    try {
      if (typeof window === 'undefined') {

        return null
      }

      const userData = localStorage.getItem('casa_artesanal_user')
      
      if (!userData) {
        return null
      }

      const user = JSON.parse(userData)
      
      // Verificar que el usuario sigue activo en la base de datos
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      if (error || !dbUser) {
        // Si la consulta a la BD falla (RLS, red, etc.), usar usuario de localStorage
        // para no bloquear a vendedores al crear créditos o agregar abonos
        if (user?.id) {
          return {
            id: user.id,
            name: user.name ?? 'Usuario',
            email: user.email ?? '',
            role: user.role,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
            isActive: true,
            storeId: user.storeId ?? undefined,
            lastLogin: user.last_login ?? user.lastLogin,
            createdAt: user.created_at ?? user.createdAt,
            updatedAt: user.updated_at ?? user.updatedAt
          }
        }
        localStorage.removeItem('casa_artesanal_user')
        return null
      }

      // Si el usuario no tiene permisos o tiene permisos vacíos, obtenerlos del rol
      let permissions = dbUser.permissions || []
      if (!permissions || permissions.length === 0) {
        permissions = await this.getRolePermissions(dbUser.role)
        
        // Actualizar los permisos del usuario en la BD si se obtuvieron del rol
        // Usar supabaseAdmin para evitar problemas de permisos RLS
        if (permissions.length > 0) {
          try {
            await supabaseAdmin
              .from('users')
              .update({ permissions, updated_at: new Date().toISOString() })
              .eq('id', dbUser.id)
          } catch (updateError) {
            // Error silencioso - los permisos se asignarán en el próximo login
          }
        }
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        permissions: permissions,
        isActive: dbUser.is_active,
        storeId: dbUser.store_id || undefined,
        lastLogin: dbUser.last_login,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at
      }
    } catch (error) {
      // Si hay excepción, intentar devolver usuario de localStorage para no bloquear flujos
      if (typeof window !== 'undefined') {
        try {
          const userData = localStorage.getItem('casa_artesanal_user')
          if (userData) {
            const user = JSON.parse(userData)
            if (user?.id) {
              return {
                id: user.id,
                name: user.name ?? 'Usuario',
                email: user.email ?? '',
                role: user.role,
                permissions: Array.isArray(user.permissions) ? user.permissions : [],
                isActive: true,
                storeId: user.storeId ?? undefined,
                lastLogin: user.last_login ?? user.lastLogin,
                createdAt: user.created_at ?? user.createdAt,
                updatedAt: user.updated_at ?? user.updatedAt
              }
            }
          }
        } catch {
          // ignorar
        }
      }
      return null
    }
  }
}
