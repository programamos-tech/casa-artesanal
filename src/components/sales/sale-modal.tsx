'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Plus, 
  Minus, 
  Search,
  Calculator,
  User,
  Package,
  CreditCard,
  DollarSign,
  CreditCard as CreditCardIcon,
  Building2,
  Smartphone,
  Wallet,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Sale, SaleItem, Product, Client, SalePayment } from '@/types'
import { useClients } from '@/contexts/clients-context'
import { useProducts } from '@/contexts/products-context'
import { useAuth } from '@/contexts/auth-context'
import { ProductsService } from '@/lib/products-service'
import { ClientModal } from '@/components/clients/client-modal'

// Constante para identificar la tienda principal
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
// Margen mínimo de ganancia para microtiendas (10%)
const MIN_PROFIT_MARGIN = 0.10

interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (sale: Omit<Sale, 'id' | 'createdAt'>) => void
  sale?: Sale | null // Venta existente para editar (solo borradores)
  onUpdate?: (id: string, sale: Omit<Sale, 'id' | 'createdAt'>) => void // Callback para actualizar
}

export function SaleModal({ isOpen, onClose, onSave, sale, onUpdate }: SaleModalProps) {
  const { clients, createClient, getAllClients } = useClients()
  const { products, refreshProducts } = useProducts()
  const { user } = useAuth()
  
  // Detectar si es tienda principal o microtienda
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card' | 'credit' | 'warranty' | 'mixed' | ''
  >('')
  const [clientSearch, setClientSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [includeTax, setIncludeTax] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('Pendiente') // Número de factura
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [stockAlert, setStockAlert] = useState<{show: boolean, message: string, productId?: string}>({show: false, message: ''})
  
  // Estados para pagos mixtos
  const [mixedPayments, setMixedPayments] = useState<SalePayment[]>([])
  const [showMixedPayments, setShowMixedPayments] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  
  // Estado para cálculo de vuelto (solo efectivo)
  const [receivedAmount, setReceivedAmount] = useState<string>('')

  // Cargar clientes y productos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      getAllClients()
      refreshProducts()
      
      // Si hay una venta para editar (modo edición)
      if (sale && sale.status === 'draft') {
        // Cargar cliente
        const client = clients.find(c => c.id === sale.clientId)
        if (client) {
          setSelectedClient(client)
          setClientSearch(client.name)
        }
        
        // Cargar productos
        if (sale.items && sale.items.length > 0) {
          const itemsWithAddedAt = sale.items.map((item, index) => ({
            ...item,
            id: item.id || `temp-${index}`,
            addedAt: Date.now() + index
          }))
          setSelectedProducts(itemsWithAddedAt)
        }
        
        // Cargar método de pago
        setPaymentMethod(sale.paymentMethod)
        
        // Cargar pagos mixtos si aplica
        if (sale.paymentMethod === 'mixed' && sale.payments) {
          setMixedPayments(sale.payments)
          setShowMixedPayments(true)
        }
        
        // Cargar número de factura
        if (sale.invoiceNumber) {
          setInvoiceNumber(sale.invoiceNumber)
        }
        
        // Cargar impuestos
        if (sale.tax && sale.tax > 0) {
          setIncludeTax(true)
        }
      } else {
        // Resetear formulario si no hay venta para editar
        setSelectedClient(null)
        setSelectedProducts([])
        setPaymentMethod('')
        setClientSearch('')
        setProductSearch('')
        setInvoiceNumber('Pendiente')
        setMixedPayments([])
        setShowMixedPayments(false)
        setIncludeTax(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale]) // Ejecutar cuando se abre/cierra el modal o cambia la venta

  // Manejar cambio de método de pago
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

  // Debounce para la búsqueda de productos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas (ZonaT, Zonat, Corozal, Sahagun, etc.)
    const storeKeywords = ['casa artesanal', 'casaartesanal', 'corozal', 'sahagun', 'sincelejo']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  const filteredClients = useMemo(() => {
    // Primero filtrar clientes de tiendas
    const nonStoreClients = clients.filter(client => !isStoreClient(client))
    
    if (!clientSearch.trim()) return nonStoreClients
    return nonStoreClients.filter(client =>
      client && client.name && client.name.toLowerCase().includes(clientSearch.toLowerCase())
    )
  }, [clients, clientSearch])

  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1)
  const [productCache, setProductCache] = useState<Record<string, Product>>({})

  const updateProductCache = useCallback((items: Product[]) => {
    if (!items || items.length === 0) return
    setProductCache(prev => {
      const updated = { ...prev }
      items.forEach(product => {
        if (product && product.id) {
          updated[product.id] = product
        }
      })
      return updated
    })
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      updateProductCache(products)
    }
  }, [products, updateProductCache])

  // Buscar productos cuando el usuario escriba
  useEffect(() => {
    let cancelled = false
    
    const performSearch = async () => {
      if (debouncedProductSearch.trim().length >= 2) {
        setIsSearchingProducts(true)
        try {
          // Pasar el storeId del usuario para obtener precios correctos de store_stock
          const results = await ProductsService.searchProducts(debouncedProductSearch, undefined, user?.storeId)
          if (!cancelled) {
            updateProductCache(results)
            setSearchedProducts(results)
          }
        } catch (error) {
      // Error silencioso en producción
          if (!cancelled) {
            setSearchedProducts([])
          }
        } finally {
          if (!cancelled) {
            setIsSearchingProducts(false)
          }
        }
      } else {
        setSearchedProducts([])
        setIsSearchingProducts(false)
      }
    }

    performSearch()
    
    return () => {
      cancelled = true
    }
  }, [debouncedProductSearch, user?.storeId])

  const filteredProducts = useMemo(() => {
    // Si no hay búsqueda, mostrar solo los primeros 5 productos como sugerencias
    if (!debouncedProductSearch.trim()) {
      const activeProducts = products.filter(product => product && product.status === 'active')
      return activeProducts.slice(0, 5)
    }
    
    // Si estamos buscando y aún no hay resultados, mostrar vacío
    if (debouncedProductSearch.trim().length >= 2 && isSearchingProducts) {
      return []
    }
    
    // Si hay búsqueda y tenemos resultados buscados, usar esos productos
    if (debouncedProductSearch.trim().length >= 2 && searchedProducts.length > 0) {
      return searchedProducts
    }
    
    // Si hay búsqueda pero no hay resultados buscados y no estamos buscando, usar productos locales
    const searchTerm = debouncedProductSearch.toLowerCase().trim()
    const matchingProducts = products.filter(product => {
      if (!product || product.status !== 'active') return false
      
      const name = (product.name || '').toLowerCase()
      const brand = (product.brand || '').toLowerCase()
      const reference = (product.reference || '').toLowerCase()
      
      return name.includes(searchTerm) || 
             brand.includes(searchTerm) || 
             reference.includes(searchTerm)
    })
    
    // Priorizar resultados: primero por referencia exacta, luego por referencia que empieza con, luego nombre que empieza con, luego el resto
    return matchingProducts.sort((a, b) => {
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
      
      // Ordenar por referencia que contiene el término
      if (aRef.includes(searchTermLower) && !bRef.includes(searchTermLower)) return -1
      if (!aRef.includes(searchTermLower) && bRef.includes(searchTermLower)) return 1
      
      return 0
    })
  }, [products, debouncedProductSearch, searchedProducts, isSearchingProducts])


  // Scroll automático cuando se selecciona un producto con las flechas
  useEffect(() => {
    if (selectedProductIndex >= 0 && showProductDropdown) {
      const element = document.getElementById(`product-item-${selectedProductIndex}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedProductIndex, showProductDropdown])

  const getClientTypeColor = (type: string) => {
    switch (type) {
      case 'mayorista':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
      case 'minorista':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
      case 'consumidor_final':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-600'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'transfer':
        return <Building2 className="h-4 w-4" />
      case 'nequi':
        return <Smartphone className="h-4 w-4" />
      case 'bancolombia':
        return <Building2 className="h-4 w-4" />
      case 'card':
        return <Wallet className="h-4 w-4" />
      case 'mixed':
        return <RefreshCw className="h-4 w-4" />
      case '':
        return <CreditCard className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia (otro / sin canal)'
      case 'card':
        return 'Tarjeta'
      case 'mixed':
        return 'Mixto'
      case '':
        return 'Seleccionar método de pago'
      default:
        return 'Seleccionar método de pago'
    }
  }

  // Función para obtener el stock disponible de un producto
  const findProductById = useCallback((productId: string) => {
    return productCache[productId] || products.find(p => p.id === productId)
  }, [productCache, products])

  const getAvailableStock = (productId: string) => {
    const product = findProductById(productId)
    if (!product) return 0
    return (product.stock.warehouse || 0) + (product.stock.store || 0)
  }

  // Función para obtener el estado de stock de un producto
  const getStockStatus = (productId: string) => {
    const product = findProductById(productId)
    if (!product) return 'Sin Stock'
    
    const { warehouse, store, total } = product.stock
    
    if (total === 0) {
      return 'Sin Stock'
    }
    
    if (store > 0) {
      if (store >= 10) {
        return 'Disponible Local'
      } else if (store >= 5) {
        return 'Stock Local Bajo'
      } else {
        return 'Stock Local Muy Bajo'
      }
    }
    
    if (warehouse > 0) {
      if (warehouse >= 20) {
        return 'Solo Bodega'
      } else if (warehouse >= 10) {
        return 'Solo Bodega (Bajo)'
      } else {
        return 'Solo Bodega (Muy Bajo)'
      }
    }
    
    return 'Sin Stock'
  }

  // Función para obtener la cantidad ya seleccionada de un producto
  const getSelectedQuantity = (productId: string) => {
    const existingItem = selectedProducts.find(item => item.productId === productId)
    return existingItem ? existingItem.quantity : 0
  }

  // Función para mostrar alerta de stock
  const showStockAlert = (message: string, productId?: string) => {
    setStockAlert({ show: true, message, productId })
  }

  // Función para ocultar alerta de stock
  const hideStockAlert = () => {
    setStockAlert({ show: false, message: '' })
  }

  // Funciones para manejar pagos mixtos
  const updateMixedPayment = (index: number, field: keyof SalePayment, value: any) => {
    const updatedPayments = [...mixedPayments]
    updatedPayments[index] = { ...updatedPayments[index], [field]: value }
    setMixedPayments(updatedPayments)
    // Limpiar error cuando el usuario actualiza los pagos
    if (paymentError) {
      setPaymentError('')
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'cash':
        return 'Efectivo'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia (otro / sin canal)'
      case 'card':
        return 'Tarjeta'
      default:
        return type
    }
  }

  const getTotalMixedPayments = () => {
    return mixedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  }

  // Solo considerar productos con cantidad > 0 para cálculos
  const validProducts = selectedProducts.filter(item => item.quantity > 0)

  const orderedSelectedProducts = useMemo(() => {
    if (selectedProducts.length === 0) return []
    return [...selectedProducts].sort((a, b) => {
      const aTime = a.addedAt ?? Number(a.id) || 0
      const bTime = b.addedAt ?? Number(b.id) || 0
      return bTime - aTime
    })
  }, [selectedProducts])

  const orderedValidProducts = useMemo(
    () => orderedSelectedProducts.filter(item => item.quantity > 0),
    [orderedSelectedProducts]
  )
  
  // Calcular subtotal (suma de precios)
  const subtotal = validProducts.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice)
  }, 0)
  
  // IVA automático sobre el total (19% en Colombia)
  const tax = includeTax ? subtotal * 0.19 : 0
  const total = subtotal + tax

  const getRemainingAmount = () => {
    // Si no hay productos seleccionados, no hay pago que completar
    if (validProducts.length === 0) {
      return Math.round(total) // Devolver el total redondeado (que será 0) para que no muestre "Pago completo"
    }
    // Redondear el faltante a números enteros (sin centavos)
    return Math.round(total - getTotalMixedPayments())
  }

  const handleAddProduct = (product: Product) => {
    // Debug: ver qué valores tiene el producto cuando se agrega
    console.log('[SALE MODAL] handleAddProduct - product:', {
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost,
      isMainStore: isMainStore,
      userStoreId: user?.storeId
    })
    
    const availableStock = getAvailableStock(product.id)
    const selectedQuantity = getSelectedQuantity(product.id)
    
    // Verificar si hay stock disponible
    if (availableStock <= 0) {
      showStockAlert('No hay stock disponible para este producto', product.id)
      return
    }
    
    // Verificar si ya se ha seleccionado la cantidad máxima
    if (selectedQuantity >= availableStock) {
      showStockAlert(`Solo hay ${availableStock} unidades disponibles de este producto`, product.id)
      return
    }
    
    const existingItem = selectedProducts.find(item => item.productId === product.id)
    
    if (existingItem) {
      const updatedTimestamp = Date.now()
      setSelectedProducts(prev => 
        prev.map(item => {
          if (item.productId === product.id) {
            const updatedItem = { ...item, quantity: item.quantity + 1, addedAt: updatedTimestamp }
            // Recalcular total
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
            return updatedItem
          }
          return item
        })
      )
    } else {
      const now = Date.now()
      const newItem: SaleItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        productReferenceCode: product.reference,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        discountType: 'amount',
        tax: 0,
        total: product.price,
        addedAt: now
      }
      console.log('[SALE MODAL] handleAddProduct - newItem unitPrice:', newItem.unitPrice)
      setSelectedProducts(prev => [newItem, ...prev])
    }
    setShowProductDropdown(false)
    setProductSearch('')
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

    // Permitir escribir libremente, la validación se hará al perder el foco
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, unitPrice: newPrice }
          // Recalcular total
          updatedItem.total = updatedItem.quantity * newPrice
          return updatedItem
        }
        return item
      })
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handlePriceBlur = (itemId: string) => {
    // Validar precio al perder el foco y mostrar alerta si es inválido
    const item = selectedProducts.find(i => i.id === itemId)
    if (item) {
      const product = findProductById(item.productId)
      if (!product) return
      
      // Debug: ver qué valores tiene el producto
      console.log('[SALE MODAL] handlePriceBlur - product:', {
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        isMainStore: isMainStore,
        userStoreId: user?.storeId
      })
      
      // Precio mínimo: siempre el costo de adquisición (en Sincelejo y microtiendas)
      const minPrice = product.cost || 0
      const priceType = 'costo de adquisición'
      
      console.log('[SALE MODAL] handlePriceBlur - validation:', {
        itemUnitPrice: item.unitPrice,
        minPrice: minPrice,
        priceType: priceType,
        shouldShowAlert: item.unitPrice < minPrice
      })
      
      // Si el precio es menor al mínimo, mostrar alerta
      if (item.unitPrice < minPrice) {
        showStockAlert(`${item.productName} no puede ser vendido por menos de ${formatCurrency(minPrice)} (${priceType})`, item.productId)
      } else {
        // Si el precio es válido, ocultar la alerta para este producto
        if (stockAlert.show && stockAlert.productId === item.productId) {
          setStockAlert({ show: false, message: '', productId: undefined })
        }
      }
    }
  }

  const handleRemoveProduct = (itemId: string) => {
    const item = selectedProducts.find(i => i.id === itemId)
    // Si el producto que se está quitando tiene una alerta activa, ocultarla
    if (item && stockAlert.show && stockAlert.productId === item.productId) {
      setStockAlert({ show: false, message: '', productId: undefined })
    }
    setSelectedProducts(prev => prev.filter(item => item.id !== itemId))
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    // No eliminar el producto si la cantidad es 0, solo actualizar
    if (newQuantity < 0) {
      return
    }

    // Encontrar el item para obtener el productId
    const item = selectedProducts.find(item => item.id === itemId)
    if (!item) return

    const availableStock = getAvailableStock(item.productId)
    
    // Verificar que no se exceda el stock disponible (solo si es mayor a 0)
    if (newQuantity > 0 && newQuantity > availableStock) {
      showStockAlert(`Solo hay ${availableStock} unidades disponibles de este producto`, item.productId)
      return
    }

    // Si la cantidad es válida, ocultar la alerta
    if (stockAlert.show && stockAlert.productId === item.productId) {
      hideStockAlert()
    }

    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity: newQuantity }
          // Recalcular total
          updatedItem.total = newQuantity * updatedItem.unitPrice
          return updatedItem
        }
        return item
      })
    )
  }

  const handleQuantityInputChange = (itemId: string, value: string) => {
    // Solo permitir números (incluyendo 0)
    const numericValue = value.replace(/[^0-9]/g, '')
    const quantity = numericValue === '' ? 0 : parseInt(numericValue, 10)
    
    // Encontrar el item para obtener el productId
    const item = selectedProducts.find(item => item.id === itemId)
    if (!item) return

    const availableStock = getAvailableStock(item.productId)
    
    // Verificar que no se exceda el stock disponible
    if (quantity > availableStock) {
      showStockAlert(`Solo hay ${availableStock} unidades disponibles de este producto`, item.productId)
      return
    }
    
    // Si la cantidad es válida, ocultar la alerta
    if (stockAlert.show && stockAlert.productId === item.productId) {
      hideStockAlert()
    }
    
    // Permitir 0, no eliminar el producto
    setSelectedProducts(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity: quantity }
          // Recalcular total
          updatedItem.total = quantity * updatedItem.unitPrice
          return updatedItem
        }
        return item
      })
    )
  }


  const handleSave = (isDraft: boolean = false) => {
    // Validar que hay cliente, productos, método de pago y que todos tengan cantidad > 0
    if (!selectedClient || selectedProducts.length === 0 || validProducts.length === 0 || !paymentMethod) return

    // Validar que todos los precios de venta sean >= costo de adquisición (en Sincelejo y microtiendas)
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
      showStockAlert(invalidProducts.join(' • '), undefined)
      return
    }

    // Si NO es borrador, validar pagos mixtos si es necesario
    if (!isDraft && paymentMethod === 'mixed') {
      const totalMixedPayments = getTotalMixedPayments()
      const roundedTotal = Math.round(total)
      const roundedPayments = Math.round(totalMixedPayments)
      
      if (roundedPayments !== roundedTotal) {
        const faltante = Math.abs(roundedTotal - roundedPayments)
        setPaymentError(`El total ingresado ($${roundedPayments.toLocaleString('es-CO', { maximumFractionDigits: 0 })}) no coincide con el total de la venta ($${roundedTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}). Falta: $${faltante.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`)
        return
      }
    }

    const saleItems = validProducts.map(({ addedAt, ...item }) => item)

    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      total: total,
      subtotal: subtotal,
      tax: tax,
      discount: 0,
      discountType: 'amount',
      status: isDraft ? 'draft' : 'completed',
      paymentMethod,
      payments: paymentMethod === 'mixed' ? mixedPayments : undefined,
      items: saleItems, // Solo incluir productos con cantidad > 0
      invoiceNumber: sale?.invoiceNumber // Mantener número de factura si es edición
    }

    // Si es modo edición y hay onUpdate, usar update en lugar de create
    if (sale && sale.status === 'draft' && onUpdate) {
      // Actualizar el número de factura antes de guardar
      if (!sale.invoiceNumber) {
        setInvoiceNumber('Generando...')
      }
      onUpdate(sale.id, saleData)
    } else {
      // Crear nueva venta
      // Actualizar el número de factura antes de guardar
      setInvoiceNumber('Generando...')
      onSave(saleData)
    }
    
    handleClose()
  }

  const handleSaveAsDraft = () => {
    // Permitir borrador para cualquier tipo de venta
    handleSave(true)
  }

  const handleClose = () => {
    setSelectedClient(null)
    setSelectedProducts([])
    setPaymentMethod('')
    setClientSearch('')
    setProductSearch('')
    setDebouncedProductSearch('')
    setShowClientDropdown(false)
    setShowProductDropdown(false)
    setIncludeTax(false)
    setInvoiceNumber('Pendiente')
    setMixedPayments([])
    setShowMixedPayments(false)
    setPaymentError('')
    setReceivedAmount('')
    hideStockAlert()
    onClose()
  }

  const handleCreateClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = await createClient(clientData)
      setSelectedClient(newClient)
      setClientSearch(newClient.name)
      setIsClientModalOpen(false)
    } catch (error) {
      // Error silencioso en producción
    }
  }

  const handleRemoveClient = () => {
    setSelectedClient(null)
    setClientSearch('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] flex flex-col border-0 xl:border border-gray-200 dark:border-neutral-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-green-600 dark:bg-green-700 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {sale && sale.status === 'draft' ? 'Editar Borrador' : 'Nueva Venta'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {sale && sale.status === 'draft' ? `Borrador ${invoiceNumber}` : `Factura ${invoiceNumber}`}
                </p>
              </div>
              {(paymentMethod === 'credit' || sale?.paymentMethod === 'credit') && (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Crédito
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-neutral-950 relative">
          <div className={`grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 ${!selectedClient && selectedProducts.length === 0 ? 'xl:items-start xl:pt-8' : ''}`}>
            {/* Left Column - Client and Products (3/5 del ancho) */}
            <div className={`xl:col-span-3 space-y-4 relative`}>
              {/* Client Selection */}
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={clientSearch}
                        onChange={(e) => {
                          const value = e.target.value
                          setClientSearch(value)
                          setShowClientDropdown(value.length > 0)
                        }}
                          onFocus={() => setShowClientDropdown(true)}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
                        />
                      </div>
                    </div>
                    
                    {/* Opción de crear cliente eliminada en el modal de ventas */}
                    
                    {showClientDropdown && (
                      <div className="mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl max-h-64 overflow-y-auto relative z-[100]">
                        {filteredClients.length === 0 ? (
                          <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No se encontraron clientes
                          </div>
                        ) : (
                          <div className="py-1">
                            {filteredClients.map(client => (
                              <button
                                key={client.id}
                                onClick={() => {
                                  setSelectedClient(client)
                                  setClientSearch(client.name)
                                  setShowClientDropdown(false)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors border-b border-gray-100 dark:border-neutral-700 last:border-b-0"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate" title={client.name}>
                                      {client.name}
                                    </div>
                                    {client.email && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={client.email}>
                                        {client.email}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Badge className={`${getClientTypeColor(client.type)} text-xs whitespace-nowrap`}>
                                      {client.type === 'mayorista' ? 'Mayorista' : 
                                       client.type === 'minorista' ? 'Minorista' : 'Consumidor Final'}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedClient && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{selectedClient.name}</div>
                          {selectedClient.email && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{selectedClient.email}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge className={`${getClientTypeColor(selectedClient.type)} text-xs`}>
                            {selectedClient.type === 'mayorista' ? 'Mayorista' : 
                             selectedClient.type === 'minorista' ? 'Minorista' : 'Consumidor Final'}
                          </Badge>
                          <Button
                            onClick={handleRemoveClient}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-neutral-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Agregar Productos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o referencia..."
                        value={productSearch}
                        onChange={(e) => {
                          const value = e.target.value
                          setProductSearch(value)
                          setShowProductDropdown(true) // Siempre mostrar dropdown
                          setSelectedProductIndex(-1) // Resetear índice al escribir
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        onClick={() => setShowProductDropdown(true)}
                        onKeyDown={(e) => {
                          // Permitir navegación solo si hay productos y el dropdown está visible
                          if (e.key === 'ArrowDown' && showProductDropdown && filteredProducts.length > 0) {
                            e.preventDefault()
                            setShowProductDropdown(true)
                            setSelectedProductIndex(prev => 
                              prev < filteredProducts.length - 1 ? prev + 1 : 0
                            )
                          } else if (e.key === 'ArrowUp' && showProductDropdown && filteredProducts.length > 0) {
                            e.preventDefault()
                            setSelectedProductIndex(prev => 
                              prev > 0 ? prev - 1 : filteredProducts.length - 1
                            )
                          } else if (e.key === 'Enter' && selectedProductIndex >= 0 && selectedProductIndex < filteredProducts.length) {
                            e.preventDefault()
                            handleAddProduct(filteredProducts[selectedProductIndex])
                            setProductSearch('')
                            setSelectedProductIndex(-1)
                            setShowProductDropdown(false)
                          } else if (e.key === 'Escape') {
                            setShowProductDropdown(false)
                            setSelectedProductIndex(-1)
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
                      />
                    </div>
                    
                    {/* Product Dropdown - Mejorado con z-index alto */}
                    {showProductDropdown && (
                      <div 
                        id="product-dropdown"
                        className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg shadow-2xl max-h-96 md:max-h-[500px] overflow-y-auto relative z-[100] mt-2"
                      >
                        {/* Botón para cerrar */}
                        <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-600 flex justify-end p-2 z-10">
                          <button
                            onClick={() => setShowProductDropdown(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-700"
                          >
                            ✕ Cerrar
                          </button>
                        </div>
                        {isSearchingProducts ? (
                          <div className="px-4 py-6 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                              Buscando productos...
                            </div>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <Package className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                              {productSearch.trim() ? 'No se encontraron productos' : 'No hay productos disponibles'}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2">
                            {!productSearch.trim() && (
                              <div className="px-3 py-2 mb-1">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Productos sugeridos
                                </div>
                              </div>
                            )}
                            <div className="space-y-1">
                              {filteredProducts.map((product, index) => (
                                <button
                                  key={product.id}
                                  id={`product-item-${index}`}
                                  onClick={() => {
                                    handleAddProduct(product)
                                    setProductSearch('')
                                    setSelectedProductIndex(-1)
                                    setShowProductDropdown(false)
                                  }}
                                  onMouseEnter={() => setSelectedProductIndex(index)}
                                  className={`w-full px-3 py-3 text-left rounded-lg transition-all group ${
                                    selectedProductIndex === index
                                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 shadow-sm'
                                      : 'hover:bg-gray-50 dark:hover:bg-neutral-700/50 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                                        {product.name}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        {product.brand} • {product.reference}
                                      </div>
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                          <span>Bodega: <span className="font-medium">{product.stock.warehouse || 0}</span></span>
                                          <span>•</span>
                                          <span>Local: <span className="font-medium">{product.stock.store || 0}</span></span>
                                        </div>
                                        <Badge className={`text-xs whitespace-nowrap ${
                                          getStockStatus(product.id) === 'Disponible Local' 
                                            ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600' 
                                            : getStockStatus(product.id).includes('Bodega')
                                              ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
                                              : getStockStatus(product.id).includes('Bajo')
                                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600'
                                                : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                                        }`}>
                                          {getStockStatus(product.id)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                                        ${product.price.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">c/u</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Alerta general de stock */}
                  {stockAlert.show && !stockAlert.productId && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div className="text-sm font-medium text-red-800 dark:text-red-200">
                          {stockAlert.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Products */}
                  {orderedSelectedProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Productos Seleccionados</h3>
                        <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 text-sm">
                          {orderedSelectedProducts.length} producto{orderedSelectedProducts.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {orderedSelectedProducts.map(item => (
                          <div key={item.id} className="bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-600 rounded-lg p-3">
                            {/* Product Info Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">{item.productName}</h4>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                  Stock disponible: <span className="font-medium text-gray-700 dark:text-gray-300">{getAvailableStock(item.productId)} unidades</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Precio:
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatNumber(item.unitPrice)}
                                    onChange={(e) => {
                                      const numericValue = parseNumber(e.target.value)
                                      handleUpdatePrice(item.id, numericValue)
                                    }}
                                    onBlur={() => handlePriceBlur(item.id)}
                                    className={`w-32 h-8 text-sm text-gray-900 dark:text-white border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-neutral-700 px-2 ${
                                      (() => {
                                        const product = findProductById(item.productId)
                                        if (!product) return false
                                        const minPrice = product.cost || 0
                                        return item.unitPrice && item.unitPrice < minPrice
                                      })()
                                        ? 'border-red-500 dark:border-red-500'
                                        : 'border-gray-300 dark:border-neutral-600'
                                    }`}
                                    step="100"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">${item.total.toLocaleString()}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                              </div>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-neutral-600">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Cantidad:</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="h-8 w-8 p-0 border-gray-300 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-600 dark:text-gray-300"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <input
                                    type="text"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                    className="w-16 h-8 text-center text-base font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-600 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-neutral-700"
                                    min="1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="h-8 w-8 p-0 border-gray-300 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-600 dark:text-gray-300"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Remove Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveProduct(item.id)}
                                className="h-8 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Quitar
                              </Button>
                            </div>
                            
                            {/* Stock Alert */}
                            {stockAlert.show && stockAlert.productId === item.productId && (
                              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  <div className="text-sm font-medium text-red-800 dark:text-red-200">
                                    {stockAlert.message}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Payment and Summary (2/5 del ancho) */}
            <div className="xl:col-span-2 space-y-4">
              {/* Payment Method */}
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    {/* Selector de Método de Pago */}
                    <div className="relative">
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          const newMethod = e.target.value as any
                          setPaymentMethod(newMethod)
                          // Limpiar monto recibido si no es efectivo
                          if (newMethod !== 'cash') {
                            setReceivedAmount('')
                          }
                        }}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-neutral-800 appearance-none cursor-pointer text-gray-900 dark:text-white"
                      >
                        <option value="" className="bg-white dark:bg-neutral-700 text-gray-500 dark:text-gray-400">Seleccionar método de pago</option>
                        <option value="cash" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Efectivo/Contado</option>
                        <option value="nequi" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Nequi</option>
                        <option value="bancolombia" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Bancolombia</option>
                        <option value="transfer" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Transferencia (otro / sin canal)</option>
                        <option value="card" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Tarjeta</option>
                        <option value="mixed" className="bg-white dark:bg-neutral-700 text-gray-900 dark:text-white">Mixto</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Sección de Pagos Mixtos */}
                    {showMixedPayments && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-600">
                        <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                          Desglose de Pago Mixto
                        </h4>
                        <div className="space-y-2">
                          {mixedPayments.map((payment, index) => (
                            <div key={index} className="space-y-2">
                              <div>
                                {index === 1 ? (
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                                    className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-green-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                                  >
                                    <option value="nequi">Nequi</option>
                                    <option value="bancolombia">Bancolombia</option>
                                    <option value="transfer">Transferencia (otro / sin canal)</option>
                                  </select>
                                ) : (
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {getPaymentTypeLabel(payment.paymentType)}
                                  </label>
                                )}
                                <input
                                  type="text"
                                  value={payment.amount ? payment.amount.toLocaleString('es-CO') : ''}
                                  onChange={(e) => {
                                    // Remover todos los caracteres no numéricos excepto puntos
                                    const cleanValue = e.target.value.replace(/[^\d]/g, '')
                                    const numericValue = cleanValue ? parseInt(cleanValue, 10) : 0
                                    updateMixedPayment(index, 'amount', numericValue)
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                            </div>
                          ))}
                          
                          {/* Campo de observaciones generales */}
                          <div className="pt-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Observaciones Generales
                            </label>
                            <input
                              type="text"
                              value={mixedPayments[0]?.notes || ''}
                              onChange={(e) => {
                                // Actualizar las notas en todos los pagos
                                const updatedPayments = mixedPayments.map(payment => ({
                                  ...payment,
                                  notes: e.target.value
                                }))
                                setMixedPayments(updatedPayments)
                              }}
                              placeholder="Notas sobre el pago mixto..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          
                          {/* Resumen de pagos mixtos */}
                          <div className="pt-3 border-t border-gray-200 dark:border-neutral-600 space-y-2">
                            <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-neutral-900/50 p-2 rounded-md">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Total a pagar:</span>
                              <span className="font-bold text-gray-900 dark:text-white text-base">
                                ${Math.round(total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Total ingresado:</span>
                              <span className={`font-medium ${Math.round(getTotalMixedPayments()) === Math.round(total) && validProducts.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                ${Math.round(getTotalMixedPayments()).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            {Math.round(getTotalMixedPayments()) === Math.round(total) && validProducts.length > 0 && (
                              <div className="flex justify-between items-center text-sm font-medium pt-1 border-t border-gray-200 dark:border-neutral-700">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Pago completo</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alerta de error de pagos mixtos */}
                    {paymentError && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-red-700 dark:text-red-300">{paymentError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Resumen de Venta
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {orderedValidProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Agrega productos para ver el resumen
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {orderedValidProducts.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-neutral-800/40 border border-gray-200 dark:border-neutral-600 px-3 py-2"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {item.productName}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {item.quantity} x ${item.unitPrice.toLocaleString('es-CO')}
                                </div>
                              </div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                ${item.total.toLocaleString('es-CO')}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-neutral-600">
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Subtotal:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ${subtotal.toLocaleString()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">IVA (19%):</span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={includeTax}
                                  onChange={(e) => setIncludeTax(e.target.checked)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Incluir IVA
                                </span>
                              </div>
                            </div>
                            {includeTax && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">IVA calculado:</span>
                                <span className="font-medium text-gray-900 dark:text-white">${tax.toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-gray-200 dark:border-neutral-600 pt-2">
                            <div className="flex justify-between text-base font-semibold">
                              <span className="text-gray-900 dark:text-white">Total:</span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                ${total.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Cálculo de vuelto - Solo para efectivo */}
                          {paymentMethod === 'cash' && validProducts.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-neutral-600 pt-3 mt-3 space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Dinero recibido:
                                </label>
                                
                                {/* Input para monto recibido */}
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
                                  <input
                                    type="text"
                                    value={receivedAmount ? parseFloat(receivedAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                                    onChange={(e) => {
                                      // Permitir solo números
                                      const value = e.target.value.replace(/[^\d]/g, '')
                                      setReceivedAmount(value)
                                    }}
                                    onFocus={(e) => {
                                      // Seleccionar todo el texto al enfocar
                                      e.target.select()
                                    }}
                                    placeholder="Ingresa el monto recibido"
                                    className="w-full pl-8 pr-3 py-2.5 text-lg font-semibold border-2 border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              
                              {/* Mostrar vuelto si hay monto recibido */}
                              {receivedAmount && parseFloat(receivedAmount.replace(/[^\d]/g, '')) > 0 && (
                                <div className={`rounded-lg p-4 border-2 ${
                                  parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                      Vuelto:
                                    </span>
                                    <span className={`text-2xl font-bold ${
                                      parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      ${(parseFloat(receivedAmount.replace(/[^\d]/g, '')) - total).toLocaleString('es-CO', { 
                                        minimumFractionDigits: 0, 
                                        maximumFractionDigits: 0 
                                      })}
                                    </span>
                                  </div>
                                  {parseFloat(receivedAmount.replace(/[^\d]/g, '')) < total && (
                                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                                      <AlertTriangle className="h-4 w-4" />
                                      <span>Faltan ${(total - parseFloat(receivedAmount.replace(/[^\d]/g, ''))).toLocaleString('es-CO', { 
                                        minimumFractionDigits: 0, 
                                        maximumFractionDigits: 0 
                                      })}</span>
                                    </div>
                                  )}
                                  {parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total && (
                                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>Pago completo</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer - Sticky siempre visible */}
        <div className="flex-shrink-0 bg-white p-4 pt-6 dark:bg-neutral-950 md:p-6" style={{ paddingBottom: 'calc(max(56px, env(safe-area-inset-bottom)) + 1rem)' }}>
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white font-medium px-6 py-2.5"
            >
              Cancelar
            </Button>
            {!sale && (
              <Button
                onClick={() => handleSave(false)}
                disabled={!selectedClient || selectedProducts.length === 0 || validProducts.length === 0 || !paymentMethod}
                className="font-medium px-6 py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
              >
                Crear Venta
              </Button>
            )}
            {sale && sale.status === 'draft' && (
              <Button
                onClick={() => handleSave(false)}
                disabled={!selectedClient || selectedProducts.length === 0 || validProducts.length === 0 || !paymentMethod}
                className="font-medium px-6 py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
              >
                Finalizar y Crear Venta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleCreateClient}
        onUpdate={() => {}}
        onDelete={() => {}}
        onToggleStatus={() => {}}
        categories={[]}
        client={null}
        isEdit={false}
      />
    </div>
  )
}
