import { supabase } from './supabase'
import { Client } from '@/types'
import { AuthService } from './auth-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

export class ClientsService {
  // Obtener todos los clientes
  static async getAllClients(): Promise<Client[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      let query = supabase
        .from('clients')
        .select('*')

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar clientes de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar clientes de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo clientes de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo clientes de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        return []
      }

      return data.map((client: any) => ({
        id: client.id,
        name: client.name,
        email: client.email || '',
        phone: client.phone,
        document: client.document,
        address: client.address,
        city: client.city,
        state: client.state,
        type: client.type,
        creditLimit: client.credit_limit || 0,
        currentDebt: client.current_debt || 0,
        status: client.status,
        storeId: client.store_id || undefined,
        createdAt: client.created_at
      }))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Obtener cliente por ID
  static async getClientById(id: string): Promise<Client | null> {
    try {
      const storeId = getCurrentUserStoreId()
      let query = supabase
        .from('clients')
        .select('*')
        .eq('id', id)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(null)) {
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.single()

      if (error) {
      // Error silencioso en producción
        return null
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        document: data.document,
        address: data.address,
        city: data.city,
        state: data.state,
        type: data.type,
        creditLimit: data.credit_limit || 0,
        currentDebt: data.current_debt || 0,
        status: data.status,
        storeId: data.store_id || undefined,
        createdAt: data.created_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Crear nuevo cliente
  static async createClient(clientData: Omit<Client, 'id' | 'createdAt'>, currentUserId?: string): Promise<{ client: Client | null, error: string | null }> {
    try {
      // Manejar email vacío o 'N/A' - usar null para campos vacíos
      const emailValue = clientData.email && clientData.email.trim() !== '' && clientData.email.trim().toLowerCase() !== 'n/a' 
        ? clientData.email.trim() 
        : null

      // Obtener store_id del usuario actual
      const storeId = getCurrentUserStoreId()
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientData.name,
          email: emailValue,
          phone: clientData.phone,
          document: clientData.document,
          address: clientData.address,
          city: clientData.city,
          state: clientData.state,
          type: clientData.type,
          credit_limit: clientData.creditLimit,
          current_debt: clientData.currentDebt,
          status: clientData.status,
          store_id: storeId || '00000000-0000-0000-0000-000000000001' // Tienda principal por defecto
        })
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        // Manejar errores específicos
        if (error.code === '23505') {
          if (error.message.includes('clients_email_key')) {
            return { client: null, error: 'Ya existe un cliente con este email. Por favor, usa un email diferente o déjalo vacío.' }
          } else if (error.message.includes('clients_document_key')) {
            return { client: null, error: 'Ya existe un cliente con este documento. Por favor, verifica el número de cédula/NIT.' }
          }
        }
        
        return { client: null, error: 'Error al crear el cliente. Por favor, intenta nuevamente.' }
      }

      const newClient = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        address: data.address,
        city: data.city,
        state: data.state,
        type: data.type,
        creditLimit: data.credit_limit || 0,
        currentDebt: data.current_debt || 0,
        status: data.status,
        storeId: data.store_id || undefined,
        createdAt: data.created_at
      }

      // Registrar la actividad
      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'client_create',
          'clients',
          {
            description: `Nuevo cliente creado: ${clientData.name}`,
            clientId: data.id,
            clientName: clientData.name,
            clientEmail: clientData.email || 'Sin email',
            clientPhone: clientData.phone || 'Sin teléfono',
            clientDocument: clientData.document,
            clientType: clientData.type
          }
        )
      }

      return { client: newClient, error: null }
    } catch (error) {
      // Error silencioso en producción
      return { client: null, error: 'Error inesperado al crear el cliente.' }
    }
  }

  // Actualizar cliente
  static async updateClient(id: string, updates: Partial<Client>, currentUserId?: string): Promise<boolean> {
    try {
      // Obtener el cliente actual antes de actualizarlo para el log
      const currentClient = await this.getClientById(id)
      if (!currentClient) {
        return false
      }

      // Verificar que el cliente pertenece a la tienda del usuario (si no es admin principal)
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && currentClient.storeId !== storeId) {
        return false
      }

      const updateData: any = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.email !== undefined) {
        // Manejar email vacío o 'N/A' - usar null para campos vacíos
        const emailValue = updates.email && updates.email.trim() !== '' && updates.email.trim().toLowerCase() !== 'n/a' 
          ? updates.email.trim() 
          : null
        updateData.email = emailValue
      }
      if (updates.phone) updateData.phone = updates.phone
      if (updates.document) updateData.document = updates.document
      if (updates.address) updateData.address = updates.address
      if (updates.city) updateData.city = updates.city
      if (updates.state) updateData.state = updates.state
      if (updates.type) updateData.type = updates.type
      if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit
      if (updates.currentDebt !== undefined) updateData.current_debt = updates.currentDebt
      if (updates.status) updateData.status = updates.status

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        return false
      }

      // Preparar información de cambios para el log
      const changes: Record<string, { from: any; to: any }> = {}
      Object.keys(updates).forEach(key => {
        const oldValue = (currentClient as any)[key]
        const newValue = (updates as any)[key]
        if (oldValue !== newValue) {
          changes[key] = { from: oldValue, to: newValue }
        }
      })

      // Obtener el nombre final del cliente (puede haber cambiado)
      const finalClientName = updates.name || currentClient.name

      // Obtener el tipo final del cliente (puede haber cambiado)
      const finalClientType = updates.type || currentClient.type

      // Registrar la actividad
      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'client_update',
          'clients',
          {
            description: `Cliente actualizado: ${finalClientName}`,
            clientId: id,
            clientName: finalClientName,
            clientEmail: updates.email !== undefined ? (updates.email || null) : currentClient.email,
            clientPhone: updates.phone || currentClient.phone,
            clientDocument: updates.document || currentClient.document,
            clientType: finalClientType,
            updatedFields: Object.keys(updates),
            changes: changes
          }
        )
      }

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Eliminar cliente (no se permite si tiene facturas/ventas registradas)
  static async deleteClient(id: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const clientToDelete = await this.getClientById(id)
      if (!clientToDelete) {
        return { success: false, error: 'Cliente no encontrado' }
      }

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && clientToDelete.storeId !== storeId) {
        return { success: false, error: 'No tienes permiso para eliminar este cliente' }
      }

      // No permitir eliminar si tiene ventas (facturas) registradas
      const { count, error: countError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', id)

      if (countError) {
        return { success: false, error: 'Error al verificar facturas' }
      }
      if (count != null && count > 0) {
        return {
          success: false,
          error: 'No se puede eliminar un cliente con facturas registradas. Tiene ventas asociadas.'
        }
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: 'Error al eliminar el cliente' }
      }

      if (currentUserId && clientToDelete) {
        await AuthService.logActivity(
          currentUserId,
          'client_delete',
          'clients',
          {
            description: `Cliente eliminado: ${clientToDelete.name}`,
            clientId: id,
            clientName: clientToDelete.name,
            clientEmail: clientToDelete.email || 'Sin email',
            clientDocument: clientToDelete.document
          }
        )
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Error inesperado al eliminar' }
    }
  }

  // Buscar clientes
  static async searchClients(query: string): Promise<Client[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      let dbQuery = supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,document.ilike.%${query}%`)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar clientes de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar clientes de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo clientes de la tienda principal (store_id = MAIN_STORE_ID o null)
        dbQuery = dbQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo clientes de esa microtienda
        dbQuery = dbQuery.eq('store_id', storeId)
      }

      const { data, error } = await dbQuery.order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        return []
      }

      return data.map((client: any) => ({
        id: client.id,
        name: client.name,
        email: client.email || '',
        phone: client.phone,
        document: client.document,
        address: client.address,
        city: client.city,
        state: client.state,
        type: client.type,
        creditLimit: client.credit_limit || 0,
        currentDebt: client.current_debt || 0,
        status: client.status,
        storeId: client.store_id || undefined,
        createdAt: client.created_at
      }))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }
}

