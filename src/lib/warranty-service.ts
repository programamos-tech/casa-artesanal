import { supabase } from './supabase'
import { Warranty, WarrantyProduct, WarrantyStatusHistory } from '@/types'
import { AuthService } from './auth-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'
import { sumWarrantyLineTotals, type WarrantyLineInput } from './warranty-lines'

export type CreateWarrantyInput = Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'> & {
  receivedLines?: WarrantyLineInput[]
  deliveredLines?: WarrantyLineInput[]
  replacementQuantity?: number
  quantityReceived?: number
  productReceivedReference?: string
  productReceivedPrice?: number
  productDeliveredReference?: string
  productDeliveredPrice?: number
}

const WARRANTY_PRODUCT_SELECT = `
  id,
  product_id,
  product_name,
  serial_number,
  role,
  quantity,
  unit_price,
  line_total,
  sale_item_id,
  condition,
  notes,
  created_at,
  updated_at,
  product:products (
    id,
    name,
    reference,
    price
  )
`

function mapWarrantyProductRow(wp: Record<string, unknown>): WarrantyProduct {
  return {
    id: wp.id as string,
    warrantyId: wp.warranty_id as string,
    productId: wp.product_id as string,
    productName: (wp.product_name as string) || undefined,
    serialNumber: (wp.serial_number as string) || undefined,
    role: ((wp.role as string) || 'received') as 'received' | 'delivered',
    quantity: Number(wp.quantity ?? 1),
    unitPrice: Number(wp.unit_price ?? 0),
    lineTotal: Number(wp.line_total ?? 0),
    saleItemId: (wp.sale_item_id as string) || undefined,
    condition: wp.condition as WarrantyProduct['condition'],
    notes: (wp.notes as string) || undefined,
    createdAt: wp.created_at as string,
    updatedAt: (wp.updated_at as string) || (wp.created_at as string),
    product: wp.product as WarrantyProduct['product'],
  }
}

async function deductProductStock(productId: string, quantityToDeduct: number): Promise<boolean> {
  if (quantityToDeduct <= 0) return true

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('stock_store, stock_warehouse')
    .eq('id', productId)
    .single()

  if (productError || !productData) return false

  const storeStock = Number(productData.stock_store) || 0
  const warehouseStock = Number(productData.stock_warehouse) || 0
  const currentStock = storeStock + warehouseStock
  if (currentStock < quantityToDeduct) return false

  let newStoreStock = storeStock
  let newWarehouseStock = warehouseStock
  let remaining = quantityToDeduct

  if (storeStock > 0 && remaining > 0) {
    const storeDeduction = Math.min(storeStock, remaining)
    newStoreStock = storeStock - storeDeduction
    remaining -= storeDeduction
  }

  if (remaining > 0 && warehouseStock > 0) {
    const warehouseDeduction = Math.min(warehouseStock, remaining)
    newWarehouseStock = warehouseStock - warehouseDeduction
    remaining -= warehouseDeduction
  }

  const { data: updateData, error: updateError } = await supabase
    .from('products')
    .update({
      stock_store: newStoreStock,
      stock_warehouse: newWarehouseStock,
    })
    .eq('id', productId)
    .eq('stock_store', storeStock)
    .eq('stock_warehouse', warehouseStock)
    .select()

  return !updateError && !!updateData && updateData.length > 0
}

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
            ${WARRANTY_PRODUCT_SELECT}
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
        saleTotalSnapshot: Number(warranty.sale_total_snapshot ?? warranty.original_sale?.total ?? 0),
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
        warrantyProducts: warranty.warranty_products?.map((wp: Record<string, unknown>) => mapWarrantyProductRow(wp)),
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
            ${WARRANTY_PRODUCT_SELECT}
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
        saleTotalSnapshot: Number(warranty.sale_total_snapshot ?? warranty.original_sale?.total ?? 0),
        originalSale: warranty.original_sale ? {
          id: warranty.original_sale.id,
          invoiceNumber: warranty.original_sale.invoice_number,
          total: warranty.original_sale.total,
          createdAt: warranty.original_sale.created_at
        } as any : undefined,
        client: warranty.client,
        productReceived: warranty.product_received,
        productDelivered: warranty.product_delivered,
        warrantyProducts: warranty.warranty_products?.map((wp: Record<string, unknown>) => mapWarrantyProductRow(wp)) || [],
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
            ${WARRANTY_PRODUCT_SELECT}
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
        saleTotalSnapshot: Number(data.sale_total_snapshot ?? data.original_sale?.total ?? 0),
        originalSale: data.original_sale,
        client: data.client,
        productReceived: data.product_received,
        productDelivered: data.product_delivered,
        warrantyProducts: (data.warranty_products || []).map((wp: Record<string, unknown>) => mapWarrantyProductRow(wp)),
        statusHistory: data.warranty_status_history
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Crear nueva garantía
  static async createWarranty(warrantyData: CreateWarrantyInput): Promise<Warranty> {
    try {
      const storeId = warrantyData.storeId || getCurrentUserStoreId() || '00000000-0000-0000-0000-000000000001'

      const receivedLines: WarrantyLineInput[] = warrantyData.receivedLines?.length
        ? warrantyData.receivedLines
        : warrantyData.productReceivedId
          ? [{
              productId: warrantyData.productReceivedId,
              productName: warrantyData.productReceivedName,
              productReference: warrantyData.productReceivedReference,
              quantity: warrantyData.quantityReceived || 1,
              unitPrice: warrantyData.productReceivedPrice || 0,
              lineTotal: (warrantyData.productReceivedPrice || 0) * (warrantyData.quantityReceived || 1),
              role: 'received',
              serialNumber: warrantyData.productReceivedSerial,
            }]
          : []

      const deliveredLines: WarrantyLineInput[] = warrantyData.deliveredLines?.length
        ? warrantyData.deliveredLines
        : warrantyData.productDeliveredId
          ? [{
              productId: warrantyData.productDeliveredId,
              productName: warrantyData.productDeliveredName || 'Producto',
              productReference: warrantyData.productDeliveredReference,
              quantity: warrantyData.replacementQuantity || warrantyData.quantityDelivered || 1,
              unitPrice: warrantyData.productDeliveredPrice || 0,
              lineTotal: (warrantyData.productDeliveredPrice || 0) * (warrantyData.replacementQuantity || warrantyData.quantityDelivered || 1),
              role: 'delivered',
            }]
          : []

      if (receivedLines.length === 0) {
        throw new Error('Debe incluir al menos un producto recibido')
      }
      if (deliveredLines.length === 0) {
        throw new Error('Debe incluir al menos un producto de reemplazo')
      }

      const saleTotalSnapshot = warrantyData.saleTotalSnapshot ?? 0
      const deliveredTotal = sumWarrantyLineTotals(deliveredLines)
      if (saleTotalSnapshot > 0 && Math.round(deliveredTotal) !== Math.round(saleTotalSnapshot)) {
        throw new Error('El total de productos entregados debe coincidir con el total de la factura')
      }

      if (warrantyData.originalSaleId) {
        const { data: existing } = await supabase
          .from('warranties')
          .select('id')
          .eq('original_sale_id', warrantyData.originalSaleId)
          .maybeSingle()
        if (existing) {
          throw new Error('Ya existe una garantía registrada para esta factura')
        }
      }

      const firstReceived = receivedLines[0]
      const firstDelivered = deliveredLines[0]
      const quantityReceived = receivedLines.reduce((sum, line) => sum + line.quantity, 0)
      const quantityDelivered = deliveredLines.reduce((sum, line) => sum + line.quantity, 0)
      const receivedSummary =
        receivedLines.length === 1
          ? firstReceived.productName
          : `${firstReceived.productName} +${receivedLines.length - 1} más`
      const deliveredSummary =
        deliveredLines.length === 1
          ? firstDelivered.productName
          : `${firstDelivered.productName} +${deliveredLines.length - 1} más`

      const { data, error } = await supabase
        .from('warranties')
        .insert([{
          original_sale_id: warrantyData.originalSaleId ?? null,
          client_id: warrantyData.clientId ?? null,
          client_name: warrantyData.clientName ?? 'Cliente sin factura',
          product_received_id: firstReceived.productId,
          product_received_name: receivedSummary,
          product_received_serial: firstReceived.serialNumber,
          product_delivered_id: firstDelivered.productId,
          product_delivered_name: deliveredSummary,
          reason: warrantyData.reason,
          status: warrantyData.status,
          notes: warrantyData.notes,
          created_by: warrantyData.createdBy,
          quantity_received: quantityReceived,
          quantity_delivered: quantityDelivered,
          sale_total_snapshot: saleTotalSnapshot,
          store_id: storeId,
          completed_at: warrantyData.status === 'completed' ? new Date().toISOString() : null,
        }])
        .select()
        .single()

      if (error) throw error

      await this.addStatusHistory(data.id, null, warrantyData.status, 'Garantía creada', warrantyData.createdBy)

      const lineRows = [...receivedLines, ...deliveredLines].map((line) => ({
        warranty_id: data.id,
        product_id: line.productId,
        product_name: line.productName,
        serial_number: line.serialNumber ?? null,
        role: line.role,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
        sale_item_id: line.saleItemId ?? null,
        condition: line.role === 'received' ? 'defective' : 'repaired',
        notes: warrantyData.reason,
      }))

      const { error: linesError } = await supabase.from('warranty_products').insert(lineRows)
      if (linesError) throw linesError

      if (warrantyData.status === 'completed') {
        for (const line of deliveredLines) {
          const ok = await deductProductStock(line.productId, line.quantity)
          if (!ok) {
            throw new Error(`Stock insuficiente para entregar: ${line.productName}`)
          }
        }
      }

      if (warrantyData.createdBy) {
        await AuthService.logActivity(
          warrantyData.createdBy,
          'warranty_create',
          'warranties',
          {
            description: `Garantía factura ${warrantyData.clientName}: entregado $${deliveredTotal.toLocaleString('es-CO')} / total factura $${saleTotalSnapshot.toLocaleString('es-CO')}`,
            warrantyId: data.id,
            clientName: warrantyData.clientName,
            originalSaleId: warrantyData.originalSaleId,
            saleTotalSnapshot,
            deliveredTotal,
            receivedCount: receivedLines.length,
            deliveredCount: deliveredLines.length,
            status: warrantyData.status,
            reason: warrantyData.reason,
            notes: warrantyData.notes || null,
          }
        )
      }

      return this.getWarrantyById(data.id) as Promise<Warranty>
    } catch (error) {
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
