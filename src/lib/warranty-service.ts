import { supabase } from './supabase'
import { Warranty, WarrantyProduct, WarrantyStatusHistory } from '@/types'
import { AuthService } from './auth-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

export class WarrantyService {
  // Obtener todas las garantías con paginación
  static async getAllWarranties(page: number = 1, limit: number = 20): Promise<{
    warranties: Warranty[]
    total: number
    hasMore: boolean
  }> {
    try {
      const offset = (page - 1) * limit
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()

      // Obtener garantías con relaciones
      let warrantiesQuery = supabase
        .from('warranties')
        .select(`
          *,
          original_sale:sales!original_sale_id (
            id,
            invoice_number,
            total,
            created_at
          ),
          client:clients!client_id (
            id,
            name,
            email,
            phone
          ),
          product_received:products!product_received_id (
            id,
            name,
            reference,
            price
          ),
          product_delivered:products!product_delivered_id (
            id,
            name,
            reference,
            price
          ),
          warranty_products (
            id,
            product_id,
            serial_number,
            condition,
            notes,
            created_at,
            product:products (
              id,
              name,
              reference
            )
          ),
          warranty_status_history (
            id,
            previous_status,
            new_status,
            notes,
            changed_at,
            changed_by_user:users (
              id,
              name
            )
          )
        `)

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        warrantiesQuery = warrantiesQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo garantías de esa microtienda
        warrantiesQuery = warrantiesQuery.eq('store_id', storeId)
      }

      const { data: warranties, error: warrantiesError } = await warrantiesQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (warrantiesError) {
        throw warrantiesError
      }

      // Obtener total de garantías
      let countQuery = supabase
        .from('warranties')
        .select('*', { count: 'exact', head: true })

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo contar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo contar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo contar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        countQuery = countQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo contar garantías de esa microtienda
        countQuery = countQuery.eq('store_id', storeId)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        throw countError
      }

      // Mapear datos a la interfaz TypeScript
      const mappedWarranties: Warranty[] = warranties.map(warranty => ({
        id: warranty.id,
        originalSaleId: warranty.original_sale_id ?? null,
        clientId: warranty.client_id ?? null,
        clientName: warranty.client_name ?? 'Cliente sin factura',
        productReceivedId: warranty.product_received_id,
        productReceivedName: warranty.product_received_name,
        productReceivedSerial: warranty.product_received_serial,
        productDeliveredId: warranty.product_delivered_id,
        productDeliveredName: warranty.product_delivered_name,
        reason: warranty.reason,
        status: warranty.status,
        notes: warranty.notes,
        storeId: warranty.store_id || undefined,
        createdAt: warranty.created_at,
        updatedAt: warranty.updated_at,
        completedAt: warranty.completed_at,
        createdBy: warranty.created_by,
        quantityReceived: warranty.quantity_received ?? 1,
        quantityDelivered: warranty.quantity_delivered ?? 1,
        // Relaciones
        originalSale: warranty.original_sale ? {
          id: warranty.original_sale.id,
          invoiceNumber: warranty.original_sale.invoice_number,
          total: warranty.original_sale.total,
          createdAt: warranty.original_sale.created_at
        } as any : undefined,
        client: warranty.client,
        productReceived: warranty.product_received,
        productDelivered: warranty.product_delivered,
        warrantyProducts: warranty.warranty_products?.map(wp => ({
          id: wp.id,
          warrantyId: wp.warranty_id,
          productId: wp.product_id,
          serialNumber: wp.serial_number,
          condition: wp.condition,
          notes: wp.notes,
          createdAt: wp.created_at,
          updatedAt: wp.updated_at,
          product: wp.product
        })),
        statusHistory: warranty.warranty_status_history?.map(sh => ({
          id: sh.id,
          warrantyId: sh.warranty_id,
          previousStatus: sh.previous_status,
          newStatus: sh.new_status,
          notes: sh.notes,
          changedBy: sh.changed_by,
          changedAt: sh.changed_at,
          changedByUser: sh.changed_by_user
        }))
      }))

      return {
        warranties: mappedWarranties,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Método optimizado para dashboard con filtrado por fecha
  static async getWarrantiesByDateRange(startDate?: Date, endDate?: Date): Promise<Warranty[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let query = supabase
        .from('warranties')
        .select(`
          *,
          original_sale:sales!original_sale_id (
            id,
            invoice_number,
            total,
            created_at
          ),
          client:clients!client_id (
            id,
            name,
            email,
            phone
          ),
          product_received:products!product_received_id (
            id,
            name,
            reference,
            price
          ),
          product_delivered:products!product_delivered_id (
            id,
            name,
            reference,
            price
          ),
          warranty_products (
            id,
            product_id,
            serial_number,
            condition,
            notes,
            created_at,
            product:products (
              id,
              name,
              reference
            )
          ),
          warranty_status_history (
            id,
            previous_status,
            new_status,
            notes,
            changed_at,
            changed_by_user:users (
              id,
              name
            )
          )
        `)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo garantías de esa microtienda
        query = query.eq('store_id', storeId)
      }

      query = query.order('created_at', { ascending: false })

      // Aplicar filtros de fecha si existen
      if (startDate) {
        // Usar inicio del día en hora local (sin conversión UTC)
        const startLocal = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0, 0, 0, 0
        )
        query = query.gte('created_at', startLocal.toISOString())
      }
      if (endDate) {
        // Usar final del día en hora local (sin conversión UTC)
        const endLocal = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23, 59, 59, 999
        )
        query = query.lte('created_at', endLocal.toISOString())
      }

      const { data: warranties, error: warrantiesError } = await query.limit(10000)

      if (warrantiesError) {
        throw warrantiesError
      }

      // Mapear datos (mismo código que getAllWarranties)
      const mappedWarranties: Warranty[] = warranties.map(warranty => ({
        id: warranty.id,
        originalSaleId: warranty.original_sale_id ?? null,
        clientId: warranty.client_id ?? null,
        clientName: warranty.client_name ?? 'Cliente sin factura',
        productReceivedId: warranty.product_received_id,
        productReceivedName: warranty.product_received_name,
        productReceivedSerial: warranty.product_received_serial,
        productDeliveredId: warranty.product_delivered_id,
        productDeliveredName: warranty.product_delivered_name,
        reason: warranty.reason,
        status: warranty.status,
        notes: warranty.notes,
        storeId: warranty.store_id || undefined,
        createdAt: warranty.created_at,
        updatedAt: warranty.updated_at,
        completedAt: warranty.completed_at,
        createdBy: warranty.created_by,
        quantityReceived: warranty.quantity_received ?? 1,
        quantityDelivered: warranty.quantity_delivered ?? 1,
        originalSale: warranty.original_sale ? {
          id: warranty.original_sale.id,
          invoiceNumber: warranty.original_sale.invoice_number,
          total: warranty.original_sale.total,
          createdAt: warranty.original_sale.created_at
        } as any : undefined,
        client: warranty.client,
        productReceived: warranty.product_received,
        productDelivered: warranty.product_delivered,
        warrantyProducts: warranty.warranty_products?.map(wp => ({
          id: wp.id,
          warrantyId: wp.warranty_id,
          productId: wp.product_id,
          serialNumber: wp.serial_number,
          condition: wp.condition,
          notes: wp.notes,
          createdAt: wp.created_at,
          product: wp.product
        })) || [],
        statusHistory: warranty.warranty_status_history?.map(sh => ({
          id: sh.id,
          warrantyId: sh.warranty_id,
          previousStatus: sh.previous_status,
          newStatus: sh.new_status,
          notes: sh.notes,
          changedAt: sh.changed_at,
          changedBy: sh.changed_by_user ? {
            id: sh.changed_by_user.id,
            name: sh.changed_by_user.name
          } : undefined
        })) || []
      }))

      return mappedWarranties
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Obtener garantía por ID
  static async getWarrantyById(id: string): Promise<Warranty | null> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      let query = supabase
        .from('warranties')
        .select(`
          *,
          original_sale:sales!original_sale_id (
            id,
            invoice_number,
            total,
            created_at
          ),
          client:clients!client_id (
            id,
            name,
            email,
            phone
          ),
          product_received:products!product_received_id (
            id,
            name,
            reference,
            price
          ),
          product_delivered:products!product_delivered_id (
            id,
            name,
            reference,
            price
          ),
          warranty_products (
            id,
            product_id,
            serial_number,
            condition,
            notes,
            created_at,
            product:products (
              id,
              name,
              reference
            )
          ),
          warranty_status_history (
            id,
            previous_status,
            new_status,
            notes,
            changed_at,
            changed_by_user:users (
              id,
              name
            )
          )
        `)
        .eq('id', id)

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo garantías de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.single()

      if (error) {
        throw error
      }

      if (!data) return null

      // Mapear datos (similar al método anterior)
      return {
        id: data.id,
        originalSaleId: data.original_sale_id ?? null,
        clientId: data.client_id ?? null,
        clientName: data.client_name ?? 'Cliente sin factura',
        productReceivedId: data.product_received_id,
        productReceivedName: data.product_received_name,
        productReceivedSerial: data.product_received_serial,
        productDeliveredId: data.product_delivered_id,
        productDeliveredName: data.product_delivered_name,
        reason: data.reason,
        status: data.status,
        notes: data.notes,
        storeId: data.store_id || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
        createdBy: data.created_by,
        quantityReceived: data.quantity_received ?? 1,
        quantityDelivered: data.quantity_delivered ?? 1,
        originalSale: data.original_sale,
        client: data.client,
        productReceived: data.product_received,
        productDelivered: data.product_delivered,
        warrantyProducts: data.warranty_products,
        statusHistory: data.warranty_status_history
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Crear nueva garantía
  static async createWarranty(warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'> & { replacementQuantity?: number, quantityReceived?: number, productReceivedReference?: string, productReceivedPrice?: number, productDeliveredReference?: string, productDeliveredPrice?: number }): Promise<Warranty> {
    try {
      const quantityReceived = warrantyData.quantityReceived || 1
      const quantityDelivered = warrantyData.replacementQuantity || 1

      // Obtener store_id del usuario actual
      const storeId = warrantyData.storeId || getCurrentUserStoreId() || '00000000-0000-0000-0000-000000000001'

      const { data, error } = await supabase
        .from('warranties')
        .insert([{
          original_sale_id: warrantyData.originalSaleId ?? null,
          client_id: warrantyData.clientId ?? null,
          client_name: warrantyData.clientName ?? 'Cliente sin factura',
          product_received_id: warrantyData.productReceivedId,
          product_received_name: warrantyData.productReceivedName,
          product_received_serial: warrantyData.productReceivedSerial,
          product_delivered_id: warrantyData.productDeliveredId,
          product_delivered_name: warrantyData.productDeliveredName,
          reason: warrantyData.reason,
          status: warrantyData.status,
          notes: warrantyData.notes,
          created_by: warrantyData.createdBy,
          quantity_received: quantityReceived,
          quantity_delivered: quantityDelivered,
          store_id: storeId
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Crear entrada en el historial de estados
      await this.addStatusHistory(data.id, null, warrantyData.status, 'Garantía creada', warrantyData.createdBy)

      // Obtener referencias, precios y información de stock para el log
      // Usar las referencias y precios pasados directamente desde el modal si están disponibles
      let productReceivedReference = warrantyData.productReceivedReference
      let productReceivedPrice = warrantyData.productReceivedPrice
      let productDeliveredReference = warrantyData.productDeliveredReference
      let productDeliveredPrice = warrantyData.productDeliveredPrice
      let stockInfo: any = null

      // Siempre obtener información del producto defectuoso desde la BD para asegurar datos actualizados
      if (warrantyData.productReceivedId) {
        try {
          const { data: receivedProduct } = await supabase
            .from('products')
            .select('reference, price')
            .eq('id', warrantyData.productReceivedId)
            .single()
          if (receivedProduct) {
            // Usar la referencia de la BD si está disponible, sino usar la pasada desde el modal
            const dbReference = receivedProduct.reference
            productReceivedReference = (dbReference && dbReference.trim() !== '') ? dbReference : (productReceivedReference || 'N/A')
            // Usar el precio de la BD si no se pasó desde el modal o es 0
            if (!productReceivedPrice || productReceivedPrice === 0) {
              productReceivedPrice = Number(receivedProduct.price) || 0
            }
          }
        } catch (error) {
          // Error silencioso - usar valores pasados desde el modal
        }
      }
      
      // Asegurar valores por defecto (convertir null/undefined a string)
      if (!productReceivedReference || productReceivedReference === null || productReceivedReference === undefined) {
        productReceivedReference = 'N/A'
      }
      if (!productReceivedPrice || productReceivedPrice === null || productReceivedPrice === undefined) {
        productReceivedPrice = 0
      }

      // Obtener información del producto de reemplazo y stock ANTES del descuento
      if (warrantyData.productDeliveredId && warrantyData.status === 'completed') {
        try {
          // Leer stock ANTES de descontarlo (esto se hace antes del descuento en el código siguiente)
          const { data: deliveredProductBefore } = await supabase
            .from('products')
            .select('reference, price, stock_store, stock_warehouse')
            .eq('id', warrantyData.productDeliveredId)
            .single()
          
          if (deliveredProductBefore) {
            // Usar la referencia de la BD si está disponible, sino usar la pasada desde el modal
            const dbReference = deliveredProductBefore.reference
            productDeliveredReference = (dbReference && dbReference.trim() !== '') ? dbReference : (productDeliveredReference || 'N/A')
            // Usar el precio de la BD si no se pasó desde el modal o es 0
            if (!productDeliveredPrice || productDeliveredPrice === 0) {
              productDeliveredPrice = Number(deliveredProductBefore.price) || 0
            }
            
            const previousStoreStock = Number(deliveredProductBefore.stock_store) || 0
            const previousWarehouseStock = Number(deliveredProductBefore.stock_warehouse) || 0
            
            // Determinar de dónde se descontará (local primero, luego warehouse)
            let storeDeduction = 0
            let warehouseDeduction = 0
            let remainingToDeduct = quantityDelivered
            
            if (previousStoreStock > 0 && remainingToDeduct > 0) {
              storeDeduction = Math.min(previousStoreStock, remainingToDeduct)
              remainingToDeduct -= storeDeduction
            }
            
            if (remainingToDeduct > 0 && previousWarehouseStock > 0) {
              warehouseDeduction = Math.min(previousWarehouseStock, remainingToDeduct)
              remainingToDeduct -= warehouseDeduction
            }
            
            stockInfo = {
              storeDeduction,
              warehouseDeduction,
              previousStoreStock,
              previousWarehouseStock,
              newStoreStock: previousStoreStock - storeDeduction,
              newWarehouseStock: previousWarehouseStock - warehouseDeduction
            }
          }
        } catch (error) {
          // Error silencioso
        }
      } else if (warrantyData.productDeliveredId) {
        // Si no está completada, obtener referencia y precio desde la BD
        try {
          const { data: deliveredProduct } = await supabase
            .from('products')
            .select('reference, price')
            .eq('id', warrantyData.productDeliveredId)
            .single()
          if (deliveredProduct) {
            // Usar la referencia de la BD si está disponible, sino usar la pasada desde el modal
            const dbReference = deliveredProduct.reference
            productDeliveredReference = (dbReference && dbReference.trim() !== '') ? dbReference : (productDeliveredReference || 'N/A')
            // Usar el precio de la BD si no se pasó desde el modal o es 0
            if (!productDeliveredPrice || productDeliveredPrice === 0) {
              productDeliveredPrice = Number(deliveredProduct.price) || 0
            }
          }
        } catch (error) {
          // Error silencioso - usar valores pasados desde el modal
        }
      }
      
      // Asegurar valores por defecto para producto entregado (convertir null/undefined a string)
      if (!productDeliveredReference || productDeliveredReference === null || productDeliveredReference === undefined) {
        productDeliveredReference = 'N/A'
      }
      if (!productDeliveredPrice || productDeliveredPrice === null || productDeliveredPrice === undefined) {
        productDeliveredPrice = 0
      }

      // Log de actividad
      if (warrantyData.createdBy) {
        await AuthService.logActivity(
          warrantyData.createdBy,
          'warranty_create',
          'warranties',
          {
            description: `Nueva garantía creada: ${warrantyData.clientName} - Producto defectuoso: ${warrantyData.productReceivedName} (Ref: ${productReceivedReference})${warrantyData.productDeliveredName ? ` - Producto entregado: ${warrantyData.productDeliveredName} (Ref: ${productDeliveredReference})` : ''}`,
            warrantyId: data.id,
            clientName: warrantyData.clientName,
            clientId: warrantyData.clientId || null,
            productReceivedId: warrantyData.productReceivedId,
            productReceivedName: warrantyData.productReceivedName,
            productReceivedReference: productReceivedReference,
            productReceivedPrice: productReceivedPrice,
            quantityReceived: quantityReceived,
            productDeliveredId: warrantyData.productDeliveredId || null,
            productDeliveredName: warrantyData.productDeliveredName || null,
            productDeliveredReference: productDeliveredReference,
            productDeliveredPrice: productDeliveredPrice,
            quantityDelivered: quantityDelivered,
            status: warrantyData.status,
            reason: warrantyData.reason,
            notes: warrantyData.notes || null,
            stockInfo: stockInfo
          }
        )
      }

      // Crear entrada en warranty_products para el producto defectuoso
      await supabase
        .from('warranty_products')
        .insert([{
          warranty_id: data.id,
          product_id: warrantyData.productReceivedId,
          serial_number: warrantyData.productReceivedSerial,
          condition: 'defective',
          notes: warrantyData.reason
        }])

      // Si la garantía está completada y tiene producto de reemplazo, descontar del inventario
      if (warrantyData.status === 'completed' && warrantyData.productDeliveredId) {
        try {
          // Descontar la cantidad especificada
          const quantityToDeduct = quantityDelivered
          
          // Leer directamente desde la base de datos para obtener el stock más reciente
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('stock_store, stock_warehouse')
            .eq('id', warrantyData.productDeliveredId)
            .single()
          
          if (!productError && productData) {
            const storeStock = Number(productData.stock_store) || 0
            const warehouseStock = Number(productData.stock_warehouse) || 0
            const currentStock = storeStock + warehouseStock
            
            if (currentStock >= quantityToDeduct) {
              // Calcular los nuevos valores de stock descontando la cantidad especificada
              // Inicializar con los valores actuales
              let newStoreStock = storeStock
              let newWarehouseStock = warehouseStock
              let remainingToDeduct = quantityToDeduct
              
              // Descontar primero del local, luego del warehouse
              if (storeStock > 0 && remainingToDeduct > 0) {
                const storeDeduction = Math.min(storeStock, remainingToDeduct)
                newStoreStock = storeStock - storeDeduction
                remainingToDeduct -= storeDeduction
              }
              
              // Si aún falta, descontar del warehouse
              if (remainingToDeduct > 0 && warehouseStock > 0) {
                const warehouseDeduction = Math.min(warehouseStock, remainingToDeduct)
                newWarehouseStock = warehouseStock - warehouseDeduction
                remainingToDeduct -= warehouseDeduction
              }
              
              // Actualizar directamente en la base de datos
              // Usar condiciones para evitar actualizaciones concurrentes
              const { data: updateData, error: updateError } = await supabase
                .from('products')
                .update({
                  stock_store: newStoreStock,
                  stock_warehouse: newWarehouseStock
                })
                .eq('id', warrantyData.productDeliveredId)
                .eq('stock_store', storeStock) // Solo actualizar si el stock local no ha cambiado
                .eq('stock_warehouse', warehouseStock) // Solo actualizar si el stock warehouse no ha cambiado
                .select()
              
              // Si no se actualizó ninguna fila, significa que el stock cambió entre la lectura y la actualización
              // Esto previene deducciones múltiples
              if (updateError || !updateData || updateData.length === 0) {
                // Error silencioso en producción - el stock probablemente cambió entre la lectura y la actualización
              }
            } else {
              // No hay suficiente stock, pero no lanzamos error para no interrumpir la creación
            }
          }
        } catch (stockError) {
      // Error silencioso en producción
          // No lanzar el error para no interrumpir la creación de la garantía
        }
      }

      return this.getWarrantyById(data.id) as Promise<Warranty>
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Actualizar estado de garantía
  static async updateWarrantyStatus(
    warrantyId: string, 
    newStatus: string, 
    notes?: string, 
    userId?: string
  ): Promise<void> {
    try {
      // Verificar que la garantía pertenece a la tienda del usuario (si no es admin principal)
      const existingWarranty = await this.getWarrantyById(warrantyId)
      if (!existingWarranty) {
        throw new Error('Garantía no encontrada')
      }

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && existingWarranty.storeId !== storeId) {
        throw new Error('No tienes permiso para actualizar esta garantía')
      }

      // Obtener estado actual
      const { data: currentWarranty, error: fetchError } = await supabase
        .from('warranties')
        .select('status')
        .eq('id', warrantyId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      const previousStatus = currentWarranty.status

      // Actualizar estado
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Si se completa, agregar fecha de completado
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('warranties')
        .update(updateData)
        .eq('id', warrantyId)

      if (updateError) {
        throw updateError
      }

      // Agregar al historial
      await this.addStatusHistory(warrantyId, previousStatus, newStatus, notes, userId)

      // Log de actividad
      if (userId) {
        await AuthService.logActivity(
          userId,
          'warranty_status_update',
          'warranties',
          {
            description: `Estado de garantía actualizado: ${previousStatus} → ${newStatus}`,
            warrantyId: warrantyId,
            previousStatus: previousStatus,
            newStatus: newStatus,
            notes: notes || 'Sin notas adicionales'
          }
        )
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Agregar entrada al historial de estados
  static async addStatusHistory(
    warrantyId: string,
    previousStatus: string | null,
    newStatus: string,
    notes?: string,
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('warranty_status_history')
        .insert([{
          warranty_id: warrantyId,
          previous_status: previousStatus,
          new_status: newStatus,
          notes: notes,
          changed_by: userId
        }])

      if (error) {
        throw error
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Buscar garantías
  static async searchWarranties(searchTerm: string): Promise<Warranty[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let query = supabase
        .from('warranties')
        .select(`
          *,
          original_sale:sales!original_sale_id (
            id,
            invoice_number,
            total,
            created_at
          ),
          client:clients!client_id (
            id,
            name,
            email,
            phone
          ),
          product_received:products!product_received_id (
            id,
            name,
            reference,
            price
          )
        `)

      // Filtrar por store_id primero:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo garantías de esa microtienda
        query = query.eq('store_id', storeId)
      }

      // Luego aplicar el filtro de búsqueda
      query = query.or(`client_name.ilike.%${searchTerm}%,product_received_name.ilike.%${searchTerm}%,reason.ilike.%${searchTerm}%`)

      query = query.order('created_at', { ascending: false })
        .limit(50)

      const { data, error } = await query

      if (error) {
        throw error
      }

      // Mapear datos (similar a getAllWarranties)
      return data.map(warranty => ({
        id: warranty.id,
        originalSaleId: warranty.original_sale_id ?? null,
        clientId: warranty.client_id ?? null,
        clientName: warranty.client_name ?? 'Cliente sin factura',
        productReceivedId: warranty.product_received_id,
        productReceivedName: warranty.product_received_name,
        productReceivedSerial: warranty.product_received_serial,
        productDeliveredId: warranty.product_delivered_id,
        productDeliveredName: warranty.product_delivered_name,
        reason: warranty.reason,
        status: warranty.status,
        notes: warranty.notes,
        createdAt: warranty.created_at,
        updatedAt: warranty.updated_at,
        completedAt: warranty.completed_at,
        createdBy: warranty.created_by,
        originalSale: warranty.original_sale,
        client: warranty.client,
        productReceived: warranty.product_received
      }))
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Obtener estadísticas de garantías
  static async getWarrantyStats(): Promise<{
    total: number
    pending: number
    inProgress: number
    completed: number
    rejected: number
    discarded: number
  }> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      let query = supabase
        .from('warranties')
        .select('status')

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar garantías de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo garantías de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo garantías de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const stats = {
        total: data.length,
        pending: data.filter(w => w.status === 'pending').length,
        inProgress: data.filter(w => w.status === 'in_progress').length,
        completed: data.filter(w => w.status === 'completed').length,
        rejected: data.filter(w => w.status === 'rejected').length,
        discarded: data.filter(w => w.status === 'discarded').length
      }

      return stats
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }
}
