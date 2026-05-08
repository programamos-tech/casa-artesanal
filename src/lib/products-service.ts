import { supabase, supabaseAdmin } from './supabase'
import { Product } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { AuthService } from './auth-service'
import { StoresService } from './stores-service'
import { getCurrentUserStoreId, isMainStoreUser } from './store-helper'

// Tipo para filtros de stock (funciona tanto para tienda principal como microtiendas)
export type StockFilter =
  | 'all'
  | 'Sin Stock'
  | 'Disponible Local'
  | 'Stock Local Bajo'
  | 'Stock Local Muy Bajo'
  | 'Solo Bodega'
  | 'Solo Bodega (Bajo)'
  | 'Solo Bodega (Muy Bajo)'

export class ProductsService {
  // Helper para aplicar filtro de stock a productos ya mapeados (funciona para tienda principal y microtiendas)
  private static applyStockFilterToProducts(products: Product[], stockFilter?: StockFilter): Product[] {
    if (!stockFilter || stockFilter === 'all') {
      return products
    }

    return products.filter(product => {
      const storeStock = product.stock?.store || 0
      const warehouseStock = product.stock?.warehouse || 0

      switch (stockFilter) {
        case 'Sin Stock':
          return storeStock === 0 && warehouseStock === 0
        case 'Disponible Local':
          return storeStock >= 10
        case 'Stock Local Bajo':
          return storeStock >= 5 && storeStock <= 9
        case 'Stock Local Muy Bajo':
          return storeStock >= 1 && storeStock <= 4
        case 'Solo Bodega':
          return storeStock === 0 && warehouseStock >= 20
        case 'Solo Bodega (Bajo)':
          return storeStock === 0 && warehouseStock >= 10 && warehouseStock <= 19
        case 'Solo Bodega (Muy Bajo)':
          return storeStock === 0 && warehouseStock >= 1 && warehouseStock <= 9
        default:
          return true
      }
    })
  }
  // Helper para obtener stock según el tipo de tienda
  private static async getProductStockForStore(productId: string, storeId: string | null): Promise<{ warehouse: number, store: number, total: number }> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      if (isMainStore) {
        // Para tienda principal, obtener stock de products
        const { data: product, error } = await supabaseAdmin
          .from('products')
          .select('stock_warehouse, stock_store')
          .eq('id', productId)
          .single()

        if (error) {
          // console.error('[PRODUCTS SERVICE] Error fetching stock for main store:', error)
          return { warehouse: 0, store: 0, total: 0 }
        }

        if (!product) {
          // console.warn('[PRODUCTS SERVICE] Product not found for stock:', productId)
          return { warehouse: 0, store: 0, total: 0 }
        }

        const warehouse = product.stock_warehouse || 0
        const store = product.stock_store || 0
        return { warehouse, store, total: warehouse + store }
      } else {
        // Para micro tiendas, obtener stock de store_stock
        const { data: storeStock, error } = await supabaseAdmin
          .from('store_stock')
          .select('quantity')
          .eq('store_id', storeId)
          .eq('product_id', productId)
          .maybeSingle()

        if (error) {
          // console.error('[PRODUCTS SERVICE] Error fetching stock for micro store:', error)
          return { warehouse: 0, store: 0, total: 0 }
        }

        const storeStockQuantity = storeStock?.quantity || 0
        // En micro tiendas, todo el stock es "local" (store), no hay warehouse
        return { warehouse: 0, store: storeStockQuantity, total: storeStockQuantity }
      }
    } catch (error) {
      // console.error('[PRODUCTS SERVICE] Exception in getProductStockForStore:', error)
      return { warehouse: 0, store: 0, total: 0 }
    }
  }

  // Helper para obtener stock de múltiples productos de una vez (optimizado)
  private static async getProductsStockForStore(productIds: string[], storeId: string | null): Promise<Map<string, { warehouse: number, store: number, total: number }>> {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const isMainStore = !storeId || storeId === MAIN_STORE_ID
    const stockMap = new Map<string, { warehouse: number, store: number, total: number }>()

    // console.log('[PRODUCTS SERVICE] getProductsStockForStore - storeId:', storeId, 'isMainStore:', isMainStore, 'productIds count:', productIds.length)

    if (isMainStore) {
      // Para tienda principal, obtener stock de products
      // Dividir en lotes para evitar timeouts y problemas con muchas peticiones
      const BATCH_SIZE = 100
      let products: any[] = []
      let error: any = null

      // Procesar en lotes
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE)
        let batchSuccess = false

        try {
          const result = await supabaseAdmin
            .from('products')
            .select('id, stock_warehouse, stock_store')
            .in('id', batch)

          if (result.data) {
            products.push(...result.data)
            batchSuccess = true
          }

          if (result.error) {
            // console.warn(`[PRODUCTS SERVICE] supabaseAdmin error for batch ${i / BATCH_SIZE + 1}:`, result.error)
            if (!error) {
              error = result.error
            }
          }
        } catch (err) {
          // console.warn(`[PRODUCTS SERVICE] supabaseAdmin exception for batch ${i / BATCH_SIZE + 1}, trying supabase:`, err)
        }

        // Si el primer intento falló, intentar con supabase
        if (!batchSuccess) {
          try {
            const result = await supabase
              .from('products')
              .select('id, stock_warehouse, stock_store')
              .in('id', batch)

            if (result.data) {
              products.push(...result.data)
              batchSuccess = true
            }

            if (result.error) {
              // console.warn(`[PRODUCTS SERVICE] supabase error for batch ${i / BATCH_SIZE + 1}:`, result.error)
              if (!error) {
                error = result.error
              }
            }
          } catch (err2) {
            // console.error(`[PRODUCTS SERVICE] Both failed for batch ${i / BATCH_SIZE + 1}:`, err2)
            if (!error) {
              error = err2
            }
          }
        }

        // Si el lote falló completamente, continuar con el siguiente
        // Los productos de este lote tendrán stock 0 (se rellenará más abajo)
      }

      if (error) {
        /* DEBUG: descomentar en local para probar
        // console.error('[PRODUCTS SERVICE] Error fetching products stock:', {
          error,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          productIdsCount: productIds.length,
          productIdsSample: productIds.slice(0, 3)
        })
        */
        // Si hay error, todos los productos tendrán stock 0 (se rellenará más abajo)
      }

      // console.log('[PRODUCTS SERVICE] Fetched products for stock:', products.length || 0, 'products:', products.slice(0, 3))

      if (products.length > 0) {
        products.forEach((product: any) => {
          const warehouse = product.stock_warehouse || 0
          const store = product.stock_store || 0
          const stock = { warehouse, store, total: warehouse + store }
          stockMap.set(product.id, stock)
          if (productIds.indexOf(product.id) < 3) {
            // console.log('[PRODUCTS SERVICE] Set stock for product:', product.id, stock)
          }
        })
      }
    } else {
      // Para micro tiendas, obtener stock de store_stock
      // Dividir en lotes para evitar timeouts con muchas peticiones
      const BATCH_SIZE = 100
      let storeStocks: any[] = []
      let error: any = null

      // Procesar en lotes
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE)

        try {
          const result = await supabaseAdmin
            .from('store_stock')
            .select('product_id, quantity')
            .eq('store_id', storeId)
            .in('product_id', batch)

          if (result.data) {
            storeStocks.push(...result.data)
          }

          if (result.error && !error) {
            error = result.error
          }
        } catch (err) {
          // console.warn(`[PRODUCTS SERVICE] supabaseAdmin failed for batch ${i / BATCH_SIZE + 1}, trying supabase:`, err)
          try {
            const result = await supabase
              .from('store_stock')
              .select('product_id, quantity')
              .eq('store_id', storeId)
              .in('product_id', batch)

            if (result.data) {
              storeStocks.push(...result.data)
            }

            if (result.error && !error) {
              error = result.error
            }
          } catch (err2) {
            // console.error(`[PRODUCTS SERVICE] Both failed for batch ${i / BATCH_SIZE + 1}:`, err2)
            if (!error) {
              error = err2
            }
          }
        }
      }

      // Si no hay datos pero tampoco hay error, mantener storeStocks como array vacío
      // (no establecer como null para evitar problemas en el logging)

      if (error) {
        /* DEBUG: descomentar en local para probar
        console.error('[PRODUCTS SERVICE] Error fetching store_stock:', {
          error,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          storeId,
          productIdsCount: productIds.length,
          productIdsSample: productIds.slice(0, 3)
        })
        */
        // Si hay error, todos los productos tendrán stock 0 (se rellenará más abajo)
      }

      // console.log('[PRODUCTS SERVICE] Fetched store_stock for storeId:', storeId, 'count:', storeStocks.length || 0, 'stocks:', storeStocks.slice(0, 3))

      if (storeStocks.length > 0) {
        storeStocks.forEach((stock: any) => {
          const quantity = Number(stock.quantity) || 0
          // Solo agregar al mapa si la cantidad es > 0, para evitar mostrar stock 0 innecesariamente
          if (quantity > 0) {
            stockMap.set(stock.product_id, { warehouse: 0, store: quantity, total: quantity })
            if (productIds.indexOf(stock.product_id) < 3) {
              // console.log('[PRODUCTS SERVICE] Set stock for product from store_stock:', stock.product_id, { warehouse: 0, store: quantity, total: quantity })
            }
          }
        })
      }
    }

    // Rellenar con 0 para productos que no tienen stock (o que tienen stock 0)
    productIds.forEach(id => {
      if (!stockMap.has(id)) {
        stockMap.set(id, { warehouse: 0, store: 0, total: 0 })
      }
    })

    // console.log('[PRODUCTS SERVICE] Final stockMap size:', stockMap.size, 'sample:', Array.from(stockMap.entries()).slice(0, 3))
    return stockMap
  }

  // Obtener todos los productos con paginación y filtro de stock
  static async getAllProducts(
    page: number = 1,
    limit: number = 10,
    stockFilter?: StockFilter
  ): Promise<{ products: Product[], total: number, hasMore: boolean }> {
    try {
      const currentStoreId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID

      // Para filtros de stock, necesitamos obtener más productos y filtrar después
      // porque el stock real puede venir de store_stock (microtiendas)
      const needsStockFilter = stockFilter && stockFilter !== 'all'
      // En microtienda con filtro hace falta un pool mayor: el stock viene de store_stock
      // y solo una parte del catálogo tiene fila en esa tienda
      const fetchLimit = needsStockFilter
        ? (isMainStore ? limit * 5 : Math.max(limit * 10, 500))
        : limit
      const from = (page - 1) * (needsStockFilter ? fetchLimit : limit)
      const to = from + fetchLimit - 1

      // Obtener productos paginados
      // Ordenar por created_at (más recientes primero)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        // Error silencioso en producción
        return { products: [], total: 0, hasMore: false }
      }

      // Obtener el total de productos
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        // Error silencioso en producción
        return { products: [], total: 0, hasMore: false }
      }

      // Mapear productos con stock correcto según el tipo de tienda (optimizado)
      const productIds = data.map((p: any) => p.id)
      const stockMap = await this.getProductsStockForStore(productIds, currentStoreId)

      // Para microtiendas, obtener cost/price de store_stock
      let costPriceMap = new Map<string, { cost: number | null, price: number | null }>()

      if (!isMainStore && currentStoreId) {
        const { data: storeStockData } = await supabaseAdmin
          .from('store_stock')
          .select('product_id, cost, price')
          .eq('store_id', currentStoreId)
          .in('product_id', productIds)

        if (storeStockData) {
          storeStockData.forEach((item: any) => {
            costPriceMap.set(item.product_id, {
              cost: item.cost,
              price: item.price
            })
          })
        }
      }

      const mappedProducts = data.map((product: any) => {
        const stock = stockMap.get(product.id) || { warehouse: 0, store: 0, total: 0 }

        // Para microtiendas, usar cost/price de store_stock si existe
        // Si el costo en store_stock es 0 o null, usar el costo original del producto como respaldo
        // (esto cubre transferencias anteriores a la implementación de costos por tienda)
        let productCost = product.cost
        let productPrice = product.price

        if (!isMainStore) {
          const storeStockCostPrice = costPriceMap.get(product.id)

          if (storeStockCostPrice) {
            // Si hay registro en store_stock con cost/price, usar esos valores
            // Si cost es null o 0, usar el price de Sincelejo como cost por defecto
            productCost = (storeStockCostPrice.cost !== null && storeStockCostPrice.cost !== 0)
              ? storeStockCostPrice.cost
              : product.price // Precio de venta de Sincelejo como cost por defecto
            productPrice = storeStockCostPrice.price !== null ? storeStockCostPrice.price : 0
          } else {
            // Sin registro: usar price de Sincelejo como cost por defecto
            productCost = product.price
            productPrice = 0
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.category_id,
          brand: product.brand,
          reference: product.reference,
          price: productPrice,
          cost: productCost,
          stock: stock,
          status: product.status,
          imageUrl: product.image_url || undefined,
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      })

      // Aplicar filtro de stock si se especificó
      const filteredProducts = this.applyStockFilterToProducts(mappedProducts, stockFilter)

      // Ordenar: productos con stock primero, luego por fecha más reciente
      const sortedProducts = filteredProducts.sort((a, b) => {
        const aHasStock = a.stock.total > 0
        const bHasStock = b.stock.total > 0

        // Si uno tiene stock y el otro no, el que tiene stock va primero
        if (aHasStock && !bHasStock) return -1
        if (!aHasStock && bHasStock) return 1

        // Si ambos tienen stock o ambos no tienen stock, ordenar por fecha más reciente
        const aDate = a.updatedAt || a.createdAt
        const bDate = b.updatedAt || b.createdAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      // Paginar los resultados filtrados
      const paginatedProducts = needsStockFilter
        ? sortedProducts.slice(0, limit)
        : sortedProducts

      return {
        products: paginatedProducts,
        total: needsStockFilter ? filteredProducts.length : (count || 0),
        hasMore: needsStockFilter
          ? sortedProducts.length > limit
          : to < (count || 0) - 1
      }
    } catch (error) {
      // Error silencioso en producción
      return { products: [], total: 0, hasMore: false }
    }
  }

  // Obtener todos los productos (sin paginación - para compatibilidad)
  static async getAllProductsLegacy(storeId: string | null = null): Promise<Product[]> {
    try {
      // Supabase tiene un límite por defecto de 1000 registros, necesitamos obtener todos en lotes
      const allProducts: Product[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const from = page * pageSize
        const to = from + pageSize - 1

        const { data, error, count } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) {
          // Error silencioso en producción
          break
        }

        if (!data || data.length === 0) {
          hasMore = false
          break
        }

        // Obtener stock correcto según el tipo de tienda (optimizado)
        // Usar el storeId pasado como parámetro, o el del usuario actual si no se pasa
        const currentStoreId = storeId !== null ? storeId : getCurrentUserStoreId()
        const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
        const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID
        // console.log('[PRODUCTS SERVICE] getAllProductsLegacy - storeId:', storeId, 'currentStoreId:', currentStoreId, 'isMainStore:', isMainStore)
        const productIds = data.map((p: any) => p.id)
        const stockMap = await this.getProductsStockForStore(productIds, currentStoreId)

        // Para microtiendas, obtener cost/price de store_stock
        // Solo filtrar por store_id para evitar URLs muy largas con muchos product_ids
        // IMPORTANTE: Usar limit alto para traer todos los registros (Supabase tiene límite de 1000 por defecto)
        let costPriceMap = new Map<string, { cost: number | null, price: number | null }>()
        if (!isMainStore && currentStoreId) {
          // Obtener todos los registros en lotes para evitar el límite de 1000
          let allStoreStockData: any[] = []
          let page = 0
          const pageSize = 1000
          let hasMore = true

          while (hasMore) {
            const from = page * pageSize
            const to = from + pageSize - 1

            const { data: storeStockData, error: storeStockError } = await supabaseAdmin
              .from('store_stock')
              .select('product_id, cost, price')
              .eq('store_id', currentStoreId)
              .range(from, to)

            if (storeStockError || !storeStockData || storeStockData.length === 0) {
              hasMore = false
            } else {
              allStoreStockData = [...allStoreStockData, ...storeStockData]
              hasMore = storeStockData.length === pageSize
              page++
            }
          }

          /* DEBUG: descomentar en local para probar
          // console.log('[PRODUCTS SERVICE] store_stock query result:', {
            currentStoreId,
            storeStockDataCount: allStoreStockData.length,
            sampleData: allStoreStockData.slice(0, 3),
            sampleWithCost: allStoreStockData.filter(d => d.cost !== null && d.cost > 0).slice(0, 3)
          })
          */

          allStoreStockData.forEach((item: any) => {
            costPriceMap.set(item.product_id, {
              cost: item.cost,
              price: item.price
            })
          })
        }

        // Log para depuración
        if (productIds.length > 0) {
          const firstProductStock = stockMap.get(productIds[0])
          /* DEBUG: descomentar en local para probar
          // console.log('[PRODUCTS SERVICE] First product stock from map:', {
            productId: productIds[0],
            stock: firstProductStock,
            stockMapSize: stockMap.size
          })
          */
        }

        const mappedProducts = data.map((product: any) => {
          // Usar el stock del stockMap (que ya tiene el stock correcto según el tipo de tienda)
          // Si no está en el stockMap, usar valores por defecto
          const stockFromMap = stockMap.get(product.id)
          const stock = stockFromMap || { warehouse: 0, store: 0, total: 0 }

          // Para microtiendas, usar cost/price de store_stock si existe
          // Si el costo en store_stock es 0 o null, usar el costo original del producto como respaldo
          // (esto cubre transferencias anteriores a la implementación de costos por tienda)
          let productCost = product.cost
          let productPrice = product.price

          if (!isMainStore) {
            const storeStockCostPrice = costPriceMap.get(product.id)

            if (storeStockCostPrice) {
              // Si hay registro en store_stock con cost/price, usar esos valores
              // Si son null, usar 0 (no se ha configurado el precio aún)
              productCost = storeStockCostPrice.cost !== null ? storeStockCostPrice.cost : 0
              productPrice = storeStockCostPrice.price !== null ? storeStockCostPrice.price : 0
            } else {
              // Sin registro de cost/price: usar 0 (transferencias antiguas o no configurado)
              productCost = 0
              productPrice = 0
            }
          }

          // Log para depuración
          if (productIds.indexOf(product.id) < 3) {
            const storeStockCostPriceDebug = costPriceMap.get(product.id)
            /* DEBUG: descomentar en local para probar
            // console.log('[PRODUCTS SERVICE] Mapped product:', {
              productId: product.id,
              productName: product.name,
              isMainStore: isMainStore,
              originalCost: product.cost,
              originalPrice: product.price,
              storeStockCostPrice: storeStockCostPriceDebug,
              finalCost: productCost,
              finalPrice: productPrice,
              hasStoreStockEntry: !!storeStockCostPriceDebug,
              costPriceMapSize: costPriceMap.size,
              finalStock: stock
            })
            */
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            categoryId: product.category_id,
            brand: product.brand,
            reference: product.reference,
            price: productPrice,
            cost: productCost,
            stock: stock,
            status: product.status,
            imageUrl: product.image_url || undefined,
            createdAt: product.created_at,
            updatedAt: product.updated_at
          }
        })

        // Ordenar: productos con stock primero, luego por fecha más reciente
        const sortedProducts = mappedProducts.sort((a, b) => {
          const aHasStock = a.stock.total > 0
          const bHasStock = b.stock.total > 0

          if (aHasStock && !bHasStock) return -1
          if (!aHasStock && bHasStock) return 1

          const aDate = a.updatedAt || a.createdAt
          const bDate = b.updatedAt || b.createdAt
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })

        allProducts.push(...sortedProducts)

        // Si obtuvimos menos productos que el tamaño de página, no hay más
        if (data.length < pageSize) {
          hasMore = false
        } else {
          // Verificar si hay más productos basado en el count
          const totalCount = count || 0
          if (to >= totalCount - 1) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      // Ordenar todos los productos al final: productos con stock primero, luego por fecha más reciente
      return allProducts.sort((a, b) => {
        const aHasStock = a.stock.total > 0
        const bHasStock = b.stock.total > 0

        if (aHasStock && !bHasStock) return -1
        if (!aHasStock && bHasStock) return 1

        const aDate = a.updatedAt || a.createdAt
        const bDate = b.updatedAt || b.createdAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Obtener el stock total de todos los productos (más eficiente que obtener todos los productos).
  // storeIdOverride: opcional; si la página lo pasa (ej. user?.storeId) se usa para evitar race con auth.
  static async getTotalStock(storeIdOverride?: string | null): Promise<number> {
    try {
      const currentStoreId = storeIdOverride !== undefined ? storeIdOverride : getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID

      if (isMainStore) {
        // Para tienda principal, sumar stock de products
        let totalStock = 0
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const from = page * pageSize
          const to = from + pageSize - 1

          const { data, error } = await supabase
            .from('products')
            .select('stock_warehouse, stock_store')
            .range(from, to)

          if (error) {
            break
          }

          if (!data || data.length === 0) {
            hasMore = false
            break
          }

          const pageStock = data.reduce((sum, product) => {
            const warehouseStock = product.stock_warehouse || 0
            const storeStock = product.stock_store || 0
            return sum + warehouseStock + storeStock
          }, 0)

          totalStock += pageStock

          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        }

        return totalStock
      } else {
        // Para micro tiendas, sumar stock de store_stock (usar supabase con sesión del usuario para RLS)
        const { data, error } = await supabase
          .from('store_stock')
          .select('quantity')
          .eq('store_id', currentStoreId)

        if (error) {
          console.error('[getTotalStock] Error store_stock:', error)
          return 0
        }

        return data?.reduce((sum, stock) => sum + (stock.quantity || 0), 0) || 0
      }
    } catch (error) {
      return 0
    }
  }

  // Obtener producto por ID
  static async getProductById(id: string): Promise<Product | null> {
    try {
      // console.log('[PRODUCTS SERVICE] getProductById called for:', id)

      // Usar supabaseAdmin para evitar problemas de permisos RLS en microtiendas
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // console.error('[PRODUCTS SERVICE] Error fetching product by ID:', error)
        return null
      }

      if (!data) {
        // console.error('[PRODUCTS SERVICE] Product not found:', id)
        return null
      }

      // console.log('[PRODUCTS SERVICE] Product data fetched, getting stock...')

      // Obtener stock correcto según el tipo de tienda
      const currentStoreId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID
      // console.log('[PRODUCTS SERVICE] Current store ID:', currentStoreId, 'isMainStore:', isMainStore)

      const stock = await this.getProductStockForStore(id, currentStoreId)
      // console.log('[PRODUCTS SERVICE] Stock retrieved:', stock)

      // Para microtiendas, obtener cost y price de store_stock
      let productCost = data.cost
      let productPrice = data.price

      if (!isMainStore && currentStoreId) {
        const { data: storeStock } = await supabaseAdmin
          .from('store_stock')
          .select('cost, price')
          .eq('store_id', currentStoreId)
          .eq('product_id', id)
          .single()

        if (storeStock) {
          // Si existe store_stock con cost/price, usarlos
          // Si cost es null o 0, usar el price de Sincelejo como cost por defecto
          productCost = (storeStock.cost !== null && storeStock.cost !== 0)
            ? storeStock.cost
            : data.price // Precio de venta de Sincelejo como cost por defecto
          productPrice = storeStock.price !== null ? storeStock.price : 0
          // console.log('[PRODUCTS SERVICE] Using store_stock cost/price:', { cost: productCost, price: productPrice })
        } else {
          // Sin registro: usar price de Sincelejo como cost por defecto
          productCost = data.price
          productPrice = 0
          // console.log('[PRODUCTS SERVICE] No store_stock entry, using price from Sincelejo as cost:', productCost)
        }
      }

      const product = {
        id: data.id,
        name: data.name,
        description: data.description,
        categoryId: data.category_id,
        brand: data.brand,
        reference: data.reference,
        price: productPrice,
        cost: productCost,
        stock: stock,
        status: data.status,
        imageUrl: data.image_url || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      // console.log('[PRODUCTS SERVICE] Product mapped successfully')
      return product
    } catch (error) {
      // console.error('[PRODUCTS SERVICE] Exception in getProductById:', error)
      return null
    }
  }

  /**
   * Obtener varios productos por IDs en una o pocas peticiones (batch).
   * Devuelve id, name, reference, cost y price para uso en listados/dashboard (p. ej. cálculo de ganancia bruta).
   * En microtiendas aplica cost/price de store_stock igual que getProductById.
   */
  static async getProductsByIds(ids: string[]): Promise<Array<{ id: string; name: string; reference: string | null; cost: number; price: number }>> {
    if (ids.length === 0) return []
    const uniqueIds = Array.from(new Set(ids))
    const CHUNK = 100
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const currentStoreId = getCurrentUserStoreId()
    const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID

    const rawResults: Array<{ id: string; name: string; reference: string | null; cost: number | null; price: number | null }> = []
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const chunk = uniqueIds.slice(i, i + CHUNK)
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('id, name, reference, cost, price')
        .in('id', chunk)
      if (error) continue
      if (data?.length) {
        rawResults.push(...data.map((row: any) => ({
          id: row.id,
          name: row.name ?? '',
          reference: row.reference ?? null,
          cost: row.cost ?? null,
          price: row.price ?? null
        })))
      }
    }

    let costPriceMap = new Map<string, { cost: number | null; price: number | null }>()
    if (!isMainStore && currentStoreId && rawResults.length > 0) {
      const productIds = rawResults.map(p => p.id)
      const { data: storeStockData } = await supabaseAdmin
        .from('store_stock')
        .select('product_id, cost, price')
        .eq('store_id', currentStoreId)
        .in('product_id', productIds)
      if (storeStockData) {
        storeStockData.forEach((item: { product_id: string; cost: number | null; price: number | null }) => {
          costPriceMap.set(item.product_id, { cost: item.cost, price: item.price })
        })
      }
    }

    const results = rawResults.map((product: { id: string; name: string; reference: string | null; cost: number | null; price: number | null }) => {
      let productCost = product.cost != null ? Number(product.cost) : 0
      let productPrice = product.price != null ? Number(product.price) : 0
      if (!isMainStore && currentStoreId) {
        const storeStockCostPrice = costPriceMap.get(product.id)
        if (storeStockCostPrice) {
          productCost = (storeStockCostPrice.cost !== null && storeStockCostPrice.cost !== 0)
            ? storeStockCostPrice.cost
            : (product.price != null ? Number(product.price) : 0)
          productPrice = storeStockCostPrice.price !== null ? storeStockCostPrice.price : 0
        } else {
          productCost = product.price != null ? Number(product.price) : 0
          productPrice = 0
        }
      }
      return {
        id: product.id,
        name: product.name,
        reference: product.reference,
        cost: productCost,
        price: productPrice
      }
    })
    return results
  }

  // Crear nuevo producto
  static async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Product | null> {
    try {
      const insertData = {
        id: uuidv4(),
        name: productData.name,
        description: productData.description || null, // Convertir string vacío a null
        category_id: productData.categoryId || null, // Convertir string vacío a null
        brand: productData.brand || null, // Convertir string vacío a null
        reference: productData.reference,
        price: productData.price,
        cost: productData.cost,
        stock_warehouse: productData.stock.warehouse,
        stock_store: productData.stock.store,
        status: productData.status,
        image_url: productData.imageUrl?.trim() || null,
      }

      const { data, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Error silencioso en producción
        return null
      }

      // Crear stock inicial en todas las micro tiendas activas (con cantidad 0)
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const allStores = await StoresService.getAllStores(false) // Solo tiendas activas
      const microStores = allStores.filter(store => store.id !== MAIN_STORE_ID)

      if (microStores.length > 0) {
        const storeStockInserts = microStores.map(store => ({
          store_id: store.id,
          product_id: data.id,
          quantity: 0, // Stock inicial en 0 para todas las micro tiendas
          location: 'local' // Todas las micro tiendas tienen stock en "local"
        }))

        const { error: storeStockError } = await supabaseAdmin
          .from('store_stock')
          .insert(storeStockInserts)

        if (storeStockError) {
          // console.error('Error creating initial stock for micro stores:', storeStockError)
          // No fallar la creación del producto si hay error al crear stock en tiendas
        }
      }

      // Registrar la actividad
      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'product_create',
          'products',
          {
            description: `Se creó el producto "${productData.name}" (Ref: ${productData.reference}) con stock en Bodega: ${productData.stock.warehouse}, Local: ${productData.stock.store}`,
            productName: productData.name,
            productReference: productData.reference,
            stockWarehouse: productData.stock.warehouse,
            stockStore: productData.stock.store,
            category: productData.categoryId,
            brand: productData.brand,
            price: productData.price,
            cost: productData.cost
          }
        )
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        categoryId: data.category_id,
        brand: data.brand,
        reference: data.reference,
        price: data.price,
        cost: data.cost,
        stock: {
          warehouse: data.stock_warehouse || 0,
          store: data.stock_store || 0,
          total: (data.stock_warehouse || 0) + (data.stock_store || 0)
        },
        status: data.status,
        imageUrl: data.image_url || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Actualizar producto
  static async updateProduct(id: string, updates: Partial<Product>, currentUserId?: string): Promise<boolean> {
    try {
      const currentStoreId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID

      const updateData: any = {}

      // Campos que siempre se actualizan en products (información general)
      if (updates.name) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description || null
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId || null
      if (updates.brand !== undefined) updateData.brand = updates.brand || null
      if (updates.reference) updateData.reference = updates.reference
      if (updates.status) updateData.status = updates.status
      if ('imageUrl' in updates) {
        updateData.image_url = updates.imageUrl?.trim() ? updates.imageUrl.trim() : null
      }

      // Cost y Price: en microtiendas se actualizan en store_stock, en tienda principal en products
      if (isMainStore) {
        // Tienda principal: actualizar en products
        if (updates.price !== undefined) updateData.price = updates.price
        if (updates.cost !== undefined) updateData.cost = updates.cost
        if (updates.stock) {
          updateData.stock_warehouse = updates.stock.warehouse
          updateData.stock_store = updates.stock.store
        }
      } else {
        // Microtienda: actualizar cost/price en store_stock, stock también en store_stock
        if (updates.price !== undefined || updates.cost !== undefined || updates.stock) {
          const storeStockUpdate: any = {}

          if (updates.price !== undefined) storeStockUpdate.price = updates.price
          if (updates.cost !== undefined) storeStockUpdate.cost = updates.cost

          // Para stock en microtiendas, actualizar quantity en store_stock
          if (updates.stock) {
            // En microtiendas, el stock total es solo "local" (quantity en store_stock)
            const totalStock = (updates.stock.store || 0) + (updates.stock.warehouse || 0)
            storeStockUpdate.quantity = totalStock
          }

          // Upsert en store_stock para la microtienda actual
          const { error: storeStockError } = await supabaseAdmin
            .from('store_stock')
            .upsert({
              store_id: currentStoreId,
              product_id: id,
              ...storeStockUpdate
            }, {
              onConflict: 'store_id,product_id'
            })

          if (storeStockError) {
            // console.error('[PRODUCTS SERVICE] Error updating store_stock:', storeStockError)
            return false
          }
        }
      }

      // Actualizar products solo si hay campos que actualizar (excluyendo cost/price/stock para microtiendas)
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('id', id)

        if (error) {
          // console.error('[PRODUCTS SERVICE] Error updating product:', error)
          return false
        }
      }

      // Registrar la actividad
      if (currentUserId) {
        // Obtener el producto actual para mostrar información más detallada
        const currentProduct = await this.getProductById(id)
        const productName = updates.name || currentProduct?.name || `ID: ${id}`

        await AuthService.logActivity(
          currentUserId,
          'product_update',
          'products',
          {
            description: `Se actualizó el producto "${productName}". Campos modificados: ${Object.keys(updates).join(', ')}`,
            productId: id,
            productName: productName,
            productReference: currentProduct?.reference,
            changes: Object.keys(updates),
            updatedFields: updates,
            previousValues: currentProduct ? {
              name: currentProduct.name,
              reference: currentProduct.reference,
              brand: currentProduct.brand,
              price: currentProduct.price,
              cost: currentProduct.cost,
              stock: currentProduct.stock
            } : null
          }
        )
      }

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Stock total del producto en todas las tiendas (principal + microtiendas)
  private static async getTotalStockAcrossAllStores(productId: string): Promise<number> {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_warehouse, stock_store')
      .eq('id', productId)
      .single()
    const mainStock = (product?.stock_warehouse || 0) + (product?.stock_store || 0)
    const { data: storeStocks } = await supabaseAdmin
      .from('store_stock')
      .select('quantity')
      .eq('product_id', productId)
    const microStock = (storeStocks || []).reduce((sum: number, row: { quantity: number }) => sum + (Number(row.quantity) || 0), 0)
    return mainStock + microStock
  }

  // Eliminar producto (solo desde Sincelejo; no se permite si tiene stock en cualquier tienda)
  static async deleteProduct(id: string, currentUserId?: string): Promise<{ success: boolean, error?: string }> {
    try {
      const productToDelete = await this.getProductById(id)
      if (!productToDelete) {
        return { success: false, error: 'Producto no encontrado' }
      }

      const totalStock = await this.getTotalStockAcrossAllStores(id)
      if (totalStock > 0) {
        return {
          success: false,
          error: `No se puede eliminar el producto "${productToDelete.name}" porque tiene ${totalStock} unidad(es) en stock en una o más tiendas. El stock debe estar en 0 en todas las tiendas para poder eliminarlo.`
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        // Error silencioso en producción
        return { success: false, error: 'Error al eliminar el producto' }
      }

      // Registrar la actividad
      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'product_delete',
          'products',
          {
            description: `Producto eliminado: ${productToDelete.name}`,
            productId: id,
            productName: productToDelete.name,
            productReference: productToDelete.reference,
            brand: productToDelete.brand,
            category: productToDelete.categoryId,
            price: productToDelete.price,
            cost: productToDelete.cost,
            stockStore: productToDelete.stock?.store || 0,
            stockWarehouse: productToDelete.stock?.warehouse || 0
          }
        )
      }

      return { success: true }
    } catch (error) {
      // Error silencioso en producción
      return { success: false, error: 'Error inesperado al eliminar el producto' }
    }
  }

  // Buscar productos
  // storeId: opcional, si se pasa se usa ese, si no se intenta obtener del localStorage
  static async searchProducts(query: string, stockFilter?: StockFilter, storeId?: string | null): Promise<Product[]> {
    try {
      const cleanQuery = query.trim()

      if (!cleanQuery) {
        return []
      }

      // Búsqueda simplificada sin timeout - buscar en referencia y nombre
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category_id, brand, reference, price, cost, stock_warehouse, stock_store, status, image_url, created_at, updated_at')
        .or(`reference.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        // Error silencioso en producción
        return []
      }

      // Obtener stock correcto según el tipo de tienda
      // Usar storeId pasado como parámetro, o intentar obtener del localStorage
      const currentStoreId = storeId !== undefined ? storeId : getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !currentStoreId || currentStoreId === MAIN_STORE_ID

      // console.log('[PRODUCTS SERVICE] searchProducts - storeId param:', storeId, 'currentStoreId:', currentStoreId, 'isMainStore:', isMainStore)
      const productIds = data.map((p: any) => p.id)
      const stockMap = await this.getProductsStockForStore(productIds, currentStoreId)

      // Para microtiendas, obtener cost/price de store_stock
      let costPriceMap = new Map<string, { cost: number | null, price: number | null }>()

      if (!isMainStore && currentStoreId) {
        const { data: storeStockData } = await supabaseAdmin
          .from('store_stock')
          .select('product_id, cost, price')
          .eq('store_id', currentStoreId)
          .in('product_id', productIds)

        if (storeStockData) {
          storeStockData.forEach((item: any) => {
            costPriceMap.set(item.product_id, {
              cost: item.cost,
              price: item.price
            })
          })
        }
      }

      const mappedProducts = data.map((product: any) => {
        const stock = stockMap.get(product.id) || { warehouse: 0, store: 0, total: 0 }

        // Para microtiendas, usar cost/price de store_stock si existe
        let productCost = product.cost
        let productPrice = product.price

        if (!isMainStore) {
          const storeStockCostPrice = costPriceMap.get(product.id)

          if (storeStockCostPrice) {
            // Si hay registro en store_stock con cost/price, usar esos valores
            // Si cost es null o 0, usar el price de Sincelejo como cost por defecto
            productCost = (storeStockCostPrice.cost !== null && storeStockCostPrice.cost !== 0)
              ? storeStockCostPrice.cost
              : product.price // Precio de venta de Sincelejo como cost por defecto
            productPrice = storeStockCostPrice.price !== null ? storeStockCostPrice.price : 0
          } else {
            // Sin registro: usar price de Sincelejo como cost por defecto
            productCost = product.price
            productPrice = 0
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.category_id,
          brand: product.brand,
          reference: product.reference,
          price: productPrice,
          cost: productCost,
          stock: stock,
          status: product.status,
          imageUrl: product.image_url || undefined,
          createdAt: product.created_at,
          updatedAt: product.updated_at || product.created_at
        }
      })

      // Aplicar filtro de stock si se especificó
      const filteredProducts = this.applyStockFilterToProducts(mappedProducts, stockFilter)

      // Ordenar: productos con stock primero, luego por fecha más reciente
      return filteredProducts.sort((a, b) => {
        const aHasStock = a.stock.total > 0
        const bHasStock = b.stock.total > 0

        if (aHasStock && !bHasStock) return -1
        if (!aHasStock && bHasStock) return 1

        const aDate = a.updatedAt || a.createdAt
        const bDate = b.updatedAt || b.createdAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Transferir stock entre ubicaciones
  static async transferStock(productId: string, from: 'warehouse' | 'store', to: 'warehouse' | 'store', quantity: number, currentUserId?: string): Promise<boolean> {
    try {
      const product = await this.getProductById(productId)
      if (!product) return false

      const fromField = from === 'warehouse' ? 'stock_warehouse' : 'stock_store'
      const toField = to === 'warehouse' ? 'stock_warehouse' : 'stock_store'

      const currentFromStock = from === 'warehouse' ? product.stock.warehouse : product.stock.store
      const currentToStock = to === 'warehouse' ? product.stock.warehouse : product.stock.store

      if (currentFromStock < quantity) {
        // Error silencioso en producción
        return false
      }

      const expectedWarehouse =
        product.stock.warehouse +
        (from === 'warehouse' ? -quantity : 0) +
        (to === 'warehouse' ? quantity : 0)
      const expectedStore =
        product.stock.store +
        (from === 'store' ? -quantity : 0) +
        (to === 'store' ? quantity : 0)

      const { data: updatedRows, error } = await supabase
        .from('products')
        .update({
          [fromField]: currentFromStock - quantity,
          [toField]: currentToStock + quantity
        })
        .eq('id', productId)
        .select('stock_store, stock_warehouse')

      if (error || !updatedRows?.length) {
        return false
      }

      const row = updatedRows[0] as { stock_store: number | string; stock_warehouse: number | string }
      const wh = Number(row.stock_warehouse)
      const st = Number(row.stock_store)
      if (wh !== expectedWarehouse || st !== expectedStore) {
        return false
      }

      // Registrar la actividad
      if (currentUserId) {
        const fromLocation = from === 'warehouse' ? 'Bodega' : 'Local'
        const toLocation = to === 'warehouse' ? 'Bodega' : 'Local'

        await AuthService.logActivity(
          currentUserId,
          'stock_transfer',
          'products',
          {
            description: `Se transfirieron ${quantity} unidades del producto "${product.name}" de ${fromLocation} a ${toLocation}`,
            productId: productId,
            productName: product.name,
            productReference: product.reference,
            fromLocation: from,
            toLocation: to,
            quantity: quantity,
            fromLocationLabel: fromLocation,
            toLocationLabel: toLocation,
            previousStock: {
              warehouse: product.stock.warehouse,
              store: product.stock.store
            },
            newStock: {
              warehouse: wh,
              store: st
            }
          }
        )
      }

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Descontar stock para venta (primero del local, luego de bodega)
  // En microtienda descuenta de store_stock; en tienda principal de products.
  static async deductStockForSale(productId: string, quantity: number, currentUserId?: string): Promise<{ success: boolean, stockInfo?: { storeDeduction: number, warehouseDeduction: number, previousStoreStock: number, previousWarehouseStock: number, newStoreStock: number, newWarehouseStock: number } }> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const storeId = getCurrentUserStoreId()
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      const product = await this.getProductById(productId)
      if (!product) return { success: false }

      const { warehouse, store } = product.stock
      const totalAvailable = warehouse + store

      if (totalAvailable < quantity) {
        return { success: false }
      }

      let remainingToDeduct = quantity
      let warehouseDeduction = 0
      let storeDeduction = 0

      // Primero descontar del local (store)
      if (store > 0 && remainingToDeduct > 0) {
        storeDeduction = Math.min(store, remainingToDeduct)
        remainingToDeduct -= storeDeduction
      }

      // Si aún falta, descontar de bodega (solo en tienda principal)
      if (remainingToDeduct > 0) {
        warehouseDeduction = Math.min(warehouse, remainingToDeduct)
        remainingToDeduct -= warehouseDeduction
      }

      if (isMainStore) {
        // Tienda principal: actualizar tabla products
        const { error } = await supabase
          .from('products')
          .update({
            stock_warehouse: warehouse - warehouseDeduction,
            stock_store: store - storeDeduction
          })
          .eq('id', productId)

        if (error) return { success: false }
      } else {
        // Microtienda: actualizar tabla store_stock (descontar del stock de esta tienda)
        const newStoreQuantity = store - storeDeduction
        const { error } = await supabaseAdmin
          .from('store_stock')
          .upsert({
            store_id: storeId!,
            product_id: productId,
            quantity: newStoreQuantity,
            location: 'local'
          }, {
            onConflict: 'store_id,product_id'
          })

        if (error) return { success: false }
      }

      return {
        success: true,
        stockInfo: {
          storeDeduction,
          warehouseDeduction,
          previousStoreStock: store,
          previousWarehouseStock: warehouse,
          newStoreStock: store - storeDeduction,
          newWarehouseStock: warehouse - warehouseDeduction
        }
      }
    } catch (error) {
      return { success: false }
    }
  }

  /**
   * Descontar stock para varios ítems de una venta en batch.
   * Una sola lectura de stock para todos los productos, luego actualizaciones (en paralelo cuando es seguro).
   * Reduce drásticamente el tiempo al crear una venta con muchos ítems.
   */
  static async deductStockForSaleBatch(
    items: Array<{ productId: string; quantity: number; productName: string; productReferenceCode?: string; unitPrice: number; totalPrice: number }>,
    currentUserId?: string
  ): Promise<{
    success: boolean
    itemsWithStockInfo?: Array<{ productName: string; productReference?: string; quantity: number; unitPrice: number; totalPrice: number; stockInfo: { storeDeduction: number; warehouseDeduction: number; previousStoreStock: number; previousWarehouseStock: number; newStoreStock: number; newWarehouseStock: number } }>
    failedProductName?: string
  }> {
    if (items.length === 0) {
      return { success: true, itemsWithStockInfo: [] }
    }
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const storeId = getCurrentUserStoreId()
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      // Agregar cantidades por producto (mismo producto puede estar en varias líneas)
      const byProduct = new Map<string, { totalQty: number; productName: string }>()
      for (const item of items) {
        const existing = byProduct.get(item.productId)
        if (existing) {
          existing.totalQty += item.quantity
        } else {
          byProduct.set(item.productId, { totalQty: item.quantity, productName: item.productName })
        }
      }
      const productIds = Array.from(byProduct.keys())

      // Una sola lectura de stock para todos los productos
      const stockMap = await this.getProductsStockForStore(productIds, storeId)

      const deductions = new Map<string, { storeDeduction: number; warehouseDeduction: number; previousStoreStock: number; previousWarehouseStock: number; newStoreStock: number; newWarehouseStock: number }>()
      for (const [productId, { totalQty, productName }] of byProduct) {
        const stock = stockMap.get(productId) || { warehouse: 0, store: 0, total: 0 }
        const { warehouse, store } = stock
        if (warehouse + store < totalQty) {
          return { success: false, failedProductName: productName }
        }
        let remaining = totalQty
        let storeDeduction = 0
        let warehouseDeduction = 0
        if (store > 0 && remaining > 0) {
          storeDeduction = Math.min(store, remaining)
          remaining -= storeDeduction
        }
        if (remaining > 0) {
          warehouseDeduction = Math.min(warehouse, remaining)
        }
        deductions.set(productId, {
          storeDeduction,
          warehouseDeduction,
          previousStoreStock: store,
          previousWarehouseStock: warehouse,
          newStoreStock: store - storeDeduction,
          newWarehouseStock: warehouse - warehouseDeduction
        })
      }

      // Aplicar actualizaciones en paralelo (todas son por producto distinto)
      const updatePromises = productIds.map(async (productId) => {
        const d = deductions.get(productId)!
        if (isMainStore) {
          const { error } = await supabase
            .from('products')
            .update({
              stock_warehouse: d.newWarehouseStock,
              stock_store: d.newStoreStock
            })
            .eq('id', productId)
          if (error) throw error
        } else {
          const { error } = await supabaseAdmin
            .from('store_stock')
            .upsert({
              store_id: storeId!,
              product_id: productId,
              quantity: d.newStoreStock,
              location: 'local'
            }, { onConflict: 'store_id,product_id' })
          if (error) throw error
        }
      })
      await Promise.all(updatePromises)

      const itemsWithStockInfo = items.map((item) => {
        const d = deductions.get(item.productId)!
        return {
          productName: item.productName,
          productReference: item.productReferenceCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          stockInfo: d
        }
      })
      return { success: true, itemsWithStockInfo }
    } catch (error) {
      return { success: false, failedProductName: items[0]?.productName }
    }
  }

  // Devolver stock de una venta cancelada.
  // En microtienda devuelve a store_stock; en tienda principal a products.
  static async returnStockFromSale(productId: string, quantity: number, currentUserId?: string, storeIdOverride?: string | null): Promise<boolean> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const storeId = storeIdOverride !== undefined ? storeIdOverride : getCurrentUserStoreId()
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      const product = await this.getProductById(productId)
      if (!product) return false

      const previousStoreStock = product.stock.store || 0
      const newStockStore = previousStoreStock + quantity

      if (isMainStore) {
        const { error } = await supabase
          .from('products')
          .update({ stock_store: newStockStore })
          .eq('id', productId)

        if (error) return false
      } else {
        const { error } = await supabaseAdmin
          .from('store_stock')
          .upsert({
            store_id: storeId!,
            product_id: productId,
            quantity: newStockStore,
            location: 'local'
          }, {
            onConflict: 'store_id,product_id'
          })

        if (error) return false
      }

      if (currentUserId) {
        try {
          await AuthService.logActivity(
            currentUserId,
            'sale_cancellation_stock_return',
            'products',
            {
              description: `Cancelación de venta: Se devolvieron ${quantity} unidades del producto "${product.name}" al local`,
              productId,
              productName: product.name,
              productReference: product.reference,
              quantityReturned: quantity,
              previousStoreStock,
              newStoreStock: newStockStore,
              location: 'store',
              reason: 'Venta cancelada'
            }
          )
        } catch {
          // ignorar error de log
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  // 🚀 Devolver stock de múltiples productos en lote.
  // storeIdOverride: si se pasa (ej. venta cancelada), se devuelve a esa tienda; si no, se usa la tienda actual.
  static async returnStockFromSaleBatch(
    items: Array<{ productId: string, quantity: number, productName?: string }>,
    currentUserId?: string,
    storeIdOverride?: string | null
  ): Promise<{ success: boolean, results: Array<{ productId: string, success: boolean, productName?: string, productReference?: string, quantity?: number, previousStock?: number, newStock?: number, error?: any }> }> {
    try {
      if (!items || items.length === 0) {
        return { success: true, results: [] }
      }

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const storeId = storeIdOverride !== undefined ? storeIdOverride : getCurrentUserStoreId()
      const isMainStore = !storeId || storeId === MAIN_STORE_ID
      const productIds = items.map(item => item.productId)

      if (isMainStore) {
        // Tienda principal: actualizar products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, reference, stock_store')
          .in('id', productIds)

        if (productsError) throw productsError

        const updates = items.map(item => {
          const product = products?.find(p => p.id === item.productId)
          if (!product) return null
          const currentStock = product.stock_store || 0
          return {
            id: item.productId,
            stock_store: currentStock + item.quantity,
            productName: product.name,
            productReference: product.reference,
            quantity: item.quantity,
            previousStock: currentStock
          }
        }).filter(Boolean) as Array<{ id: string, stock_store: number, productName: string, productReference: string | null, quantity: number, previousStock: number }>

        if (updates.length === 0) {
          return { success: false, results: items.map(item => ({ productId: item.productId, success: false, error: 'Producto no encontrado' })) }
        }

        const updatePromises = updates.map(async (update) => {
          try {
            const { error } = await supabase
              .from('products')
              .update({ stock_store: update.stock_store })
              .eq('id', update.id)
            if (error) return { productId: update.id, success: false, error }
            return {
              productId: update.id,
              success: true,
              productName: update.productName,
              productReference: update.productReference,
              quantity: update.quantity,
              previousStock: update.previousStock,
              newStock: update.stock_store
            }
          } catch (error) {
            return { productId: update.id, success: false, error }
          }
        })

        const results = await Promise.all(updatePromises)
        return { success: results.every(r => r.success), results }
      }

      // Microtienda: actualizar store_stock por cada producto
      const { data: storeStocks } = await supabaseAdmin
        .from('store_stock')
        .select('product_id, quantity')
        .eq('store_id', storeId!)
        .in('product_id', productIds)

      const { data: products } = await supabase
        .from('products')
        .select('id, name, reference')
        .in('id', productIds)

      const stockByProduct = new Map((storeStocks || []).map(s => [s.product_id, Number(s.quantity) || 0]))
      const results = await Promise.all(
        items.map(async (item) => {
          const previousStock = stockByProduct.get(item.productId) ?? 0
          const newQuantity = previousStock + item.quantity
          const product = products?.find(p => p.id === item.productId)
          try {
            const { error } = await supabaseAdmin
              .from('store_stock')
              .upsert({
                store_id: storeId!,
                product_id: item.productId,
                quantity: newQuantity,
                location: 'local'
              }, { onConflict: 'store_id,product_id' })
            if (error) return { productId: item.productId, success: false, error }
            stockByProduct.set(item.productId, newQuantity)
            return {
              productId: item.productId,
              success: true,
              productName: product?.name,
              productReference: product?.reference ?? undefined,
              quantity: item.quantity,
              previousStock,
              newStock: newQuantity
            }
          } catch (error) {
            return { productId: item.productId, success: false, error }
          }
        })
      )
      return { success: results.every(r => r.success), results }
    } catch (error) {
      return { success: false, results: items.map(item => ({ productId: item.productId, success: false, error })) }
    }
  }

  // Ajustar stock
  static async adjustStock(productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string, currentUserId?: string): Promise<boolean> {
    try {
      const product = await this.getProductById(productId)
      if (!product) return false

      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      let currentQuantity: number
      let difference: number

      if (isMainStore) {
        // Tienda principal: actualizar en tabla products
        const field = location === 'warehouse' ? 'stock_warehouse' : 'stock_store'
        currentQuantity = location === 'warehouse' ? product.stock.warehouse : product.stock.store
        difference = newQuantity - currentQuantity

        const { data: updatedRows, error } = await supabase
          .from('products')
          .update({
            [field]: newQuantity
          })
          .eq('id', productId)
          .select('stock_store, stock_warehouse')

        if (error || !updatedRows?.length) {
          return false
        }

        const row = updatedRows[0] as { stock_store: number | string; stock_warehouse: number | string }
        const written =
          field === 'stock_warehouse'
            ? Number(row.stock_warehouse)
            : Number(row.stock_store)
        if (written !== newQuantity) {
          return false
        }
      } else {
        // Microtienda: actualizar en tabla store_stock
        // En microtiendas solo hay stock "local" (store), no warehouse
        if (location === 'warehouse') {
          // console.error('[PRODUCTS SERVICE] Cannot adjust warehouse stock in micro store')
          return false
        }

        /* DEBUG: descomentar en local para probar
        // console.log('[PRODUCTS SERVICE] Adjusting stock for micro store:', {
          storeId,
          productId,
          newQuantity,
          location
        })
        */

        // Obtener stock actual de la microtienda
        const { data: storeStock, error: fetchError } = await supabaseAdmin
          .from('store_stock')
          .select('quantity')
          .eq('store_id', storeId)
          .eq('product_id', productId)
          .maybeSingle()

        if (fetchError) {
          // console.error('[PRODUCTS SERVICE] Error fetching stock for micro store:', fetchError)
          return false
        }

        currentQuantity = storeStock?.quantity || 0
        difference = newQuantity - currentQuantity

        /* DEBUG: descomentar en local para probar
        // console.log('[PRODUCTS SERVICE] Stock calculation for micro store:', {
          currentQuantity,
          newQuantity,
          difference
        })
        */

        // Upsert en store_stock
        const { data: updatedStock, error: updateError } = await supabaseAdmin
          .from('store_stock')
          .upsert({
            store_id: storeId,
            product_id: productId,
            quantity: newQuantity,
            location: 'local'
          }, {
            onConflict: 'store_id,product_id'
          })
          .select()

        if (updateError || !updatedStock?.length) {
          return false
        }

        const writtenQty = Number((updatedStock[0] as { quantity: number | string }).quantity)
        if (writtenQty !== newQuantity) {
          return false
        }
      }

      // Registrar la actividad
      if (currentUserId) {
        const locationLabel = location === 'warehouse' ? 'Bodega' : 'Local'
        const actionType = difference > 0 ? 'incremento' : 'reducción'

        await AuthService.logActivity(
          currentUserId,
          'stock_adjustment',
          'products',
          {
            description: `Se ajustó el stock del producto "${product.name}" en ${locationLabel}. ${actionType} de ${Math.abs(difference)} unidades. Razón: ${reason}`,
            productId: productId,
            productName: product.name,
            productReference: product.reference,
            location: location,
            locationLabel: locationLabel,
            previousQuantity: currentQuantity,
            newQuantity: newQuantity,
            difference: difference,
            reason: reason,
            actionType: actionType,
            storeId: storeId || MAIN_STORE_ID
          }
        )
      }

      return true
    } catch (error) {
      // console.error('[PRODUCTS SERVICE] Exception in adjustStock:', error)
      return false
    }
  }

  // Actualizar stock (método simplificado para garantías)
  static async updateProductStock(productId: string, stockUpdate: { local: number; warehouse: number }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          stock_store: stockUpdate.local,
          stock_warehouse: stockUpdate.warehouse
        })
        .eq('id', productId)

      if (error) {
        // Error silencioso en producción
        return false
      }

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  // Importar productos masivamente desde CSV
  static async importProductsFromCSV(products: any[]): Promise<boolean> {
    try {
      const user = await AuthService.getCurrentUser()
      if (!user) {
        // Error silencioso en producción
        return false
      }

      // Verificar que no existan referencias duplicadas
      const references = products.map(p => p.reference)
      const { data: existingProducts, error: checkError } = await supabase
        .from('products')
        .select('reference')
        .in('reference', references)

      if (checkError) {
        // Error silencioso en producción
        return false
      }

      const existingReferences = existingProducts?.map(p => p.reference) || []
      const duplicateReferences = references.filter(ref => existingReferences.includes(ref))

      if (duplicateReferences.length > 0) {
        // Error silencioso en producción
        return false
      }

      // Preparar datos para inserción
      const productsToInsert = products.map(product => ({
        id: uuidv4(),
        name: product.name,
        reference: product.reference,
        description: product.name, // Usar el nombre como descripción
        price: product.price,
        cost: product.cost,
        stock_warehouse: product.stock,
        stock_store: 0, // Todo el stock va a bodega
        category_id: null, // Sin categoría por defecto
        brand: product.brand,
        status: 'active',
        created_at: new Date().toISOString()
        // Removido updated_at ya que no existe en la tabla
      }))

      // Insertar productos en lotes de 100
      const batchSize = 100
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize)

        const { error: insertError } = await supabase
          .from('products')
          .insert(batch)

        if (insertError) {
          // Error silencioso en producción
          return false
        }
      }

      // Registrar actividad
      await AuthService.logActivity(
        'products_import',
        `Importación masiva de ${products.length} productos desde CSV`,
        {
          imported_count: products.length,
          references: references.slice(0, 10) // Solo las primeras 10 referencias
        }
      )

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  /**
   * Obtiene métricas básicas de inventario optimizadas con soporte para grandes volúmenes.
   * - Tienda principal (Sincelejo): suma stock de products (stock_warehouse + stock_store).
   * - Microtiendas: suma solo el stock de esa tienda desde store_stock (quantity * cost).
   */
  static async getInventoryMetrics(): Promise<{
    totalStockUnits: number,
    totalStockInvestment: number,
    lowStockCount: number
  }> {
    try {
      const { supabase } = await import('@/lib/supabase')
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = !storeId || storeId === MAIN_STORE_ID

      let totalStockUnits = 0
      let totalStockInvestment = 0
      let lowStockCount = 0

      if (isMainStore) {
        // Tienda principal: sumar stock desde products (bodega + local)
        let hasMore = true
        let offset = 0
        const limit = 1000
        while (hasMore) {
          const { data: products, error } = await supabase
            .from('products')
            .select('cost, stock_warehouse, stock_store')
            .neq('status', 'discontinued')
            .range(offset, offset + limit - 1)

          if (error) {
            console.error('Error fetching inventory metrics batch:', error)
            throw error
          }
          if (!products || products.length === 0) {
            hasMore = false
            break
          }
          products.forEach(p => {
            const stock = (p.stock_store || 0) + (p.stock_warehouse || 0)
            totalStockUnits += stock
            totalStockInvestment += (p.cost || 0) * stock
            if (stock > 0 && stock <= 5) lowStockCount++
          })
          if (products.length < limit) hasMore = false
          else offset += limit
        }
      } else {
        // Microtienda: sumar solo stock de esta tienda desde store_stock
        let hasMore = true
        let offset = 0
        const limit = 1000
        while (hasMore) {
          const { data: rows, error } = await supabase
            .from('store_stock')
            .select('quantity, cost, product_id, products(cost)')
            .eq('store_id', storeId)
            .range(offset, offset + limit - 1)

          if (error) {
            console.error('Error fetching store_stock metrics batch:', error)
            throw error
          }
          if (!rows || rows.length === 0) {
            hasMore = false
            break
          }
          rows.forEach((row: { quantity: number; cost?: number | null; products?: { cost: number } | null }) => {
            const qty = row.quantity || 0
            const cost = row.cost != null && row.cost > 0
              ? Number(row.cost)
              : (row.products?.cost != null ? Number(row.products.cost) : 0)
            totalStockUnits += qty
            totalStockInvestment += cost * qty
            if (qty > 0 && qty <= 5) lowStockCount++
          })
          if (rows.length < limit) hasMore = false
          else offset += limit
        }
      }

      return { totalStockUnits, totalStockInvestment, lowStockCount }
    } catch (error) {
      console.error('Unexpected error in getInventoryMetrics:', error)
      return { totalStockUnits: 0, totalStockInvestment: 0, lowStockCount: 0 }
    }
  }
}
