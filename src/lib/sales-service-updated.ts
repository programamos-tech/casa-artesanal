import { supabase } from './supabase'
import { Sale, SaleItem } from '@/types'
import { AuthService } from './auth-service'
import { ProductsService } from './products-service'

export class SalesService {
  // Generar el siguiente número de factura
  static async getNextInvoiceNumber(): Promise<string> {
    try {
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      if (error) {
      // Error silencioso en producción
        return '#001' // Fallback
      }

      const nextNumber = (count || 0) + 1
      return `#${nextNumber.toString().padStart(3, '0')}`
    } catch (error) {
      // Error silencioso en producción
      return '#001' // Fallback
    }
  }

  static async getAllSales(): Promise<Sale[]> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            discount,
            total
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        throw error
      }

      return await Promise.all(data?.map(async sale => ({
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: sale.discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        createdAt: sale.created_at,
        items: await Promise.all(sale.sale_items?.map(async (item: any) => {
          // Obtener el código de referencia del producto
          const { data: product } = await supabase
            .from('products')
            .select('reference_code')
            .eq('id', item.product_id)
            .single()
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: product?.reference_code || 'N/A',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        }) || [])
      })) || [])
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async getSaleById(id: string): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            discount,
            discount_type,
            total
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
      // Error silencioso en producción
        throw error
      }

      if (!data) return null

      const result = {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        total: data.total,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        discountType: data.discount_type || 'amount',
        status: data.status,
        paymentMethod: data.payment_method,
        invoiceNumber: data.invoice_number,
        sellerId: data.seller_id,
        sellerName: data.seller_name,
        sellerEmail: data.seller_email,
        createdAt: data.created_at,
        items: await Promise.all(data.sale_items?.map(async (item: any) => {
          // Obtener el código de referencia del producto
          const { data: product } = await supabase
            .from('products')
            .select('reference_code')
            .eq('id', item.product_id)
            .single()
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: product?.reference_code || 'N/A',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        }) || [])
      }

      return result
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>, currentUserId: string): Promise<Sale> {
    try {
      // Generar número de factura secuencial
      const invoiceNumber = await this.getNextInvoiceNumber()
      
      // Obtener información del usuario actual
      const currentUser = await AuthService.getCurrentUser()
      
      // Crear la venta
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          discount_type: saleData.discountType || 'amount',
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          invoice_number: invoiceNumber,
          seller_id: currentUser?.id || currentUserId,
          seller_name: currentUser?.name || 'Usuario',
          seller_email: currentUser?.email || ''
        })
        .select()
        .single()

      if (saleError) {
      // Error silencioso en producción
        throw saleError
      }

      // Crear los items de la venta y descontar stock
      if (saleData.items && saleData.items.length > 0) {
        // Primero descontar stock de todos los productos
        for (const item of saleData.items) {
          const stockDeducted = await ProductsService.deductStockForSale(
            item.productId, 
            item.quantity, 
            currentUserId
          )
          
          if (!stockDeducted) {
            // Si no se pudo descontar stock, revertir la venta
            await supabase.from('sales').delete().eq('id', sale.id)
            throw new Error(`No hay suficiente stock para el producto: ${item.productName}`)
          }
        }

        // Si todo el stock se descontó correctamente, crear los items de la venta
        const saleItems = saleData.items.map(item => ({
          sale_id: sale.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          discount_type: item.discountType || 'amount',
          total: item.total
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)

        if (itemsError) {
      // Error silencioso en producción
          throw itemsError
        }
      }

      // Crear el registro de pago si es necesario
      if (saleData.paymentMethod !== 'credit') {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            sale_id: sale.id,
            client_id: saleData.clientId,
            client_name: saleData.clientName,
            invoice_number: invoiceNumber,
            total_amount: saleData.total,
            paid_amount: saleData.paymentMethod === 'cash' ? saleData.total : 0,
            pending_amount: saleData.paymentMethod === 'cash' ? 0 : saleData.total,
            status: saleData.paymentMethod === 'cash' ? 'completed' : 'pending'
          })

        if (paymentError) {
      // Error silencioso en producción
          throw paymentError
        }
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_create',
        'sales',
        {
          description: `Nueva venta creada: ${saleData.clientName} - Total: $${saleData.total.toLocaleString()}`,
          saleId: sale.id,
          clientName: saleData.clientName,
          total: saleData.total,
          paymentMethod: saleData.paymentMethod,
          itemsCount: saleData.items?.length || 0
        }
      )

      // Retornar la venta creada
      const newSale: Sale = {
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: sale.discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: invoiceNumber,
        createdAt: sale.created_at,
        items: saleData.items || []
      }

      return newSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async updateSale(id: string, saleData: Partial<Sale>, currentUserId: string): Promise<Sale> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          discount_type: saleData.discountType || 'amount',
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_update',
        'sales',
        {
          description: `Venta actualizada: ${saleData.clientName || 'Venta'} - Total: $${saleData.total?.toLocaleString() || 'N/A'}`,
          saleId: id,
          changes: Object.keys(saleData).join(', ')
        }
      )

      return {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        total: data.total,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        status: data.status,
        paymentMethod: data.payment_method,
        createdAt: data.created_at,
        items: saleData.items || []
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async deleteSale(id: string, currentUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_delete',
        'sales',
        {
          description: `Venta eliminada: ID ${id}`,
          saleId: id
        }
      )
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async cancelSale(id: string, reason: string, currentUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_cancel',
        'sales',
        {
          description: `Venta cancelada: ID ${id} - Motivo: ${reason}`,
          saleId: id,
          reason: reason
        }
      )
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async searchSales(searchTerm: string): Promise<Sale[]> {
    try {
      const cleanTerm = searchTerm.trim()
      if (!cleanTerm) return []

      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            discount,
            discount_type,
            total
          )
        `)

      // Detectar si es un número (ID de factura) o una fecha
      const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanTerm) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(cleanTerm)
      const isNumber = !isNaN(Number(cleanTerm)) && cleanTerm.length > 0

      if (isDate) {
        // Búsqueda por fecha
        let dateToSearch: Date | null = null
        
        // Intentar parsear formato DD/MM/YYYY
        if (cleanTerm.includes('/')) {
          const [day, month, year] = cleanTerm.split('/').map(Number)
          dateToSearch = new Date(year, month - 1, day)
        } 
        // Intentar parsear formato YYYY-MM-DD
        else if (cleanTerm.includes('-')) {
          dateToSearch = new Date(cleanTerm)
        }

        if (dateToSearch && !isNaN(dateToSearch.getTime())) {
          // Buscar por fecha (sin hora)
          const startOfDay = new Date(dateToSearch)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(dateToSearch)
          endOfDay.setHours(23, 59, 59, 999)

          query = query
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
        }
      } else if (isNumber) {
        // Búsqueda por número de factura (sin el #)
        const numericValue = cleanTerm.replace('#', '')
        query = query.or(`invoice_number.eq.#${numericValue.padStart(3, '0')},invoice_number.ilike.%${numericValue}%`)
      } else {
        // Si no es número ni fecha, no buscar nada
        return []
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        throw error
      }

      return await Promise.all(data?.map(async sale => ({
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: sale.discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        createdAt: sale.created_at,
        items: await Promise.all(sale.sale_items?.map(async (item: any) => {
          // Obtener el código de referencia del producto
          const { data: product } = await supabase
            .from('products')
            .select('reference_code')
            .eq('id', item.product_id)
            .single()
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: product?.reference_code || 'N/A',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        }) || [])
      })) || [])
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }
}
