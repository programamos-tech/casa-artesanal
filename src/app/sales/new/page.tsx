'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Plus, 
  Minus, 
  Search,
  FileText,
  User,
  Users,
  Package,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ShoppingCart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Sale, SaleItem, Product, Client, SalePayment, User as AppUser } from '@/types'
import { useClients } from '@/contexts/clients-context'
import { useProducts } from '@/contexts/products-context'
import { useSales } from '@/contexts/sales-context'
import { useAuth } from '@/contexts/auth-context'
import { StoreBadge } from '@/components/ui/store-badge'
import { cardShell } from '@/lib/card-shell'

// Constante para identificar la tienda principal
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
// Margen mínimo de ganancia para microtiendas (10%)
const MIN_PROFIT_MARGIN = 0.10

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20'

const sectionIconClass = 'h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400'

export default function NewSalePage() {
  const router = useRouter()
  const { clients, getAllClients } = useClients()
  const { products, refreshProducts, searchProducts } = useProducts()
  const { createSale } = useSales()
  const { user, getAllUsers } = useAuth()
  
  // Detectar si es tienda principal o microtienda
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card' | 'warranty' | 'mixed' | ''
  >('')
  const [clientSearch, setClientSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [includeTax, setIncludeTax] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('Pendiente')
  const [stockAlert, setStockAlert] = useState<{show: boolean, message: string, productId?: string}>({show: false, message: ''})
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<number>(-1)
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const productRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastSearchTermRef = useRef<string>('')
  // Cache de productos agregados a la venta para mantener su información de stock
  const [productsInSaleCache, setProductsInSaleCache] = useState<Map<string, Product>>(new Map())
  
  const [mixedPayments, setMixedPayments] = useState<SalePayment[]>([])
  const [showMixedPayments, setShowMixedPayments] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [receivedAmount, setReceivedAmount] = useState<string>('')

  // Vendedor asignado (lo elige el cajero al crear la factura)
  const [sellers, setSellers] = useState<AppUser[]>([])
  const [sellersLoading, setSellersLoading] = useState(true)
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')

  useEffect(() => {
    getAllClients()
    refreshProducts()
  }, [getAllClients, refreshProducts])

  // Cargar vendedores activos disponibles para asignar a la venta.
  // Filtramos por:
  //  - rol vendedor / vendedora
  //  - usuario activo
  //  - misma tienda que el cajero (principal o microtienda)
  useEffect(() => {
    let cancelled = false
    const loadSellers = async () => {
      try {
        setSellersLoading(true)
        const all = await getAllUsers()
        const myStore = user?.storeId || MAIN_STORE_ID
        const filtered = all
          .filter((u) => {
            const role = (u.role || '').toString().toLowerCase()
            if (role !== 'vendedor' && role !== 'vendedora') return false
            if (!u.isActive) return false
            const theirStore = u.storeId || MAIN_STORE_ID
            return theirStore === myStore
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        if (cancelled) return
        setSellers(filtered)
        // Si solo hay un vendedor disponible, preseleccionarlo (no hay decisión que tomar).
        if (filtered.length === 1) {
          setSelectedSellerId(filtered[0].id)
        }
      } catch {
        // silencioso
      } finally {
        if (!cancelled) setSellersLoading(false)
      }
    }
    loadSellers()
    return () => {
      cancelled = true
    }
  }, [getAllUsers, user?.id, user?.storeId])

  useEffect(() => {
    if (paymentMethod === 'mixed') {
      setShowMixedPayments(true)
      setMixedPayments((prev) => {
        if (prev.length >= 2 && prev[0]?.paymentType === 'cash') return prev
        return [
          { id: '', saleId: '', paymentType: 'cash', amount: 0, reference: '', notes: '', createdAt: '', updatedAt: '' },
          { id: '', saleId: '', paymentType: 'nequi', amount: 0, reference: '', notes: '', createdAt: '', updatedAt: '' },
        ]
      })
    } else {
      setShowMixedPayments(false)
      setMixedPayments([])
    }
  }, [paymentMethod])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Buscar productos cuando el usuario escriba - CON PROTECCIÓN CONTRA LOOPS
  useEffect(() => {
    let cancelled = false
    const searchTerm = debouncedProductSearch.trim()
    
    // Si no hay término de búsqueda, limpiar y salir
    if (searchTerm.length < 2) {
      lastSearchTermRef.current = ''
      setSearchedProducts([])
      setIsSearchingProducts(false)
      return
    }
    
    // Evitar búsquedas duplicadas del mismo término
    if (searchTerm === lastSearchTermRef.current) {
      return
    }
    
    // Marcar el término actual ANTES de buscar
    lastSearchTermRef.current = searchTerm
    
    const performSearch = async () => {
      // Doble verificación antes de buscar
      if (cancelled || lastSearchTermRef.current !== searchTerm) {
        return
      }
      
      setIsSearchingProducts(true)
      try {
        const results = await searchProducts(searchTerm)
        // Verificar que el término no haya cambiado antes de actualizar
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setSearchedProducts(results)
          setIsSearchingProducts(false)
        }
      } catch (error) {
        // Error silencioso
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setSearchedProducts([])
          setIsSearchingProducts(false)
        }
      } finally {
        // Solo actualizar si el término no ha cambiado
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setIsSearchingProducts(false)
        }
      }
    }

    performSearch()
    
    return () => {
      cancelled = true
    }
    // SOLO depender de debouncedProductSearch, NO de searchProducts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProductSearch])

  // Scroll automático al elemento resaltado
  useEffect(() => {
    if (highlightedProductIndex >= 0 && productRefs.current[highlightedProductIndex]) {
      productRefs.current[highlightedProductIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [highlightedProductIndex])

  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas (ZonaT, Zonat, Corozal, Sahagun, etc.)
    const storeKeywords = ['casa artesanal', 'casaartesanal', 'corozal', 'sahagun', 'sincelejo', 'store', 'tienda', 'microtienda', 'micro tienda', 'sucursal']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  // Filtrar clientes (excluir clientes de tiendas)
  const filteredClients = useMemo(() => {
    // Primero filtrar clientes de tiendas
    const nonStoreClients = clients.filter(client => !isStoreClient(client))
    
    if (!clientSearch.trim()) {
      // Si no hay búsqueda, mostrar todos los clientes (limitado)
      return nonStoreClients.slice(0, 10)
    }
    const searchLower = clientSearch.toLowerCase().trim()
    return nonStoreClients.filter(client =>
      client && (
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.toLowerCase().includes(searchLower))
      )
    )
  }, [clients, clientSearch])

  // Filtrar productos - SIMPLIFICADO como en credit-modal
  const filteredProducts = useMemo(() => {
    const searchTerm = debouncedProductSearch.trim()
    
    // Si no hay búsqueda, mostrar productos con stock
    if (!searchTerm) {
      return products
        .filter(p => (p.stock.store || 0) > 0 || (p.stock.warehouse || 0) > 0)
        .slice(0, 20)
    }
    
    // Si hay búsqueda y hay resultados del servidor, usar esos (TODOS los productos)
    if (searchTerm.length >= 2 && searchedProducts.length > 0) {
      return searchedProducts.sort((a, b) => {
        const searchTermLower = searchTerm.toLowerCase()
        const aRef = (a.reference || '').toLowerCase()
        const bRef = (b.reference || '').toLowerCase()
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()
        
        // Referencia exacta primero
        if (aRef === searchTermLower && bRef !== searchTermLower) return -1
        if (aRef !== searchTermLower && bRef === searchTermLower) return 1
        
        // Referencia que empieza con el término
        if (aRef.startsWith(searchTermLower) && !bRef.startsWith(searchTermLower)) return -1
        if (!aRef.startsWith(searchTermLower) && bRef.startsWith(searchTermLower)) return 1
        
        // Nombre que empieza con el término
        if (aName.startsWith(searchTermLower) && !bName.startsWith(searchTermLower)) return -1
        if (!aName.startsWith(searchTermLower) && bName.startsWith(searchTermLower)) return 1
        
        return 0
      })
    }
    
    // Si la API no devolvió nada (término >= 2), seguir con el filtro local — no vaciar la lista

    // Filtro local (también respaldo si el servidor no encuentra coincidencias)
    return products.filter(product => {
      if (!product || product.status !== 'active') return false
      const searchTermLower = searchTerm.toLowerCase()
      const name = (product.name || '').toLowerCase()
      const reference = (product.reference || '').toLowerCase()
      const brand = (product.brand || '').toLowerCase()
      return name.includes(searchTermLower) || reference.includes(searchTermLower) || brand.includes(searchTermLower)
    }).sort((a, b) => {
      const searchTermLower = searchTerm.toLowerCase()
      const aRef = (a.reference || '').toLowerCase()
      const bRef = (b.reference || '').toLowerCase()
      const aName = (a.name || '').toLowerCase()
      const bName = (b.name || '').toLowerCase()
      
      // Referencia exacta primero
      if (aRef === searchTermLower && bRef !== searchTermLower) return -1
      if (aRef !== searchTermLower && bRef === searchTermLower) return 1
      
      // Referencia que empieza con el término
      if (aRef.startsWith(searchTermLower) && !bRef.startsWith(searchTermLower)) return -1
      if (!aRef.startsWith(searchTermLower) && bRef.startsWith(searchTermLower)) return 1
      
      // Nombre que empieza con el término
      if (aName.startsWith(searchTermLower) && !bName.startsWith(searchTermLower)) return -1
      if (!aName.startsWith(searchTermLower) && bName.startsWith(searchTermLower)) return 1
      
      return 0
    })
  }, [products, debouncedProductSearch, searchedProducts, isSearchingProducts])

  const visibleProducts = useMemo(() => filteredProducts.slice(0, 15), [filteredProducts])

  // Limpiar referencias cuando cambian los productos visibles
  useEffect(() => {
    productRefs.current = []
  }, [visibleProducts])

  useEffect(() => {
    if (showProductDropdown && visibleProducts.length > 0) {
      const firstAvailableIndex = visibleProducts.findIndex(product => {
        const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
        return totalStock > 0
      })
      setHighlightedProductIndex(firstAvailableIndex !== -1 ? firstAvailableIndex : 0)
    } else {
      setHighlightedProductIndex(-1)
    }
  }, [showProductDropdown, visibleProducts])

  const getStockStatus = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return 'Sin Stock'
    const store = product.stock.store || 0
    const warehouse = product.stock.warehouse || 0
    const total = store + warehouse
    
    if (total === 0) return 'Sin Stock'
    if (store > 0) return 'Disponible Local'
    if (warehouse > 0 && store === 0) return 'Solo Bodega'
    if (total < 10) return 'Stock Bajo'
    return 'Disponible'
  }

  const getClientTypeColor = (type: string) => {
    if (type === 'mayorista') return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
    if (type === 'minorista') return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600'
    return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-neutral-950/30 dark:text-gray-300 dark:border-neutral-600'
  }

  const handleAddProduct = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id)
    if (existingItem) {
      handleUpdateQuantity(existingItem.id, existingItem.quantity + 1)
      return
    }

    const availableStock = (product.stock.store || 0) + (product.stock.warehouse || 0)
    if (availableStock === 0) {
      setStockAlert({
        show: true, 
        message: 'Este producto no tiene stock disponible', 
        productId: product.id 
      })
      return
    }

    // Guardar el producto en el cache para mantener su información de stock
    setProductsInSaleCache(prev => {
      const newCache = new Map(prev)
      newCache.set(product.id, product)
      return newCache
    })

    const newItem: SaleItem = {
      id: `temp-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productReferenceCode: product.reference || 'N/A',
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
      addedAt: Date.now()
    }

    setSelectedProducts([...selectedProducts, newItem])
    setProductSearch('')
    setShowProductDropdown(false)
    setHighlightedProductIndex(-1)
  }

  const handleRemoveProduct = (itemId: string) => {
    const item = selectedProducts.find(i => i.id === itemId)
    // Si el producto que se está quitando tiene una alerta activa, ocultarla
    if (item && stockAlert.show && stockAlert.productId === item.productId) {
      setStockAlert({ show: false, message: '', productId: undefined })
    }
    setSelectedProducts(selectedProducts.filter(item => item.id !== itemId))
    
    // Limpiar el cache solo si no hay más items de ese producto en la venta
    if (item) {
      const hasOtherItems = selectedProducts.some(i => i.id !== itemId && i.productId === item.productId)
      if (!hasOtherItems) {
        setProductsInSaleCache(prev => {
          const newCache = new Map(prev)
          newCache.delete(item.productId)
          return newCache
        })
      }
    }
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    // No eliminar el producto si la cantidad es 0, solo actualizar
    if (newQuantity < 0) {
      return
    }

    const item = selectedProducts.find(i => i.id === itemId)
    if (!item) return

    // Usar findProductById que busca en contexto y cache
    const product = findProductById(item.productId)
    const availableStock = (product?.stock.store || 0) + (product?.stock.warehouse || 0)
    
    // Verificar stock solo si la cantidad es mayor a 0
    if (newQuantity > 0 && newQuantity > availableStock) {
      setStockAlert({
        show: true,
        message: `Stock disponible: ${availableStock} unidades`, 
        productId: item.productId 
      })
      return
    }

    setSelectedProducts(selectedProducts.map(i => {
      if (i.id === itemId) {
        const calculatedTotal = i.unitPrice * newQuantity
        return { ...i, quantity: newQuantity, total: calculatedTotal }
      }
      return i
    }))
  }

  const handleQuantityInputChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    handleUpdateQuantity(itemId, numValue)
  }

  const formatNumber = (value: number): string => {
    if (!value && value !== 0) return ''
    return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const parseNumber = (value: string): number => {
    // Remover puntos y espacios, luego parsear
    const cleaned = value.replace(/[^\d]/g, '')
    return cleaned === '' ? 0 : parseFloat(cleaned) || 0
  }

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return
    
    setSelectedProducts(selectedProducts.map(item => {
      if (item.id === itemId) {
        const calculatedTotal = newPrice * item.quantity
        return { ...item, unitPrice: newPrice, total: calculatedTotal }
      }
      return item
    }))
  }

  const handlePriceBlur = (itemId: string) => {
    // Validar precio al perder el foco y mostrar alerta si es inválido
    const item = selectedProducts.find(i => i.id === itemId)
    if (!item) return
    // Usar findProductById que busca en contexto y cache
    const product = findProductById(item.productId)
    if (!product) return
    
    // Precio mínimo: siempre el costo de adquisición (en Sincelejo y microtiendas)
    const minPrice = product.cost || 0
    const priceType = 'costo de adquisición'
    
    // Si el precio es menor al mínimo, mostrar alerta
    if (item.unitPrice < minPrice) {
      setStockAlert({
        show: true,
        message: `${item.productName} no puede ser vendido por menos de ${formatCurrency(minPrice)} (${priceType})`,
        productId: item.productId
      })
    } else {
      // Si el precio es válido, ocultar la alerta para este producto
      if (stockAlert.show && stockAlert.productId === item.productId) {
        setStockAlert({ show: false, message: '', productId: undefined })
      }
    }
  }

  const findProductById = (productId: string) => {
    // Primero buscar en el array de productos del contexto
    const productInContext = products.find(p => p.id === productId)
    if (productInContext) return productInContext
    
    // Si no está en el contexto, buscar en el cache de productos agregados a la venta
    const productInCache = productsInSaleCache.get(productId)
    if (productInCache) return productInCache
    
    return undefined
  }

  const getAvailableStock = (productId: string) => {
    const product = findProductById(productId)
    if (!product) return 0
    return (product.stock.store || 0) + (product.stock.warehouse || 0)
  }

  // Productos válidos para mostrar (incluye precio 0)
  const validProducts = useMemo(() => {
    // Filtrar productos válidos: cantidad > 0 (precio puede ser 0 para mostrarlos)
    const filtered = selectedProducts.filter(item => {
      // Validaciones básicas
      if (!item || !item.productId) {
        return false
      }
      if (item.quantity <= 0) {
        return false
      }
      // Permitir precio 0 para mostrarlos, pero no para calcular total
      return true
    })
    
    // Recalcular el total para todos los productos (precio 0 = total 0)
    return filtered.map(item => {
      const calculatedTotal = (item.unitPrice || 0) * (item.quantity || 0)
      return { 
        ...item, 
        total: calculatedTotal 
      }
    })
  }, [selectedProducts])

  // Productos válidos para calcular total (excluye precio 0)
  const validProductsForTotal = useMemo(() => {
    return validProducts.filter(item => {
      return item.unitPrice > 0
    })
  }, [validProducts])

  const orderedValidProducts = useMemo(() => {
    return [...validProducts].sort((a, b) => 
      new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime()
    )
  }, [validProducts])

  const orderedSelectedProducts = useMemo(() => {
    return [...selectedProducts].sort((a, b) => 
      new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime()
    )
  }, [selectedProducts])

  const subtotal = useMemo(() => {
    const calculated = validProductsForTotal.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0)
      return sum + itemTotal
    }, 0)
    return calculated
  }, [validProductsForTotal])

  const tax = useMemo(() => {
    return includeTax ? subtotal * 0.19 : 0
  }, [subtotal, includeTax])

  const total = useMemo(() => {
    return subtotal + tax
  }, [subtotal, tax])

  const getTotalMixedPayments = () => {
    return mixedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  }

  const updateMixedPayment = (index: number, field: keyof SalePayment, value: any) => {
    const updated = [...mixedPayments]
    updated[index] = { ...updated[index], [field]: value }
    setMixedPayments(updated)
    setPaymentError('')
  }

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      nequi: 'Nequi',
      bancolombia: 'Bancolombia',
      transfer: 'Transferencia (otro banco / sin canal)',
      card: 'Tarjeta',
      credit: 'Crédito',
      warranty: 'Garantía',
    }
    return labels[type] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const moveHighlightedProduct = (direction: 1 | -1) => {
    if (visibleProducts.length === 0) return

    let nextIndex = highlightedProductIndex
    for (let i = 0; i < visibleProducts.length; i++) {
      if (nextIndex === -1) {
        nextIndex = direction === 1 ? 0 : visibleProducts.length - 1
      } else {
        nextIndex = (nextIndex + direction + visibleProducts.length) % visibleProducts.length
      }

      const product = visibleProducts[nextIndex]
      const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
      if (totalStock > 0) {
        setHighlightedProductIndex(nextIndex)
        return
      }
    }

    setHighlightedProductIndex(nextIndex === -1 ? 0 : nextIndex)
  }

  const handleProductSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductDropdown || visibleProducts.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlightedProduct(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlightedProduct(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const product = highlightedProductIndex >= 0 ? visibleProducts[highlightedProductIndex] : null
      if (product) {
        const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
        if (totalStock > 0) {
          handleAddProduct(product)
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setShowProductDropdown(false)
      setHighlightedProductIndex(-1)
    }
  }

  const handleSave = async () => {
    if (!selectedClient || selectedProducts.length === 0 || validProducts.length === 0 || !paymentMethod) return

    // El vendedor es obligatorio: el cajero debe asignar a quién corresponde la venta.
    const seller = sellers.find((s) => s.id === selectedSellerId)
    if (!seller) {
      setStockAlert({
        show: true,
        message:
          sellers.length === 0
            ? 'No hay vendedores activos en esta tienda. Crea un usuario con rol "vendedor" en Roles antes de facturar.'
            : 'Debes asignar un vendedor a esta venta antes de guardarla.',
        productId: undefined,
      })
      return
    }

    // Verificar que todos los productos tengan precio > 0
    const productsWithoutPrice: string[] = []
    validProducts.forEach(item => {
      if (!item.unitPrice || item.unitPrice <= 0) {
        productsWithoutPrice.push(item.productName)
      }
    })

    if (productsWithoutPrice.length > 0) {
      setStockAlert({
        show: true,
        message: `Los siguientes productos no tienen precio asignado: ${productsWithoutPrice.join(', ')}. Por favor, asigna un precio a todos los productos antes de crear la venta.`,
        productId: undefined
      })
      return
    }

    // Verificar que los precios sean >= costo de adquisición (en Sincelejo y microtiendas)
    const invalidProducts: string[] = []
    validProducts.forEach(item => {
      const product = findProductById(item.productId)
      if (!product) return
      
      const minPrice = product.cost || 0
      const priceType = 'costo de adquisición'
      
      if (item.unitPrice < minPrice) {
        invalidProducts.push(`${item.productName} no puede ser vendido por menos de ${formatCurrency(minPrice)} (${priceType})`)
      }
    })

    if (invalidProducts.length > 0) {
      setStockAlert({
        show: true,
        message: invalidProducts.join(' • '),
        productId: undefined
      })
      return
    }

    if (paymentMethod === 'mixed') {
      const totalMixedPayments = getTotalMixedPayments()
      const roundedTotal = Math.round(total)
      const roundedPayments = Math.round(totalMixedPayments)
      
      if (roundedPayments !== roundedTotal) {
        const faltante = Math.abs(roundedTotal - roundedPayments)
        setPaymentError(`El total ingresado (${formatCurrency(roundedPayments)}) no coincide con el total de la venta (${formatCurrency(roundedTotal)}). Falta: ${formatCurrency(faltante)}`)
        return
      }
    }

    // Usar solo productos con precio > 0 para crear la venta
    const saleItems = validProductsForTotal.map(({ addedAt, ...item }) => item)

    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      total: total,
      subtotal: subtotal,
      tax: tax,
      discount: 0,
      discountType: 'amount',
      status: 'completed',
      paymentMethod,
      payments: paymentMethod === 'mixed' ? mixedPayments : undefined,
      items: saleItems,
      invoiceNumber: undefined,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerEmail: seller.email,
    }

    try {
      setIsCreating(true)
      setInvoiceNumber('Generando...')
      await createSale(saleData)
      setInvoiceNumber('Pendiente')
      setIsCreating(false)
      router.push('/sales')
    } catch (error) {
      console.error('Error creating sale:', error)
      setInvoiceNumber('Pendiente')
      setIsCreating(false)
      alert('Error al crear la venta. Por favor intenta de nuevo.')
    }
  }

  const handleRemoveClient = () => {
    setSelectedClient(null)
    setClientSearch('')
  }

  const saleBlockingAlert = stockAlert.show ? (
    <div
      role="alert"
      className="mb-3 rounded-lg border border-red-200/80 bg-red-50/90 p-3 dark:border-red-900/40 dark:bg-red-950/30"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0 text-sm font-medium leading-snug text-red-900 dark:text-red-200">
          {stockAlert.message}
        </div>
      </div>
    </div>
  ) : null

  return (
    <RoleProtectedRoute module="sales" requiredAction="create">
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-white to-violet-50/40 pb-28 dark:from-indigo-950/30 dark:via-zinc-950 dark:to-violet-950/20 xl:pb-8">
        <header className="sticky top-0 z-40 border-b border-indigo-100/70 bg-gradient-to-r from-white/95 via-indigo-50/40 to-violet-50/50 backdrop-blur-md dark:border-indigo-900/35 dark:from-zinc-950/95 dark:via-indigo-950/25 dark:to-zinc-950/95">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-4 md:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push('/sales')}
              className="-ml-2 shrink-0"
              aria-label="Volver a ventas"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </Button>
            <FileText className="h-6 w-6 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                  Nueva factura de venta
                </h1>
                <StoreBadge />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Agrega productos, elige cliente y método de pago.
              </p>
              {invoiceNumber !== 'Pendiente' && invoiceNumber !== 'Generando...' && (
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">{invoiceNumber}</p>
              )}
            </div>
          </div>
        </header>

        <div className="w-full min-w-0 px-4 py-6 md:px-6">
          {/* Una columna solo en móvil; desde tablet (md) mismo layout que desktop con sidebar */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Columna Izquierda - Productos (2/3 del ancho) */}
            <div className="md:col-span-2 space-y-6">
              {/* Búsqueda y Selección de Productos */}
              {/** sin overflow-hidden: el listado absoluto del buscador quedaría recortado */}
              <Card className={cardShell}>
                <CardHeader className="space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <Package className={cn(sectionIconClass)} strokeWidth={1.5} />
                    Productos
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Busca por nombre, referencia o marca (desde 1 carácter en local; búsqueda amplia desde 2).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 overflow-visible p-4 md:p-6 md:pt-4">
                  <div className="relative z-0">
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Buscar producto
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Nombre, referencia o marca…"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setShowProductDropdown(e.target.value.length > 0)
                        }}
                        onKeyDown={handleProductSearchKeyDown}
                        onFocus={() => setShowProductDropdown(true)}
                        className={cn(inputClass, 'pl-10')}
                      />
                      
                      {showProductDropdown && productSearch && (
                        <div className="scrollbar-hide absolute left-0 right-0 top-full z-[100] mt-1 max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10">
                          {isSearchingProducts ? (
                            <div className="p-4 text-center">
                              <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
                              <div className="text-sm text-zinc-500 dark:text-zinc-400">Buscando productos…</div>
                            </div>
                          ) : visibleProducts.length === 0 ? (
                            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                              No se encontraron productos
                            </div>
                          ) : (
                            <div className="p-2">
                              {visibleProducts.map((product, index) => {
                                const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
                                const hasStock = totalStock > 0
                                const isHighlighted = highlightedProductIndex === index

                                return (
                                  <div
                                    key={product.id}
                                    ref={(el) => {
                                      productRefs.current[index] = el
                                    }}
                                    onClick={() => hasStock ? handleAddProduct(product) : undefined}
                                    onMouseEnter={() => setHighlightedProductIndex(index)}
                                    className={cn(
                                      'rounded-lg border p-3 transition-colors last:mb-0',
                                      isHighlighted && hasStock
                                        ? 'cursor-pointer border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/80'
                                        : hasStock
                                          ? 'cursor-pointer border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                                          : 'cursor-not-allowed border-red-200/60 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className={cn(
                                            'font-medium',
                                            hasStock
                                              ? 'text-zinc-900 dark:text-zinc-100'
                                              : 'text-red-800 dark:text-red-300'
                                          )}
                                        >
                                          {product.name}
                                        </div>
                                        <div
                                          className={cn(
                                            'mt-0.5 text-sm',
                                            hasStock
                                              ? 'text-zinc-500 dark:text-zinc-400'
                                              : 'text-red-600 dark:text-red-400'
                                          )}
                                        >
                                          Ref: {product.reference || 'N/A'} · Stock: {totalStock} · $
                                          {(product.price || 0).toLocaleString('es-CO')}
                                        </div>
                                      </div>
                                      {!hasStock && (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200/80 bg-red-100/80 px-2 py-0.5 text-xs font-medium text-red-800 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-200">
                                          Sin stock
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {orderedSelectedProducts.length > 0 && (
                    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Líneas en la factura</h3>
                        <Badge
                          variant="outline"
                          className="border-zinc-200/90 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          {orderedSelectedProducts.length} producto{orderedSelectedProducts.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {orderedSelectedProducts.map(item => {
                          const product = findProductById(item.productId)
                          const warehouseStock = product?.stock?.warehouse || 0
                          const localStock = product?.stock?.store || 0
                          const reference = item.productReferenceCode || product?.reference || 'N/A'
                          
                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                    {item.productName}
                                  </h4>
                                  <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                                    Ref: {reference} · Bodega: {warehouseStock} · Local: {localStock}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Precio</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={formatNumber(item.unitPrice)}
                                      onChange={(e) => {
                                        const numericValue = parseNumber(e.target.value)
                                        if (numericValue >= 0) {
                                          handleUpdatePrice(item.id, numericValue)
                                        }
                                      }}
                                      onBlur={() => handlePriceBlur(item.id)}
                                      className="h-8 w-32 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                                      min={product?.cost || 0}
                                      step="100"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <div className="ml-3 text-right">
                                  <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatCurrency(item.total)}
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Subtotal línea</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Cantidad</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <input
                                      type="text"
                                      value={item.quantity}
                                      onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                      className="h-8 w-16 rounded-md border border-zinc-200 bg-white text-center text-base font-semibold text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                                      min="1"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveProduct(item.id)}
                                  className="h-8 px-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Derecha - Cliente, Pago y Resumen (1/3 del ancho, Sticky) */}
            <div className="space-y-6 md:col-span-1">
              {/** z-index alto solo con lista abierta: si no, la columna de abajo (pago/resumen) tapa el dropdown */}
              <div
                className={cn(
                  'relative',
                  showClientDropdown && !selectedClient ? 'z-[120]' : 'z-0'
                )}
              >
              <Card className={cardShell}>
                <CardHeader className="space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <User className={cn(sectionIconClass, 'text-violet-600 dark:text-violet-400')} strokeWidth={1.5} />
                    Cliente
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Quién recibe la factura.</p>
                </CardHeader>
                <CardContent className="space-y-3 overflow-visible p-4 md:p-6 md:pt-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Buscar cliente
                    </label>
                    <div className="relative isolate">
                      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Nombre, email o teléfono…"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value)
                          setShowClientDropdown(true)
                        }}
                        onFocus={() => {
                          setShowClientDropdown(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowClientDropdown(false)
                          }, 200)
                        }}
                        className={cn(inputClass, 'pl-10')}
                      />
                      
                      {showClientDropdown && !selectedClient && filteredClients.length > 0 && (
                        <div className="scrollbar-hide absolute left-0 right-0 top-full z-[130] mt-1 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-950">
                          <div className="rounded-[inherit] bg-white p-2 dark:bg-zinc-950">
                            {filteredClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setSelectedClient(client)
                                  setClientSearch(client.name)
                                  setShowClientDropdown(false)
                                }}
                                className="group mb-1 w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors last:mb-0 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                      {client.name}
                                    </div>
                                    {client.email && (
                                      <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                        {client.email}
                                      </div>
                                    )}
                                    {client.phone && (
                                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        {client.phone}
                                      </div>
                                    )}
                                  </div>
                                  <div className="shrink-0">
                                    <Badge className={cn(getClientTypeColor(client.type), 'whitespace-nowrap text-xs')}>
                                      {client.type === 'mayorista' ? 'Mayorista' : 
                                       client.type === 'minorista' ? 'Minorista' : 'Consumidor Final'}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {showClientDropdown && !selectedClient && filteredClients.length === 0 && clientSearch.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-[130] mt-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-600 dark:bg-zinc-950">
                          <div className="text-center">
                            <User className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">No se encontraron clientes</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedClient && (
                    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800">
                            <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {selectedClient.name}
                            </div>
                            {selectedClient.email && (
                              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedClient.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge className={cn(getClientTypeColor(selectedClient.type), 'whitespace-nowrap text-xs')}>
                            {selectedClient.type === 'mayorista' ? 'Mayorista' : 
                             selectedClient.type === 'minorista' ? 'Minorista' : 'Consumidor Final'}
                          </Badge>
                          <Button
                            onClick={handleRemoveClient}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
              </div>

              <Card className={cn(cardShell, 'relative z-0 overflow-hidden')}>
                <CardHeader className="space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <Users className={cn(sectionIconClass, 'text-sky-600 dark:text-sky-400')} strokeWidth={1.5} />
                    Vendedor
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    A quién se le acredita esta venta. Es obligatorio.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 p-4 md:p-6 md:pt-4">
                  {sellersLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
                      Cargando vendedores…
                    </div>
                  ) : sellers.length === 0 ? (
                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="min-w-0 text-xs leading-snug text-amber-900 dark:text-amber-200">
                          No hay vendedores activos en esta tienda. Crea un usuario con rol{' '}
                          <span className="font-semibold">vendedor</span> en{' '}
                          <button
                            type="button"
                            onClick={() => router.push('/roles')}
                            className="underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
                          >
                            Roles
                          </button>{' '}
                          antes de facturar.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Asignar a vendedor
                        </label>
                        <select
                          value={selectedSellerId}
                          onChange={(e) => setSelectedSellerId(e.target.value)}
                          className={inputClass}
                          required
                        >
                          <option value="" disabled>
                            Selecciona un vendedor…
                          </option>
                          {sellers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.id === user?.id ? ' (yo)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedSellerId && (() => {
                        const s = sellers.find((x) => x.id === selectedSellerId)
                        if (!s) return null
                        return (
                          <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={s.name}
                                seed={s.id}
                                size="sm"
                                className="shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                  {s.name}
                                </div>
                                {s.email && (
                                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    {s.email}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="whitespace-nowrap text-[10px]">
                                Vendedor
                              </Badge>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className={cn(cardShell, 'relative z-0 overflow-hidden')}>
                <CardHeader className="space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <CreditCard className={cn(sectionIconClass, 'text-emerald-600 dark:text-emerald-400')} strokeWidth={1.5} />
                    Método de pago
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Cómo se liquida la venta.</p>
                </CardHeader>
                <CardContent className="space-y-3 p-4 md:p-6 md:pt-4">
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(
                          e.target.value as
                            | 'cash'
                            | 'transfer'
                            | 'nequi'
                            | 'bancolombia'
                            | 'card'
                            | 'warranty'
                            | 'mixed'
                            | ''
                        )
                        if (e.target.value !== 'cash') {
                          setReceivedAmount('')
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Seleccionar método...</option>
                      <option value="cash">Efectivo</option>
                      <option value="nequi">Nequi</option>
                      <option value="bancolombia">Bancolombia</option>
                      <option value="transfer">Transferencia (otro / sin canal)</option>
                      <option value="card">Tarjeta</option>
                      <option value="mixed">Mixto</option>
                    </select>

                  {showMixedPayments && (
                    <div className="space-y-3 rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                      {mixedPayments.map((payment, index) => (
                        <div key={index}>
                          {index === 1 ? (
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              Monto digital — canal
                            </label>
                          ) : null}
                          {index === 1 ? (
                            <select
                              value={payment.paymentType}
                              onChange={(e) =>
                                updateMixedPayment(
                                  index,
                                  'paymentType',
                                  e.target.value as SalePayment['paymentType']
                                )
                              }
                              className={cn(inputClass, 'mb-2 py-2')}
                            >
                              <option value="nequi">Nequi</option>
                              <option value="bancolombia">Bancolombia</option>
                              <option value="transfer">Transferencia (otro / sin canal)</option>
                            </select>
                          ) : (
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {getPaymentTypeLabel(payment.paymentType)}
                            </label>
                          )}
                          <input
                            type="text"
                            value={payment.amount ? payment.amount.toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[^\d]/g, '')
                              updateMixedPayment(index, 'amount', parseInt(cleanValue, 10) || 0)
                            }}
                            placeholder="0"
                            className={cn(inputClass, 'py-2 text-sm')}
                          />
                        </div>
                      ))}
                      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">Total ingresado</span>
                          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(getTotalMixedPayments())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <div className="rounded-lg border border-red-200/80 bg-red-50/90 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {paymentError}
                    </div>
                  )}

                  {paymentMethod === 'cash' && validProducts.length > 0 && (
                    <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Dinero recibido</label>
                      <input
                        type="text"
                        value={receivedAmount ? parseFloat(receivedAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, '')
                          setReceivedAmount(value)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className={cn(inputClass, 'text-base font-semibold')}
                      />
                      {receivedAmount && parseFloat(receivedAmount.replace(/[^\d]/g, '')) > 0 && (
                        <div
                          className={cn(
                            'rounded-lg border p-3',
                            parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                              ? 'border-brand-200/80 bg-brand-50/80 dark:border-brand-900/40 dark:bg-brand-950/25'
                              : 'border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/25'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Vuelto</span>
                            <span
                              className={cn(
                                'text-xl font-bold tabular-nums',
                                parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                                  ? 'text-brand-700 dark:text-brand-400'
                                  : 'text-red-600 dark:text-red-400'
                              )}
                            >
                              {formatCurrency(parseFloat(receivedAmount.replace(/[^\d]/g, '')) - total)}
                            </span>
                          </div>
                          {parseFloat(receivedAmount.replace(/[^\d]/g, '')) < total && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Faltan {formatCurrency(total - parseFloat(receivedAmount.replace(/[^\d]/g, '')))}</span>
                            </div>
                          )}
                          {parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-brand-700 dark:text-brand-400">
                              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>Pago completo</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={cn(cardShell, 'relative z-0 overflow-hidden md:sticky md:top-24')}>
                <CardHeader className="space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    <DollarSign className={cn(sectionIconClass, 'text-amber-600 dark:text-amber-400')} strokeWidth={1.5} />
                    Resumen
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Totales y confirmación.</p>
                </CardHeader>
                <CardContent className="space-y-3 p-4 md:p-6 md:pt-4">
                  {orderedValidProducts.length === 0 ? (
                    <>
                      {saleBlockingAlert}
                      <div className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                        <Package className="mx-auto mb-2 h-10 w-10 text-indigo-400/50 dark:text-indigo-400/35" strokeWidth={1.5} />
                        <p className="text-sm">Agrega productos para ver el resumen</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="scrollbar-hide max-h-64 space-y-2 overflow-y-auto overscroll-contain">
                        {orderedValidProducts.map((item) => {
                          const hasPrice = item.unitPrice > 0
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'flex justify-between border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800',
                                !hasPrice && 'opacity-70'
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'flex items-center gap-2 font-medium truncate',
                                    !hasPrice && 'text-amber-700 dark:text-amber-400'
                                  )}
                                >
                                  {item.productName}
                                  {!hasPrice && (
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      <AlertTriangle className="h-3 w-3" />
                                      Sin precio
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {item.quantity} × {formatCurrency(item.unitPrice || 0)}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'ml-2 shrink-0 font-semibold tabular-nums',
                                  !hasPrice && 'text-amber-700 dark:text-amber-400'
                                )}
                              >
                                {formatCurrency(item.total)}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">IVA (19%)</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={includeTax}
                              onChange={(e) => setIncludeTax(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
                            />
                            <span className="text-xs text-zinc-500">Incluir</span>
                          </div>
                        </div>
                        {includeTax && (
                          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>IVA calculado</span>
                            <span className="tabular-nums">{formatCurrency(tax)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold dark:border-zinc-800">
                          <span className="text-zinc-900 dark:text-zinc-50">Total</span>
                          <span className="tabular-nums text-brand-700 dark:text-brand-400">{formatCurrency(total)}</span>
                        </div>
                      </div>

                      {saleBlockingAlert}

                      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        <Button
                          onClick={handleSave}
                          disabled={
                            isCreating ||
                            !selectedClient || 
                            selectedProducts.length === 0 || 
                            validProducts.length === 0 || 
                            !paymentMethod ||
                            !selectedSellerId ||
                            validProducts.some(item => !item.unitPrice || item.unitPrice <= 0)
                          }
                          className="w-full"
                          size="lg"
                        >
                          {isCreating ? (
                            <>
                              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
                              Creando venta…
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-5 w-5" strokeWidth={1.5} />
                              Crear venta
                            </>
                          )}
                        </Button>
                        {validProducts.some(item => !item.unitPrice || item.unitPrice <= 0) && (
                          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Asigna precio a todos los productos</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
