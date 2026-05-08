import { supabase, supabaseAdmin } from './supabase'
import { Store } from '@/types'

export class StoresService {
  // Obtener todas las tiendas activas
  static async getAllStores(includeInactive: boolean = false): Promise<Store[]> {
    try {
      let query = supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })

      if (!includeInactive) {
        query = query.eq('is_active', true).is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching stores:', error)
        return []
      }

      return data.map((store: any) => this.mapStore(store))
    } catch (error) {
      console.error('Error in getAllStores:', error)
      return []
    }
  }

  // Obtener tienda por ID
  static async getStoreById(id: string): Promise<Store | null> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching store:', error)
        return null
      }

      return this.mapStore(data)
    } catch (error) {
      console.error('Error in getStoreById:', error)
      return null
    }
  }

  // Crear nueva tienda
  static async createStore(storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'>): Promise<Store | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stores')
        .insert({
          name: storeData.name,
          nit: storeData.nit || null,
          logo_url: storeData.logo || null,
          address: storeData.address || null,
          city: storeData.city || null,
          phone: storeData.phone || null,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating store:', error)
        return null
      }

      const newStore = this.mapStore(data)

      // Crear stock inicial (0) para todos los productos existentes en la nueva micro tienda
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      if (newStore.id !== MAIN_STORE_ID) {
        // Solo para micro tiendas, no para la tienda principal
        const { data: allProducts, error: productsError } = await supabaseAdmin
          .from('products')
          .select('id')
        
        if (!productsError && allProducts && allProducts.length > 0) {
          const storeStockInserts = allProducts.map((product: any) => ({
            store_id: newStore.id,
            product_id: product.id,
            quantity: 0, // Stock inicial en 0
            location: 'local' // Todas las micro tiendas tienen stock en "local"
          }))
          
          const { error: storeStockError } = await supabaseAdmin
            .from('store_stock')
            .insert(storeStockInserts)
          
          if (storeStockError) {
            console.error('Error creating initial stock for new store:', storeStockError)
            // No fallar la creación de la tienda si hay error al crear stock
          }
        }
      }

      return newStore
    } catch (error) {
      console.error('Error in createStore:', error)
      return null
    }
  }

  // Actualizar tienda
  static async updateStore(id: string, storeData: Partial<Omit<Store, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Store | null> {
    try {
      const updateData: any = {}
      
      if (storeData.name !== undefined) updateData.name = storeData.name
      if (storeData.nit !== undefined) updateData.nit = storeData.nit || null
      if (storeData.logo !== undefined) updateData.logo_url = storeData.logo || null
      if (storeData.address !== undefined) updateData.address = storeData.address || null
      if (storeData.city !== undefined) updateData.city = storeData.city || null
      if (storeData.phone !== undefined) updateData.phone = storeData.phone || null
      if (storeData.isActive !== undefined) updateData.is_active = storeData.isActive

      const { data, error } = await supabaseAdmin
        .from('stores')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating store:', error)
        return null
      }

      return this.mapStore(data)
    } catch (error) {
      console.error('Error in updateStore:', error)
      return null
    }
  }

  // Desactivar tienda (soft delete)
  static async deactivateStore(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('stores')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error deactivating store:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deactivateStore:', error)
      return false
    }
  }

  // Reactivar tienda
  static async reactivateStore(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('stores')
        .update({
          is_active: true,
          deleted_at: null
        })
        .eq('id', id)

      if (error) {
        console.error('Error reactivating store:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in reactivateStore:', error)
      return false
    }
  }

  // Eliminar tienda permanentemente (solo para admin principal)
  static async deleteStore(id: string): Promise<boolean> {
    try {
      // No permitir eliminar la tienda principal
      if (id === '00000000-0000-0000-0000-000000000001') {
        console.error('Cannot delete main store')
        return false
      }

      const { error } = await supabaseAdmin
        .from('stores')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting store:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteStore:', error)
      return false
    }
  }

  // Obtener tienda principal
  static async getMainStore(): Promise<Store | null> {
    return this.getStoreById('00000000-0000-0000-0000-000000000001')
  }

  // Mapear datos de la base de datos al tipo Store
  private static mapStore(data: any): Store {
    return {
      id: data.id,
      name: data.name,
      nit: data.nit || undefined,
      logo: data.logo_url || data.logo || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      phone: data.phone || undefined,
      isActive: data.is_active ?? true,
      deletedAt: data.deleted_at || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}
