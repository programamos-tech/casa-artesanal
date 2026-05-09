'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Package, DollarSign, BarChart3, AlertTriangle, Store, ImageIcon } from 'lucide-react'
import { Product, Category } from '@/types'
import { useProducts } from '@/contexts/products-context'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const inputBase =
  'casa-artesanal-preserve-surface w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-400/25'

function SectionCard({
  icon: Icon,
  title,
  children,
  description,
  iconClassName = 'text-indigo-600 dark:text-indigo-400',
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  description?: string
  iconClassName?: string
}) {
  return (
    <div className="rounded-xl border border-indigo-100/90 bg-white p-4 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn('h-5 w-5 shrink-0', iconClassName)} strokeWidth={1.75} aria-hidden />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      {description ? <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p> : null}
      {children}
    </div>
  )
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: Omit<Product, 'id'>) => void
  product?: Product | null
  categories: Category[]
}

export function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const { products } = useProducts()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  const [formData, setFormData] = useState({
    name: product?.name || '',
    reference: product?.reference || '',
    description: product?.description || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock: {
      warehouse: product?.stock?.warehouse || 0,
      store: product?.stock?.store || 0,
      total: product?.stock?.total || 0,
    },
    categoryId: product?.categoryId || '',
    brand: product?.brand || '',
    status: product?.status || 'active',
    initialLocation: 'store' as 'warehouse' | 'store',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const catalogFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        reference: product.reference || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        stock: {
          warehouse: product.stock?.warehouse || 0,
          store: product.stock?.store || 0,
          total: product.stock?.total || 0,
        },
        categoryId: product.categoryId || '',
        brand: product.brand || '',
        status: product.status || 'active',
        initialLocation: 'store' as 'warehouse' | 'store',
      })
      setCatalogImageUrl(product.imageUrl?.trim() || null)
    } else {
      setCatalogImageUrl(null)
    }
    setUploadPreview(null)
  }, [product])

  const formatNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue) || numValue === 0) return ''

    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  const parseFormattedNumber = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
    return parseFloat(cleanValue) || 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-brand-200 bg-brand-50 text-brand-800 dark:border-zinc-500/45 dark:bg-zinc-700/40 dark:text-zinc-100'
      case 'inactive':
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-300'
      case 'discontinued':
        return 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-500/50 dark:bg-zinc-800/90 dark:text-zinc-300'
      case 'out_of_stock':
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200'
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }
    if (!formData.reference.trim()) {
      newErrors.reference = 'La referencia es requerida'
    } else {
      const referenceExists = products.some(
        p =>
          p.reference.toLowerCase() === formData.reference.toLowerCase() && (!product || p.id !== product.id)
      )

      if (referenceExists) {
        newErrors.reference = 'Esta referencia ya existe en otro producto'
      }
    }
    if (formData.price <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0'
    }
    if (formData.cost < 0) {
      newErrors.cost = 'El costo no puede ser negativo'
    }
    if (formData.stock.warehouse < 0) {
      newErrors.stockWarehouse = 'El stock de bodega no puede ser negativo'
    }
    if (formData.stock.store < 0) {
      newErrors.stockStore = 'El stock de local no puede ser negativo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
      setCatalogImageUrl(url)
      toast.success('Imagen del catálogo guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value,
        },
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSave = () => {
    if (validateForm()) {
      const totalStock = formData.stock.warehouse + formData.stock.store
      const productData: Omit<Product, 'id'> = {
        name: formData.name.trim(),
        reference: formData.reference.trim(),
        description: formData.description.trim(),
        price: formData.price,
        cost: formData.cost,
        stock: {
          warehouse: formData.stock.warehouse,
          store: formData.stock.store,
          total: totalStock,
        },
        categoryId: formData.categoryId,
        brand: formData.brand.trim(),
        status: formData.status,
        imageUrl: catalogImageUrl?.trim() || null,
        createdAt: product?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onSave(productData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      reference: '',
      description: '',
      price: 0,
      cost: 0,
      stock: {
        warehouse: 0,
        store: 0,
        total: 0,
      },
      categoryId: '',
      brand: '',
      status: 'active',
      initialLocation: 'store',
    })
    setCatalogImageUrl(null)
    setUploadPreview(null)
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const formId = 'product-modal-form'
  const isEdit = !!product

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-3 py-5 backdrop-blur-md dark:bg-black/75 sm:py-8 xl:left-56">
      <div
        className="casa-artesanal-preserve-surface flex max-h-[calc(100dvh-2.5rem)] w-full max-w-[min(72rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/40 via-zinc-50 to-zinc-50 shadow-2xl dark:border-indigo-900/35 dark:from-indigo-950/25 dark:via-zinc-950 dark:to-zinc-950 sm:max-h-[calc(100dvh-4rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/70 px-4 py-4 md:px-6 md:py-5 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/30">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 dark:border-indigo-700/50 dark:bg-indigo-950/50">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="product-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                {isEdit ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {isEdit ? `Editando ${product.name}` : 'Crea un producto en tu inventario'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50/90 px-4 py-4 md:px-6 md:py-5 dark:bg-zinc-950">
          <form
            id={formId}
            onSubmit={e => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="space-y-4 lg:space-y-5">
                <SectionCard icon={Package} title="Información básica">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="product-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Nombre del producto <span className="text-zinc-400 dark:text-zinc-500">*</span>
                        </label>
                        <input
                          id="product-name"
                          type="text"
                          value={formData.name}
                          onChange={e => handleInputChange('name', e.target.value)}
                          className={cn(inputBase, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder="Nombre del producto"
                        />
                        {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-ref" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Referencia <span className="text-zinc-400 dark:text-zinc-500">*</span>
                        </label>
                        <input
                          id="product-ref"
                          type="text"
                          value={formData.reference}
                          onChange={e => handleInputChange('reference', e.target.value)}
                          className={cn(inputBase, errors.reference && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder="REF-001"
                        />
                        {errors.reference && <p className="mt-1.5 text-sm text-red-400">{errors.reference}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-desc" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Descripción <span className="font-normal text-zinc-500">(opcional)</span>
                      </label>
                      <textarea
                        id="product-desc"
                        value={formData.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        className={cn(inputBase, 'min-h-[5.5rem] resize-none', errors.description && 'border-red-500/70')}
                        placeholder="Descripción detallada del producto"
                        rows={3}
                      />
                      {errors.description && <p className="mt-1.5 text-sm text-red-400">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="product-brand" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Marca <span className="font-normal text-zinc-500">(opcional)</span>
                        </label>
                        <input
                          id="product-brand"
                          type="text"
                          value={formData.brand}
                          onChange={e => handleInputChange('brand', e.target.value)}
                          className={cn(inputBase, errors.brand && 'border-red-500/70')}
                          placeholder="Marca"
                        />
                        {errors.brand && <p className="mt-1.5 text-sm text-red-400">{errors.brand}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-cat" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Categoría <span className="font-normal text-zinc-500">(opcional)</span>
                        </label>
                        <select
                          id="product-cat"
                          value={formData.categoryId}
                          onChange={e => handleInputChange('categoryId', e.target.value)}
                          className={cn(inputBase, errors.categoryId && 'border-red-500/70')}
                        >
                          <option value="">Seleccionar categoría</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {errors.categoryId && <p className="mt-1.5 text-sm text-red-400">{errors.categoryId}</p>}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={ImageIcon}
                  title="Imagen del catálogo"
                  description="Foto para ficha y listados (máx. 5MB)."
                  iconClassName="text-sky-600 dark:text-sky-400"
                >
                  <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60">
                    {uploadPreview || catalogImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={uploadPreview || catalogImageUrl || ''}
                        alt="Vista previa catálogo"
                        className="mx-auto block max-h-56 w-full object-contain"
                      />
                    ) : (
                      <div className="flex min-h-[140px] items-center justify-center px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Sin imagen · sube una foto del producto
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      ref={catalogFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImage}
                      onChange={handleCatalogImageFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => catalogFileInputRef.current?.click()}
                      className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
                    </Button>
                    {catalogImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        disabled={uploadingImage}
                        onClick={() => setCatalogImageUrl(null)}
                      >
                        Quitar imagen
                      </Button>
                    )}
                  </div>
                </SectionCard>

                <SectionCard icon={DollarSign} title="Información financiera" iconClassName="text-violet-600 dark:text-violet-400">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="product-price" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Precio de venta <span className="text-zinc-400 dark:text-zinc-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-price"
                          type="text"
                          value={formatNumber(formData.price)}
                          onChange={e => handleInputChange('price', parseFormattedNumber(e.target.value))}
                          className={cn(inputBase, 'pl-8', errors.price && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.price && <p className="mt-1.5 text-sm text-red-400">{errors.price}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-cost" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Costo de adquisición
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-cost"
                          type="text"
                          value={formatNumber(formData.cost)}
                          onChange={e => handleInputChange('cost', parseFormattedNumber(e.target.value))}
                          className={cn(inputBase, 'pl-8', errors.cost && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.cost && <p className="mt-1.5 text-sm text-red-400">{errors.cost}</p>}
                    </div>
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-4 lg:space-y-5">
                <SectionCard icon={BarChart3} title="Control de stock" iconClassName="text-teal-600 dark:text-teal-400">
                  {product && (
                    <div className="-mt-2 mb-4 flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/60 dark:bg-zinc-900/50">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        El stock se muestra solo como referencia. Para ajustar o transferir, usa la tabla de productos.
                      </p>
                    </div>
                  )}

                  {!product && isMainStore && (
                    <div className="mb-4">
                      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ubicación inicial</span>
                      <div className="flex rounded-xl bg-zinc-100 p-1 ring-1 ring-zinc-200 dark:bg-zinc-800/90 dark:ring-zinc-700/80">
                        <button
                          type="button"
                          onClick={() => handleInputChange('initialLocation', 'store')}
                          className={cn(
                            'flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            formData.initialLocation === 'store'
                              ? 'bg-white text-zinc-950 shadow-sm'
                              : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200'
                          )}
                        >
                          <Store className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          Local
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('initialLocation', 'warehouse')}
                          className={cn(
                            'flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            formData.initialLocation === 'warehouse'
                              ? 'bg-white text-zinc-950 shadow-sm'
                              : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200'
                          )}
                        >
                          <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          Bodega
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={cn('grid grid-cols-1 gap-6', isMainStore && 'md:grid-cols-2')}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <Store className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                        <h4 className="text-sm font-semibold">Local</h4>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stock actual</label>
                        {product ? (
                            <div className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                            {formatNumber(formData.stock.store)} unidades
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={formatNumber(formData.stock.store)}
                            onChange={e => handleInputChange('stock.store', parseFormattedNumber(e.target.value))}
                            className={cn(inputBase, errors.stockStore && 'border-red-500/70')}
                            placeholder="0"
                          />
                        )}
                        {errors.stockStore && <p className="mt-1.5 text-sm text-red-400">{errors.stockStore}</p>}
                      </div>
                    </div>

                    {isMainStore && (
                      <div className="space-y-3">
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <Package className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                          <h4 className="text-sm font-semibold">Bodega</h4>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stock actual</label>
                          {product ? (
                            <div className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                              {formatNumber(formData.stock.warehouse)} unidades
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={formatNumber(formData.stock.warehouse)}
                              onChange={e => handleInputChange('stock.warehouse', parseFormattedNumber(e.target.value))}
                              className={cn(inputBase, errors.stockWarehouse && 'border-red-500/70')}
                              placeholder="0"
                            />
                          )}
                          {errors.stockWarehouse && (
                            <p className="mt-1.5 text-sm text-red-400">{errors.stockWarehouse}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-teal-100/90 bg-teal-50/40 px-4 py-3 dark:border-teal-900/40 dark:bg-teal-950/25">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Stock total</span>
                      <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatNumber(
                          isMainStore ? formData.stock.warehouse + formData.stock.store : formData.stock.store
                        )}{' '}
                        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-500">unidades</span>
                      </span>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={AlertTriangle} title="Estado del producto" iconClassName="text-amber-600 dark:text-amber-400">
                  <div className="flex flex-wrap gap-2">
                    {(['active', 'inactive', 'discontinued', 'out_of_stock'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleInputChange('status', status)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                          formData.status === status
                            ? 'border-zinc-300 bg-white text-zinc-950 shadow-sm'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600/80 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                        )}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Badge variant="outline" className={cn('border px-2 py-0.5 text-xs font-normal', getStatusColor(formData.status))}>
                      {getStatusLabel(formData.status)}
                    </Badge>
                  </div>
                </SectionCard>
              </div>
            </div>
          </form>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-indigo-100/80 bg-white/95 px-4 py-4 backdrop-blur-sm md:px-6 dark:border-indigo-900/40 dark:bg-zinc-950/95"
          style={{ paddingBottom: `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))` }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-transparent px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-500/80 dark:text-white dark:hover:bg-zinc-800/80"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
