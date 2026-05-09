'use client'

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  KeyboardEvent,
  useLayoutEffect
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { 
  X, 
  CreditCard, 
  User, 
  Package, 
  Calendar, 
  DollarSign, 
  Plus, 
  Minus,
  Search,
  ShoppingCart,
  ChevronDown,
  AlertTriangle
} from 'lucide-react'
import { Credit, Client, SaleItem, Product } from '@/types'
import { useProducts } from '@/contexts/products-context'
import { useClients } from '@/contexts/clients-context'
import { useAuth } from '@/contexts/auth-context'
import { SalesService } from '@/lib/sales-service'
import { CreditsService } from '@/lib/credits-service'
import { cn } from '@/lib/utils'
import { cardShell as cardShellBase } from '@/lib/card-shell'

/** Altura cómoda en modal (tablet / dedo) — evita campos “apretados” verticalmente */
const inputComfort = 'min-h-11 px-3 py-2.5 text-sm'

const inputBase =
  'rounded-lg border border-zinc-300 bg-white text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/25'

const cardShell = cn(cardShellBase, 'shadow-none')

/** Títulos de sección — alineados a detalle de factura / marca */
const sectionTitleClass =
  'flex items-center gap-1.5 text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-50'

const iconSection = 'h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400'

/** Cabecera: padding solo en bloque interno + regleta full-bleed (cierra con el borde del card) */
const modalSectionHeaderClass = 'flex flex-col space-y-0 p-0'
const modalSectionHeaderInnerClass = 'space-y-1 px-4 pb-3 pt-4'
const modalSectionDividerClass = 'h-px w-full shrink-0 bg-zinc-200 dark:bg-zinc-800'

const cardBodyCompact = 'space-y-4 p-4'

interface CreditModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCredit: (credit: Credit) => void
}

export function CreditModal({ isOpen, onClose, onCreateCredit }: CreditModalProps) {
  const { clients, getAllClients } = useClients()
  const { products, searchProducts } = useProducts()
  const { user } = useAuth()
  
  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas (ZonaT, Zonat, Corozal, Sahagun, etc.)
    const storeKeywords = ['casa artesanal', 'casaartesanal', 'corozal', 'sahagun', 'sincelejo']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  // Filtrar clientes para excluir tiendas
  const filteredClients = clients.filter(client => !isStoreClient(client))
  
  const [formData, setFormData] = useState({
    clientId: '',
    dueDate: '',
    notes: ''
  })

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stockAlert, setStockAlert] = useState<{show: boolean, message: string, productId?: string}>({show: false, message: ''})
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [includeTax, setIncludeTax] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<number>(-1)
  const productRefs = useRef<(HTMLDivElement | null)[]>([])
  /** Solo al navegar con teclado: evita que scrollIntoView luche con el scroll del mouse en el listado */
  const scrollHighlightFromKeyboardRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!scrollHighlightFromKeyboardRef.current) return
    scrollHighlightFromKeyboardRef.current = false
    if (highlightedProductIndex >= 0 && productRefs.current[highlightedProductIndex]) {
      productRefs.current[highlightedProductIndex]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [highlightedProductIndex])

  useEffect(() => {
    if (isOpen) {
      getAllClients()
    }
  }, [isOpen, getAllClients])

  useEffect(() => {
    if (formData.clientId) {
      const client = filteredClients.find(c => c.id === formData.clientId) || clients.find(c => c.id === formData.clientId)
      setSelectedClient(client || null)
    }
  }, [formData.clientId, clients, filteredClients])

  // Sincronizar selectedDate con formData.dueDate
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      setFormData(prev => ({ ...prev, dueDate: `${year}-${month}-${day}` }))
    }
  }, [selectedDate])

  // Debounce para la búsqueda de productos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 800)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Buscar productos cuando el usuario escriba
  useEffect(() => {
    let cancelled = false
    
    const performSearch = async () => {
      if (debouncedProductSearch.trim().length >= 2) {
        setIsSearchingProducts(true)
        try {
          const results = await searchProducts(debouncedProductSearch)
          if (!cancelled) {
            setSearchedProducts(results)
          }
        } catch (error) {
      // Error silencioso en producción
          if (!cancelled) {
            setSearchedProducts([])
            setIsSearchingProducts(false)
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
  }, [debouncedProductSearch])

  // Filtrar productos — memoizado para no recrear el array en cada render (evitaba resetear el resaltado al primer ítem)
  const filteredProducts = useMemo(() => {
    if (debouncedProductSearch.trim().length >= 2 && searchedProducts.length > 0) {
      return searchedProducts
    }
    if (debouncedProductSearch.trim().length >= 2 && searchedProducts.length === 0 && !isSearchingProducts) {
      return []
    }
    return products
      .filter(product => {
        if (!product || product.status !== 'active') return false
        const searchTerm = debouncedProductSearch.toLowerCase().trim()
        const name = (product.name || '').toLowerCase()
        const reference = (product.reference || '').toLowerCase()
        return name.includes(searchTerm) || reference.includes(searchTerm)
      })
      .sort((a, b) => {
        const searchTermLower = debouncedProductSearch.toLowerCase()
        const aRef = (a.reference || '').toLowerCase()
        const bRef = (b.reference || '').toLowerCase()
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()

        if (aRef === searchTermLower && bRef !== searchTermLower) return -1
        if (aRef !== searchTermLower && bRef === searchTermLower) return 1

        if (aRef.startsWith(searchTermLower) && !bRef.startsWith(searchTermLower)) return -1
        if (!aRef.startsWith(searchTermLower) && bRef.startsWith(searchTermLower)) return 1

        if (aName.startsWith(searchTermLower) && !bName.startsWith(searchTermLower)) return -1
        if (!aName.startsWith(searchTermLower) && bName.startsWith(searchTermLower)) return 1

        return 0
      })
  }, [debouncedProductSearch, searchedProducts, isSearchingProducts, products])

  const visibleProducts = useMemo(() => filteredProducts.slice(0, 10), [filteredProducts])

  const visibleProductIdsKey = useMemo(
    () => visibleProducts.map(p => p.id).join('|'),
    [visibleProducts]
  )

  // Limpiar referencias cuando cambia el listado mostrado
  useEffect(() => {
    productRefs.current = []
  }, [visibleProductIdsKey])

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
  }, [showProductDropdown, visibleProductIdsKey])

  const addProduct = (product: Product) => {
    const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
    
    // No agregar productos sin stock
    if (totalStock <= 0) {
      showStockAlert(`No puedes agregar "${product.name}" porque no tiene stock disponible. Stock: ${totalStock}`, product.id)
      return
    }
    
    const existingItem = selectedProducts.find(item => item.productId === product.id)
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1
      if (newQuantity > totalStock) {
        showStockAlert(`No puedes agregar más de "${product.name}". Stock disponible: ${totalStock}`, product.id)
        return
      }
      // Mover el producto actualizado al principio (más reciente)
      setSelectedProducts(prev => {
        const updated = prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: newQuantity, totalPrice: (item.unitPrice || 0) * newQuantity }
            : item
        )
        const updatedItem = updated.find(item => item.productId === product.id)
        const otherItems = updated.filter(item => item.productId !== product.id)
        return updatedItem ? [updatedItem, ...otherItems] : updated
      })
    } else {
      // Agregar nuevos productos al principio (más recientes primero)
      setSelectedProducts(prev => [{
        productId: product.id,
        productName: product.name,
        productReferenceCode: product.reference || undefined,
        quantity: 1,
        unitPrice: product.price || 0,
        totalPrice: product.price || 0
      }, ...prev])
    }
    
    setProductSearch('')
    setShowProductDropdown(false)
    setHighlightedProductIndex(-1)
    // Limpiar referencias
    productRefs.current = []
  }

  const removeProduct = (productId: string) => {
    // Si el producto que se está quitando tiene una alerta activa, ocultarla
    if (stockAlert.show && stockAlert.productId === productId) {
      setStockAlert({ show: false, message: '', productId: undefined })
    }
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number, fromButton: boolean = false) => {
    // No eliminar el producto aunque la cantidad sea 0, solo actualizar
    // Permitir escribir 0, pero no valores negativos
    if (newQuantity < 0) {
      return
    }
    
    const product = products.find(p => p.id === productId)
    if (product) {
      const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
      // Verificar stock solo si la cantidad es mayor a 0
      if (newQuantity > 0 && newQuantity > totalStock) {
        showStockAlert(`No hay suficiente stock para "${product.name}". Stock disponible: ${totalStock}`, productId)
        return
      }
    }
    
    // Mover el producto actualizado al principio (más reciente)
    setSelectedProducts(prev => {
      const updated = prev.map(item => 
        item.productId === productId 
          ? { 
              ...item, 
              quantity: newQuantity,
              totalPrice: (item.unitPrice || 0) * newQuantity
            }
          : item
      )
      const updatedItem = updated.find(item => item.productId === productId)
      const otherItems = updated.filter(item => item.productId !== productId)
      return updatedItem ? [updatedItem, ...otherItems] : updated
    })
  }

  const handleQuantityBlur = (productId: string) => {
    // Ya no restauramos a 1, permitimos que quede en 0
    // El producto se mantiene en la lista aunque tenga cantidad 0
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
        scrollHighlightFromKeyboardRef.current = true
        setHighlightedProductIndex(nextIndex)
        return
      }
    }

    scrollHighlightFromKeyboardRef.current = true
    setHighlightedProductIndex(nextIndex === -1 ? 0 : nextIndex)
  }

  const handleProductSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
          addProduct(product)
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setShowProductDropdown(false)
      setHighlightedProductIndex(-1)
    }
  }

  const updatePrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return

    // Permitir escribir libremente, la validación se hará al perder el foco
    // Mover el producto actualizado al principio (más reciente)
    setSelectedProducts(prev => {
      const updated = prev.map(item => {
        if (item.productId === productId) {
          return { ...item, unitPrice: newPrice, totalPrice: newPrice * (item.quantity || 0) }
        }
        return item
      })
      const updatedItem = updated.find(item => item.productId === productId)
      const otherItems = updated.filter(item => item.productId !== productId)
      return updatedItem ? [updatedItem, ...otherItems] : updated
    })
  }

  const handlePriceBlur = (productId: string) => {
    // Validar precio al perder el foco y mostrar alerta si es inválido
    const item = selectedProducts.find(i => i.productId === productId)
    if (item) {
      const product = products.find(p => p.id === productId)
      if (!product) return
      
      // Precio mínimo: siempre el costo de adquisición (en Sincelejo y microtiendas)
      const minPrice = product.cost || 0
      const priceType = 'costo de adquisición'
      
      // Si el precio es menor al mínimo, mostrar alerta
      if (item.unitPrice < minPrice) {
        showStockAlert(`${item.productName} no puede ser vendido por menos de $${minPrice.toLocaleString('es-CO')} (${priceType})`, productId)
      } else {
        // Si el precio es válido, ocultar la alerta para este producto
        if (stockAlert.show && stockAlert.productId === productId) {
          setStockAlert({ show: false, message: '', productId: undefined })
        }
      }
    }
  }

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce((total, item) => total + item.totalPrice, 0)
    const tax = includeTax ? subtotal * 0.19 : 0
    return subtotal + tax
  }

  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => total + item.totalPrice, 0)
  }

  const calculateTax = () => {
    return includeTax ? calculateSubtotal() * 0.19 : 0
  }

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault()
    
    if (!formData.clientId) {
      showStockAlert('❌ Por favor selecciona un cliente')
      return
    }
    
    // Solo validar fecha de vencimiento si NO es borrador
    if (!isDraft && !formData.dueDate) {
      showStockAlert('❌ Por favor selecciona una fecha de vencimiento')
      return
    }
    
    if (selectedProducts.length === 0) {
      showStockAlert('❌ Por favor agrega al menos un producto')
      return
    }
    
    // Validar que todos los precios de venta sean >= costo de adquisición (en Sincelejo y microtiendas)
    const invalidProducts: string[] = []
    selectedProducts.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return
      
      // Precio mínimo: siempre el costo de adquisición (en Sincelejo y microtiendas)
      const minPrice = product.cost || 0
      const priceType = 'costo de adquisición'
      
      if (item.unitPrice < minPrice) {
        invalidProducts.push(`${item.productName} no puede ser vendido por menos de $${minPrice.toLocaleString('es-CO')} (${priceType})`)
      }
    })

    if (invalidProducts.length > 0) {
      showStockAlert(invalidProducts.join(' • '))
      return
    }
    
    setLoading(true)
    
    try {
      // Obtener información del cliente
      const client = filteredClients.find(c => c.id === formData.clientId) || clients.find(c => c.id === formData.clientId)
      if (!client) {
        alert('❌ Cliente no encontrado')
        return
      }
      
      // Preparar los items para la venta
      const saleItems = selectedProducts.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productReferenceCode: item.productReferenceCode || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
        discount: 0,
        discountType: 'amount',
        tax: 0
      }))
      
      // Crear la venta
      const saleData = {
        clientId: formData.clientId,
        clientName: client.name,
        items: saleItems,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: 0,
        status: isDraft ? 'draft' : 'completed',
        paymentMethod: 'credit',
        notes: formData.notes,
        dueDate: formData.dueDate
      }
      
      // Crear la venta
      const newSale = await SalesService.createSale(saleData, user?.id || '')
      
      // Si NO es borrador, obtener el crédito creado automáticamente por el SalesService
      if (!isDraft) {
        const newCredit = await CreditsService.getCreditByInvoiceNumber(newSale.invoiceNumber)
        
        if (!newCredit) {
          throw new Error('No se pudo encontrar el crédito creado')
        }
        
        onCreateCredit(newCredit)
        handleClose()
      } else {
        // Si es borrador, cerrar el modal y redirigir a ventas para ver el borrador
        handleClose()
        // Redirigir a la página de ventas después de un breve delay
        setTimeout(() => {
          window.location.href = '/sales'
        }, 500)
      }
      
    } catch (error) {
      // Error silencioso en producción
      alert('❌ Error al crear el crédito. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      clientId: '',
      dueDate: '',
      notes: ''
    })
    setSelectedClient(null)
    setSelectedProducts([])
    setProductSearch('')
    setShowProductDropdown(false)
    setSelectedDate(null)
    setIncludeTax(false)
    setStockAlert({show: false, message: ''})
  }

  const showStockAlert = (message: string, productId?: string) => {
    setStockAlert({show: true, message, productId})
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setStockAlert({show: false, message: ''})
    }, 4000)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  /* Portal + z-[100]: sobre el main; xl:left-56 = no tapar el sidebar fijo (solo ≥ xl, como main xl:ml-56). */
  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-3 xl:left-56">
      <div className="flex h-[min(92dvh,calc(100dvh-0.75rem))] w-full min-w-0 max-w-[min(1600px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/50 via-white to-zinc-50 shadow-2xl dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/95 via-white to-violet-50/70 px-3 py-2.5 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/25 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 dark:border-indigo-700/50 dark:bg-indigo-950/50">
              <CreditCard className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                Crear Venta a Crédito
              </h2>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                Crea una nueva venta a crédito y registra el crédito correspondiente.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="scrollbar-hide min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Sin overflow-x-hidden aquí: recorta el borde derecho de cards/select en la columna lateral. */}
          {/* Misma rejilla que /sales/new: 1 col en móvil; desde tablet productos 2/3 izq., cliente + crédito + resumen 1/3 der. */}
          <div className="grid min-w-0 grid-cols-1 gap-4 p-2.5 pr-3 sm:p-3 sm:pr-4 md:grid-cols-3 md:gap-4 md:items-start md:pr-4">
            {/* Columna izquierda — Productos (2/3) */}
            <div className="min-w-0 space-y-4 md:col-span-2 md:flex md:min-h-0 md:flex-col md:h-[min(calc(92dvh-7.5rem),900px)]">
              <Card className={cn(cardShell, 'min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden')}>
              <CardHeader className={modalSectionHeaderClass}>
                <div className={modalSectionHeaderInnerClass}>
                  <CardTitle className={sectionTitleClass}>
                    <Package className={iconSection} strokeWidth={1.5} />
                    Productos
                  </CardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Busca por nombre o referencia (búsqueda amplia desde 2 caracteres).
                  </p>
                </div>
                <div className={modalSectionDividerClass} aria-hidden />
              </CardHeader>
              <CardContent className={cn(cardBodyCompact, 'flex min-h-0 flex-1 flex-col md:pt-5')}>
                <div className="relative z-10 shrink-0">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500 dark:text-violet-400"
                      aria-hidden
                    />
                    <input
                      type="text"
                      placeholder="Nombre o referencia…"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowProductDropdown(e.target.value.length > 0)
                      }}
                      onKeyDown={handleProductSearchKeyDown}
                      className={cn(
                        'min-h-11 w-full py-2.5 pl-12 pr-3 text-sm',
                        inputBase
                      )}
                      aria-label="Buscar producto por nombre o referencia"
                    />
                    
                    {showProductDropdown && productSearch && (
                    <div className="scrollbar-hide absolute left-0 right-0 top-full z-[100] mt-1 max-h-[min(16rem,50dvh)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 md:max-h-80">
                      {isSearchingProducts ? (
                        <div className="p-4 text-center">
                          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-brand-600 dark:border-zinc-600 dark:border-t-brand-500" />
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Buscando productos...</div>
                        </div>
                      ) : visibleProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                          No se encontraron productos
                        </div>
                      ) : (
                        visibleProducts.map((product, index) => {
                          const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
                          const hasStock = totalStock > 0
                          const isHighlighted = highlightedProductIndex === index

                          const containerClasses = [
                            'p-2',
                            'border-b border-zinc-100 last:border-b-0 dark:border-zinc-800',
                            'rounded-lg',
                            'transition-colors duration-150 ease-in-out',
                            hasStock ? 'cursor-pointer' : 'cursor-not-allowed',
                            isHighlighted && hasStock
                              ? 'border border-brand-400/35 bg-brand-500/[0.08] dark:border-brand-500/35 dark:bg-brand-500/[0.12]'
                              : hasStock
                                ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80'
                                : 'border border-red-200/60 bg-red-50 dark:border-red-800/50 dark:bg-red-950/25'
                          ].join(' ')

                          const nameClasses = [
                            'font-medium',
                            isHighlighted && hasStock
                              ? 'text-brand-900 dark:text-brand-100'
                              : hasStock
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-red-800 dark:text-red-200'
                          ].join(' ')

                          const detailsClasses = [
                            'mt-0.5 text-sm',
                            isHighlighted && hasStock
                              ? 'text-brand-800/90 dark:text-brand-300/90'
                              : hasStock
                                ? 'text-zinc-600 dark:text-zinc-400'
                                : 'text-red-600 dark:text-red-400'
                          ].join(' ')
                          
                          return (
                        <div
                          key={product.id}
                          ref={(el) => {
                            productRefs.current[index] = el
                          }}
                          onClick={() => hasStock ? addProduct(product) : undefined}
                          onMouseEnter={() => setHighlightedProductIndex(index)}
                          className={cn(containerClasses, 'min-w-0')}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className={nameClasses}>
                                {product.name}
                              </div>
                              <div className={cn(detailsClasses, 'break-words')}>
                                Ref: {product.reference || 'N/A'} · Stock: {(product.stock?.warehouse || 0) + (product.stock?.store || 0)} · ${(product.price || 0).toLocaleString('es-CO')}
                              </div>
                            </div>
                            {!hasStock && (
                              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border border-red-200 dark:border-red-700/50">
                                Sin stock
                              </span>
                            )}
                          </div>
                        </div>
                      )})
                      )}
                    </div>
                    )}
                  </div>
                </div>
                
                {selectedProducts.length > 0 && (
                  <div className="scrollbar-hide mt-2 min-h-0 min-w-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[min(12rem,28vh)] sm:max-h-52 md:mt-3 md:max-h-none md:min-h-[12rem]">
                    {selectedProducts.map((item) => {
                      const product = products.find(p => p.id === item.productId)
                      const warehouseStock = product?.stock?.warehouse || 0
                      const localStock = product?.stock?.store || 0
                      const reference = item.productReferenceCode || product?.reference || 'N/A'
                      
                      return (
                      <div key={item.productId} className="min-w-0 space-y-3 overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                        <div className="flex min-w-0 items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="break-words font-medium text-zinc-900 dark:text-zinc-100">
                              {item.productName}
                            </div>
                            <div className="break-words text-xs text-zinc-600 dark:text-zinc-400">
                              Ref: {reference} | Bodega: {warehouseStock} | Local: {localStock}
                            </div>
                          </div>
                        </div>
                        
                        {/* Controles de precio y cantidad */}
                        <div className="flex min-w-0 flex-wrap items-end gap-3">
                          <div className="min-w-0 flex-1">
                            <label className="mb-2 block text-xs text-zinc-600 dark:text-zinc-400">
                              Precio de venta
                            </label>
                            <input
                              type="text"
                              value={item.unitPrice ? item.unitPrice.toLocaleString('es-CO') : ''}
                              onChange={(e) => {
                                const cleanValue = e.target.value.replace(/\./g, '')
                                const numericValue = parseFloat(cleanValue) || 0
                                updatePrice(item.productId, numericValue)
                              }}
                              onBlur={() => handlePriceBlur(item.productId)}
                              className={cn('min-h-10 w-full px-3 py-2 text-sm', inputBase)}
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <label className="mb-2 block text-xs text-zinc-600 dark:text-zinc-400">
                              Cantidad
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1, true)}
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 shrink-0 p-0"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                  updateQuantity(item.productId, value, false)
                                }}
                                onBlur={() => handleQuantityBlur(item.productId)}
                                className={cn('h-9 w-14 text-center text-sm', inputBase)}
                                min="0"
                              />
                              <Button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1, true)}
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 shrink-0 p-0"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex shrink-0">
                            <Button
                              onClick={() => removeProduct(item.productId)}
                              size="sm"
                              variant="outline"
                              className="h-9 min-w-9 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                              title="Quitar línea"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Total del producto */}
                        {item.totalPrice > 0 && (
                          <div className="flex min-w-0 items-center justify-between gap-2 border-t border-zinc-200 pt-1 dark:border-zinc-700">
                            <span className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">Total:</span>
                            <span className="min-w-0 break-all text-right font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                              ${item.totalPrice.toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}

                {/* Alerta sutil de stock */}
                {stockAlert.show && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-red-300/80 bg-red-50 p-2 dark:border-red-700/60 dark:bg-red-950/40">
                    <div className="flex min-w-0 items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                      <div className="min-w-0 break-words text-xs font-medium text-red-800 dark:text-red-200">
                        {stockAlert.message}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Columna derecha — scroll vertical sin recortar bordes en X */}
            <div className="min-w-0 space-y-4 md:col-span-1 md:max-h-[min(calc(92dvh-7.5rem),900px)] md:overflow-y-auto md:scrollbar-hide">
              <Card className={cn(cardShell, 'min-w-0')}>
              <CardHeader className={modalSectionHeaderClass}>
                <div className={modalSectionHeaderInnerClass}>
                  <CardTitle className={sectionTitleClass}>
                    <User className={iconSection} strokeWidth={1.5} />
                    Cliente
                  </CardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Quién recibe la venta a crédito.</p>
                </div>
                <div className={modalSectionDividerClass} aria-hidden />
              </CardHeader>
              <CardContent className={cn(cardBodyCompact, 'min-w-0')}>
                <div className="min-w-0 w-full">
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className={cn(
                      inputComfort,
                      inputBase,
                      'box-border w-full min-w-0 max-w-full'
                    )}
                    aria-label="Cliente obligatorio"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {filteredClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}{client.email ? ` - ${client.email}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedClient && (
                  <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-3 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950/40">
                    <div className="text-zinc-600 dark:text-zinc-400">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {selectedClient.name}
                      </div>
                      <div>{selectedClient.email}</div>
                      <div>{selectedClient.phone}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

              <Card className={cn(cardShell, 'min-w-0')}>
                <CardHeader className={modalSectionHeaderClass}>
                  <div className={modalSectionHeaderInnerClass}>
                    <CardTitle className={sectionTitleClass}>
                      <Calendar className={iconSection} strokeWidth={1.5} />
                      Configuración del crédito
                    </CardTitle>
                  </div>
                  <div className={modalSectionDividerClass} aria-hidden />
                </CardHeader>
                <CardContent className={cn(cardBodyCompact, 'min-w-0')}>
                  <div>
                    <DatePicker
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      placeholder="Seleccionar fecha de vencimiento"
                      className="w-full"
                      minDate={new Date()}
                      ariaLabel="Fecha de vencimiento del crédito"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notas sobre la venta…"
                      rows={3}
                      className={cn('min-h-[5.5rem] w-full resize-y px-3 py-2.5 text-sm leading-relaxed', inputBase)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(cardShell, 'min-w-0')}>
                <CardHeader className={modalSectionHeaderClass}>
                  <div className={modalSectionHeaderInnerClass}>
                    <CardTitle className={sectionTitleClass}>
                      <DollarSign className={iconSection} strokeWidth={1.5} />
                      Resumen de la Venta
                    </CardTitle>
                  </div>
                  <div className={modalSectionDividerClass} aria-hidden />
                </CardHeader>
                <CardContent className={cn(cardBodyCompact, 'min-w-0')}>
                  {selectedProducts.length === 0 ? (
                    <p className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Selecciona productos para ver el resumen
                    </p>
                  ) : (
                    <div className="min-w-0 space-y-2">
                      <div className="scrollbar-hide max-h-40 space-y-1.5 overflow-y-auto overflow-x-hidden sm:max-h-48 md:max-h-64">
                        {selectedProducts.map((item) => (
                          <div key={item.productId} className="flex min-w-0 items-start justify-between gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                {item.productName}
                              </div>
                              <div className="break-words text-xs text-zinc-600 dark:text-zinc-400">
                                {item.quantity} x ${item.unitPrice.toLocaleString('es-CO')}
                              </div>
                            </div>
                            <div className="min-w-0 max-w-[min(12rem,45%)] text-right font-medium tabular-nums break-all text-zinc-900 dark:text-zinc-100">
                              ${item.totalPrice.toLocaleString('es-CO')}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                        <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                          <span className="shrink-0 text-zinc-600 dark:text-zinc-400">Subtotal</span>
                          <span className="min-w-0 break-all text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            ${calculateSubtotal().toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={includeTax}
                            onChange={(e) => setIncludeTax(e.target.checked)}
                            className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 bg-white text-brand-600 focus:ring-2 focus:ring-brand-500/40 dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <span className="text-xs text-zinc-700 dark:text-zinc-300">Incluir IVA (19%)</span>
                        </div>
                        {includeTax && (
                          <span className="min-w-0 break-all text-right text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                            ${calculateTax().toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>

                      <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="shrink-0 text-base font-bold text-zinc-900 dark:text-zinc-50">Total</span>
                          <span className="min-w-0 break-all text-right text-base font-bold tabular-nums text-brand-700 dark:text-brand-400">
                            ${calculateTotal().toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2 border-t border-indigo-100/80 bg-white/95 px-3 py-2.5 backdrop-blur-sm dark:border-indigo-900/40 dark:bg-zinc-950/95 sm:px-4"
          style={{
            paddingBottom: `max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))`
          }}
        >
          <Button type="button" onClick={handleClose} variant="outline" size="sm">
            Cancelar
          </Button>
          {/* Botón de borrador comentado
          <Button
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading || selectedProducts.length === 0 || !formData.clientId}
            className="bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </div>
            ) : (
              'Guardar como Borrador'
            )}
          </Button>
          */}
          <Button
            size="sm"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading || selectedProducts.length === 0 || !formData.clientId || !formData.dueDate}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-100" />
                Creando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" strokeWidth={1.5} />
                Crear Venta a Crédito
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}