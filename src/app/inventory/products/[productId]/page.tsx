'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Edit,
  Trash2,
  ArrowRightLeft,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Pause,
  Warehouse,
  Store,
  Boxes,
  Hash,
  ImageIcon,
  ExternalLink,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Product } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { useCategories } from '@/contexts/categories-context'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { useProducts } from '@/contexts/products-context'
import { getCurrentUserStoreId, isStoreSincelejo } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { StockAdjustmentModal } from '@/components/products/stock-adjustment-modal'
import { StockTransferModal } from '@/components/products/stock-transfer-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'

const panel =
  'rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50'

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'

type ProductDetailEditDraft = {
  name: string
  reference: string
  description: string
  price: number
  cost: number
  categoryId: string
  brand: string
  status: Product['status']
  imageUrl: string | null
}

function draftFromProduct(p: Product): ProductDetailEditDraft {
  return {
    name: p.name || '',
    reference: p.reference || '',
    description: p.description || '',
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    categoryId: p.categoryId || '',
    brand: p.brand || '',
    status: p.status,
    imageUrl: p.imageUrl?.trim() || null,
  }
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40',
        className
      )}
    >
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.productId as string
  const { categories } = useCategories()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const { products: catalogProducts, refreshProducts } = useProducts()
  
  // Verificación adicional: si es vendedor, no puede editar/eliminar productos
  const userRole = user?.role?.toLowerCase() || ''
  const isVendedor = userRole === 'vendedor'
  const isInventario = userRole === 'inventario'
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'Super Admin' || user?.role === 'Super Administrador'

  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const isMainStore = !user?.storeId || user?.storeId === MAIN_STORE_ID

  // Solo en Sincelejo: Inventario o Super Admin pueden hacer acciones; en microtiendas todos solo ven
  const [isSincelejoStore, setIsSincelejoStore] = useState(false)
  useEffect(() => {
    const load = async () => {
      const storeId = getCurrentUserStoreId() || MAIN_STORE_ID
      const store = storeId === MAIN_STORE_ID
        ? await StoresService.getMainStore()
        : await StoresService.getStoreById(storeId)
      setIsSincelejoStore(isStoreSincelejo(store))
    }
    if (user) load()
  }, [user?.storeId])

  const canDoProductActionsSincelejo = isSincelejoStore && (isInventario || isSuperAdmin)
  const canEdit = isVendedor ? false : ((canDoProductActionsSincelejo || isSuperAdmin) && hasPermission('products', 'edit'))
  const canAdjust = isVendedor ? false : ((canDoProductActionsSincelejo || isSuperAdmin) && hasPermission('products', 'edit'))
  const canDelete = isVendedor ? false : (canDoProductActionsSincelejo && hasPermission('products', 'delete'))
  const canTransfer = isVendedor ? false : (canDoProductActionsSincelejo && hasPermission('products', 'edit'))
  
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProductDetailEditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const catalogFileInputRef = useRef<HTMLInputElement>(null)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    if (productId) {
      loadProduct()
    } else {
      setIsLoading(false)
    }
  }, [productId])

  const loadProduct = async () => {
    try {
      setIsLoading(true)
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading product')), 10000)
      })

      const productData = (await Promise.race([ProductsService.getProductById(productId), timeoutPromise])) as Product | null

      if (productData) {
        setProduct(productData)
        setIsLoading(false)
      } else {
        setIsLoading(false)
        toast.error('Producto no encontrado')
        router.push('/inventory/products')
      }
    } catch {
      setIsLoading(false)
      toast.error('Error al cargar el producto. Por favor, intenta de nuevo.')
    }
  }

  const beginEdit = () => {
    if (!product) return
    setDraft(draftFromProduct(product))
    setEditErrors({})
    setUploadPreview(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setEditErrors({})
    setUploadPreview(null)
  }

  const validateDraft = (d: ProductDetailEditDraft, currentProductId: string) => {
    const err: Record<string, string> = {}
    if (!d.name.trim()) err.name = 'El nombre es requerido'
    if (!d.reference.trim()) err.reference = 'La referencia es requerida'
    else if (
      catalogProducts.some(
        (p) =>
          p.id !== currentProductId &&
          p.reference.toLowerCase() === d.reference.trim().toLowerCase()
      )
    ) {
      err.reference = 'Esta referencia ya existe en otro producto'
    }
    if (d.price <= 0) err.price = 'El precio debe ser mayor a 0'
    if (d.cost < 0) err.cost = 'El costo no puede ser negativo'
    return err
  }

  const handleCatalogImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setUploadPreview(blobUrl)
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/storage/upload-product-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al subir')
      const url = typeof json.url === 'string' ? json.url.trim() : ''
      if (!url) throw new Error('El servidor no devolvió la URL de la imagen')
      setDraft((prev) => (prev ? { ...prev, imageUrl: url } : null))
      toast.success('Imagen del catálogo lista — guarda los cambios para aplicar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const saveEdit = async () => {
    if (!product || !draft) return
    const err = validateDraft(draft, product.id)
    setEditErrors(err)
    if (Object.keys(err).length > 0) return

    setSaving(true)
    try {
      const success = await ProductsService.updateProduct(
        product.id,
        {
          name: draft.name.trim(),
          reference: draft.reference.trim(),
          description: draft.description.trim(),
          price: draft.price,
          cost: draft.cost,
          categoryId: draft.categoryId,
          brand: draft.brand.trim(),
          status: draft.status,
          imageUrl: draft.imageUrl?.trim() || null,
        },
        user?.id
      )

      if (success) {
        toast.success('Producto actualizado')
        setEditing(false)
        setDraft(null)
        await loadProduct()
        await refreshProducts(undefined, { silent: true })
      } else {
        toast.error('No se pudo guardar. Revisa los datos e intenta de nuevo.')
      }
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!product) return
    
    try {
      console.log('[PRODUCT DETAIL] Starting product deletion:', {
        productId: product.id,
        userId: user?.id
      })
      
      const result = await ProductsService.deleteProduct(product.id, user?.id)
      
      console.log('[PRODUCT DETAIL] Product deletion result:', result)
      
      if (result.success) {
        toast.success('Producto eliminado exitosamente')
        router.push('/inventory/products')
      } else {
        toast.error(result.error || 'Error eliminando producto')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception deleting product:', error)
      toast.error('Error eliminando producto. Por favor, intenta nuevamente.')
    }
  }

  const handleStockAdjustment = () => {
    setIsAdjustmentModalOpen(true)
  }

  const handleAdjustStock = async (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => {
    try {
      console.log('[PRODUCT DETAIL] Starting stock adjustment:', {
        productId,
        location,
        newQuantity,
        reason,
        userId: user?.id
      })
      
      const success = await ProductsService.adjustStock(productId, location, newQuantity, reason, user?.id)
      
      console.log('[PRODUCT DETAIL] Stock adjustment result:', success)
      
      if (success) {
        toast.success('Stock ajustado exitosamente')
        setIsAdjustmentModalOpen(false)
        try {
          await loadProduct()
        } catch (loadError) {
          console.error('[PRODUCT DETAIL] Error reloading product after adjustment:', loadError)
          toast.error('Stock actualizado pero hubo un error al recargar. Por favor, recarga la página.')
        }
      } else {
        toast.error('No se guardaron los cambios', {
          description:
            'No pudimos confirmar el ajuste en el servidor. Revisa tu conexión o permisos e inténtalo de nuevo.',
        })
        // No cerrar el modal si hay error para que el usuario pueda intentar de nuevo
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception adjusting stock:', error)
      toast.error('No se guardaron los cambios', {
        description: 'Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.',
      })
      // No cerrar el modal si hay error
    }
  }

  const handleStockTransfer = () => {
    setIsTransferModalOpen(true)
  }

  const handleTransferStock = async (transferData: Omit<any, 'id' | 'createdAt' | 'userId' | 'userName'>) => {
    try {
      console.log('[PRODUCT DETAIL] Starting stock transfer:', {
        productId: transferData.productId,
        fromLocation: transferData.fromLocation,
        toLocation: transferData.toLocation,
        quantity: transferData.quantity,
        userId: user?.id
      })
      
      const success = await ProductsService.transferStock(
        transferData.productId,
        transferData.fromLocation,
        transferData.toLocation,
        transferData.quantity,
        user?.id
      )
      
      console.log('[PRODUCT DETAIL] Stock transfer result:', success)
      
      if (success) {
        toast.success('Stock transferido exitosamente')
        setIsTransferModalOpen(false)
        // Esperar un momento antes de recargar para asegurar que la actualización se complete
        setTimeout(async () => {
          try {
            await loadProduct()
          } catch (loadError) {
            console.error('[PRODUCT DETAIL] Error reloading product after transfer:', loadError)
            toast.error('Stock transferido pero hubo un error al recargar. Por favor, recarga la página.')
          }
        }, 500)
      } else {
        toast.error('Error transfiriendo stock. Por favor, verifica los datos e intenta nuevamente.')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception transferring stock:', error)
      toast.error('Error transfiriendo stock. Por favor, intenta nuevamente.')
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Sin categoría'
  }

  const getProductStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
      case 'inactive':
        return 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
      case 'discontinued':
        return 'border-rose-500/25 bg-rose-500/[0.06] text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300/90'
      case 'out_of_stock':
        return 'border-amber-500/25 bg-amber-500/[0.06] text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300/90'
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle
      case 'inactive':
        return Pause
      case 'discontinued':
        return XCircle
      case 'out_of_stock':
        return AlertTriangle
      default:
        return CheckCircle
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'discontinued':
        return 'Descontinuado'
      case 'out_of_stock':
        return 'Sin Stock'
      default:
        return status
    }
  }

  const getStockStatusLabel = (product: Product) => {
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

  const getStockStatusBadgeClass = (product: Product) => {
    const { warehouse, store, total } = product.stock

    if (total === 0) {
      return 'border-rose-500/25 bg-rose-500/[0.06] text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300/90'
    }

    if (store > 0) {
      if (store >= 10) {
        return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
      }
      if (store >= 5) {
        return 'border-amber-500/25 bg-amber-500/[0.06] text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300/90'
      }
      return 'border-orange-500/25 bg-orange-500/[0.06] text-orange-950 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-300/90'
    }

    if (warehouse > 0) {
      return 'border-sky-500/25 bg-sky-500/[0.06] text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300/90'
    }

    return 'border-rose-500/25 bg-rose-500/[0.06] text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300/90'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <RoleProtectedRoute module="products" requiredAction="view">
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 md:py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-b-zinc-600 dark:border-zinc-800 dark:border-b-zinc-300" />
        </div>
      </RoleProtectedRoute>
    )
  }

  if (!product) {
    return null
  }

  const displayProduct = editing && draft ? { ...product, ...draft, stock: product.stock } : product
  const StatusIcon = getStatusIcon(displayProduct.status)

  return (
    <RoleProtectedRoute module="products" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
        <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:py-5 md:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Ficha del producto
              </p>
              {editing && draft ? (
                <>
                  <label htmlFor="detail-product-name" className="sr-only">
                    Nombre
                  </label>
                  <input
                    id="detail-product-name"
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : null))}
                    className={cn(
                      inputClass,
                      'mt-2 text-lg font-semibold',
                      editErrors.name && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50'
                    )}
                    placeholder="Nombre del producto"
                  />
                  {editErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.name}</p>}
                  <label htmlFor="detail-product-ref" className="sr-only">
                    Referencia
                  </label>
                  <input
                    id="detail-product-ref"
                    type="text"
                    value={draft.reference}
                    onChange={(e) => setDraft((d) => (d ? { ...d, reference: e.target.value } : null))}
                    className={cn(
                      inputClass,
                      'font-mono text-sm',
                      editErrors.reference && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50'
                    )}
                    placeholder="Referencia"
                  />
                  {editErrors.reference && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.reference}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Categoría y demás datos en la sección inferior.
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                      {product.name}
                    </h1>
                    {product.status === 'active' && (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-zinc-600 dark:text-zinc-300">{product.reference}</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{getCategoryName(product.categoryId)}</p>
                </>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'inline-flex items-center gap-1 border px-2.5 py-0.5 text-[11px] font-normal whitespace-nowrap',
                    getStockStatusBadgeClass(product)
                  )}
                >
                  {getStockStatusLabel(product)}
                </Badge>
                {displayProduct.status !== 'active' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'inline-flex items-center gap-1 border px-2.5 py-0.5 text-[11px] font-normal',
                      getProductStatusBadgeClass(displayProduct.status)
                    )}
                  >
                    <StatusIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    {getStatusLabel(displayProduct.status)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/inventory/products')}
                className="flex-1 sm:flex-none"
                disabled={saving}
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                Volver
              </Button>
              {canEdit && editing && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={saveEdit} disabled={saving} className="flex-1 sm:flex-none">
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </>
              )}
              {canEdit && !editing && (
                <Button type="button" size="sm" variant="outline" onClick={beginEdit} className="flex-1 sm:flex-none">
                  <Edit className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Editar
                </Button>
              )}
              {canAdjust && !editing && (
                <Button type="button" size="sm" variant="outline" onClick={handleStockAdjustment} className="flex-1 sm:flex-none">
                  <Package className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Ajustar
                </Button>
              )}
              {canTransfer && !editing && (
                <Button type="button" size="sm" variant="outline" onClick={handleStockTransfer} className="flex-1 sm:flex-none">
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Transferir
                </Button>
              )}
              {canDelete && !editing && (
                <Button type="button" size="sm" variant="destructive" onClick={handleDelete} className="flex-1 sm:flex-none">
                  <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 space-y-4 px-4 py-6 md:space-y-5 md:px-6">
          <section className={cn('grid gap-3', isMainStore ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
            {isMainStore ? (
              <>
                <StatCard icon={Warehouse} label="Bodega" value={formatNumber(product.stock.warehouse)} />
                <StatCard icon={Store} label="Local" value={formatNumber(product.stock.store)} />
                <StatCard icon={Boxes} label="Total" value={formatNumber(product.stock.total)} />
              </>
            ) : (
              <StatCard icon={Store} label="Stock en tienda" value={formatNumber(product.stock.store)} />
            )}
          </section>

          <section className={cn(panel, 'overflow-hidden p-4 md:p-6')}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <Hash className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              Información del producto
            </h2>
            {editing && draft ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Descripción</dt>
                  <dd className="mt-1">
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : null))}
                      rows={3}
                      className={cn(inputClass, 'mt-0 resize-y')}
                      placeholder="Descripción (opcional)"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Marca</dt>
                  <dd className="mt-1">
                    <input
                      type="text"
                      value={draft.brand}
                      onChange={(e) => setDraft((d) => (d ? { ...d, brand: e.target.value } : null))}
                      className={cn(inputClass, 'mt-0')}
                      placeholder="Marca (opcional)"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Categoría</dt>
                  <dd className="mt-1">
                    <select
                      value={draft.categoryId}
                      onChange={(e) => setDraft((d) => (d ? { ...d, categoryId: e.target.value } : null))}
                      className={cn(inputClass, 'mt-0')}
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Precio de venta</dt>
                  <dd className="mt-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draft.price || ''}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, price: parseFloat(e.target.value) || 0 } : null))
                      }
                      className={cn(
                        inputClass,
                        'mt-0 tabular-nums',
                        editErrors.price && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50'
                      )}
                    />
                    {editErrors.price && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.price}</p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Costo</dt>
                  <dd className="mt-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draft.cost || ''}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, cost: parseFloat(e.target.value) || 0 } : null))
                      }
                      className={cn(
                        inputClass,
                        'mt-0 tabular-nums',
                        editErrors.cost && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50'
                      )}
                    />
                    {editErrors.cost && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.cost}</p>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Estado en catálogo</dt>
                  <dd className="mt-1">
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, status: e.target.value as Product['status'] } : null
                        )
                      }
                      className={cn(inputClass, 'mt-0')}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="discontinued">Descontinuado</option>
                      <option value="out_of_stock">Sin stock</option>
                    </select>
                  </dd>
                </div>
                <Field label="Fecha de creación">
                  <span className="tabular-nums">{formatDate(product.createdAt)}</span>
                </Field>
                {product.updatedAt ? (
                  <Field label="Última actualización">
                    <span className="tabular-nums">{formatDate(product.updatedAt)}</span>
                  </Field>
                ) : null}
              </dl>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Descripción">{product.description || 'Sin descripción'}</Field>
                <Field label="Categoría">{getCategoryName(product.categoryId)}</Field>
                {product.brand ? <Field label="Marca">{product.brand}</Field> : null}
                <Field label="Precio de venta">
                  <span className="font-semibold tabular-nums">{formatCurrency(product.price)}</span>
                </Field>
                <Field label="Costo">
                  <span className="font-semibold tabular-nums">{formatCurrency(product.cost)}</span>
                </Field>
                <Field label="Fecha de creación">
                  <span className="tabular-nums">{formatDate(product.createdAt)}</span>
                </Field>
                {product.updatedAt ? (
                  <Field label="Última actualización">
                    <span className="tabular-nums">{formatDate(product.updatedAt)}</span>
                  </Field>
                ) : null}
              </dl>
            )}

            <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <ImageIcon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                Foto del catálogo
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Imagen para clientes y equipo en Zonat.
                {editing && draft ? (
                  <span className="block mt-1 text-amber-700 dark:text-amber-300/90">
                    Sube o cambia la imagen y pulsa <span className="font-medium">Guardar cambios</span> para
                    guardarla en el producto.
                  </span>
                ) : null}
              </p>
              <div className="mt-4">
                {editing && draft ? (
                  <>
                    <input
                      ref={catalogFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImage || saving}
                      onChange={handleCatalogImageFile}
                    />
                    {(uploadPreview || draft.imageUrl?.trim()) ? (
                      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-950/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadPreview || draft.imageUrl!.trim()}
                          alt={draft.name || 'Vista previa catálogo'}
                          className="mx-auto block max-h-[min(50vh,380px)] w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
                        <ImageIcon className="mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.25} />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sin imagen</p>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage || saving}
                        onClick={() => catalogFileInputRef.current?.click()}
                      >
                        {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
                      </Button>
                      {draft.imageUrl?.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 dark:text-rose-400"
                          disabled={uploadingImage || saving}
                          onClick={() => setDraft((d) => (d ? { ...d, imageUrl: null } : null))}
                        >
                          Quitar imagen
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : product.imageUrl?.trim() ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-950/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.imageUrl.trim()}
                        alt={product.name}
                        className="mx-auto block max-h-[min(50vh,380px)] w-full object-contain"
                      />
                    </div>
                    <a
                      href={product.imageUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      Abrir imagen en pestaña nueva
                    </a>
                  </>
                ) : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
                    <ImageIcon className="mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.25} />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Sin imagen de catálogo</p>
                    {canEdit ? (
                      <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-500">
                        Pulsa <span className="font-medium text-zinc-700 dark:text-zinc-300">Editar</span> para subir
                        una foto.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modales */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onAdjust={handleAdjustStock}
        product={product}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferStock}
        product={product}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que quieres eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </RoleProtectedRoute>
  )
}

