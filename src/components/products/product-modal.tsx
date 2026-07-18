'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { X, Package, DollarSign, BarChart3, AlertTriangle, Store, ImageIcon } from 'lucide-react'
import { Product, Category } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { useProducts } from '@/contexts/products-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatMoneyInput, parseMoneyInput, formatIntegerInput, parseIntegerInput } from '@/lib/money-input'

const emptyProductForm = {
  name: '',
  reference: '',
  description: '',
  retailPrice: 0,
  wholesalePrice: 0,
  cost: 0,
  stock: {
    warehouse: 0,
    store: 0,
    total: 0,
  },
  categoryId: '',
  brand: '',
  status: 'active' as Product['status'],
  initialLocation: 'store' as 'warehouse' | 'store',
}

const inputBase =
  'casa-artesanal-preserve-surface w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-snug text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/25 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-400 dark:focus:ring-violet-400/25'

const labelClass = 'mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400'
const errorClass = 'mt-1 text-xs text-red-500 dark:text-red-400'
const hintClass = 'mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400'

function SectionCard({
  icon: Icon,
  title,
  children,
  description,
  iconClassName = 'text-zinc-600 dark:text-zinc-400',
  className,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  description?: string
  iconClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60',
        className
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className={cn('h-4 w-4 shrink-0', iconClassName)} strokeWidth={1.75} aria-hidden />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      {description ? <p className="mb-2.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400">{description}</p> : null}
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
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const [formData, setFormData] = useState({
    name: product?.name || '',
    reference: product?.reference || '',
    description: product?.description || '',
    retailPrice: product?.retailPrice ?? product?.price ?? 0,
    wholesalePrice: product?.wholesalePrice ?? product?.price ?? 0,
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
  const [suggestedReference, setSuggestedReference] = useState<{ next: string; last: string } | null>(null)
  const catalogFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    if (product) {
      setFormData({
        name: product.name || '',
        reference: product.reference || '',
        description: product.description || '',
        retailPrice: product.retailPrice ?? product.price ?? 0,
        wholesalePrice: product.wholesalePrice ?? product.price ?? 0,
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
      setSuggestedReference(null)
      setUploadPreview(null)
      return
    }

    // Nuevo producto: sugerir siguiente referencia (última + 1)
    let cancelled = false
    setCatalogImageUrl(null)
    setUploadPreview(null)
    setSuggestedReference(null)
    setFormData({ ...emptyProductForm })

    void ProductsService.getSuggestedNextReference().then((suggestion) => {
      if (cancelled || !suggestion) return
      setSuggestedReference(suggestion)
      setFormData((prev) => ({
        ...prev,
        reference: prev.reference.trim() ? prev.reference : suggestion.next,
      }))
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, product])

  const statusOptions = [
    {
      value: 'active' as const,
      label: 'Activo',
      idle: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-700/90 hover:border-emerald-300/80 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/90 dark:hover:border-emerald-700/50',
      selected:
        'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200/80 dark:border-emerald-700/60 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-800/50',
    },
    {
      value: 'inactive' as const,
      label: 'Inactivo',
      idle: 'border-stone-200/80 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100/80 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-500',
      selected:
        'border-stone-300 bg-stone-100 text-stone-700 shadow-sm ring-1 ring-stone-200/80 dark:border-zinc-500/70 dark:bg-zinc-700/60 dark:text-zinc-100 dark:ring-zinc-600/50',
    },
    {
      value: 'discontinued' as const,
      label: 'Descontinuado',
      idle: 'border-orange-200/70 bg-orange-50/80 text-orange-700/90 hover:border-orange-300/80 hover:bg-orange-50 dark:border-orange-800/40 dark:bg-orange-950/25 dark:text-orange-300/90 dark:hover:border-orange-700/50',
      selected:
        'border-orange-300 bg-orange-100 text-orange-800 shadow-sm ring-1 ring-orange-200/80 dark:border-orange-700/60 dark:bg-orange-900/45 dark:text-orange-200 dark:ring-orange-800/50',
    },
    {
      value: 'out_of_stock' as const,
      label: 'Sin Stock',
      idle: 'border-amber-200/70 bg-amber-50/80 text-amber-700/90 hover:border-amber-300/80 hover:bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/90 dark:hover:border-amber-700/50',
      selected:
        'border-amber-300 bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-200/80 dark:border-amber-700/60 dark:bg-amber-900/45 dark:text-amber-200 dark:ring-amber-800/50',
    },
  ]

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
    if (formData.retailPrice <= 0) {
      newErrors.retailPrice = 'El precio cliente final debe ser mayor a 0'
    }
    if (formData.wholesalePrice <= 0) {
      newErrors.wholesalePrice = 'El precio mayorista debe ser mayor a 0'
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
      // Bodega no se usa en el formulario: en creación queda 0; en edición se preserva el valor existente
      const warehouseStock = product ? formData.stock.warehouse : 0
      const storeStock = formData.stock.store
      const totalStock = warehouseStock + storeStock
      const productData: Omit<Product, 'id'> = {
        name: formData.name.trim(),
        reference: formData.reference.trim(),
        description: formData.description.trim(),
        retailPrice: formData.retailPrice,
        wholesalePrice: formData.wholesalePrice,
        price: formData.retailPrice,
        cost: formData.cost,
        stock: {
          warehouse: warehouseStock,
          store: storeStock,
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
    setFormData({ ...emptyProductForm })
    setCatalogImageUrl(null)
    setUploadPreview(null)
    setSuggestedReference(null)
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const formId = 'product-modal-form'
  const isEdit = !!product

  const modal = (
    <div
      className="casa-artesanal-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/25 p-3 backdrop-blur-[2px] dark:bg-black/40 sm:p-5 xl:left-60"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="casa-artesanal-preserve-surface relative flex max-h-[min(96dvh,1120px)] w-full max-w-[min(94vw,83rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex min-w-0 items-center gap-2.5">
            <Package className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2 id="product-modal-title" className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                {isEdit ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {isEdit ? `Editando ${product.name}` : 'Crea un producto en tu inventario'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-4 dark:bg-zinc-950 sm:overflow-hidden sm:px-6 sm:py-5">
          <form
            id={formId}
            onSubmit={e => {
              e.preventDefault()
              handleSave()
            }}
            className="h-full"
          >
            <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <SectionCard icon={Package} title="Información básica">
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="product-name" className={labelClass}>
                          Nombre <span className="text-zinc-400">*</span>
                        </label>
                        <input
                          id="product-name"
                          type="text"
                          value={formData.name}
                          onChange={e => handleInputChange('name', e.target.value)}
                          className={cn(inputBase, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder="Nombre del producto"
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-ref" className={labelClass}>
                          Referencia <span className="text-zinc-400">*</span>
                        </label>
                        <input
                          id="product-ref"
                          type="text"
                          value={formData.reference}
                          onChange={e => handleInputChange('reference', e.target.value)}
                          className={cn(inputBase, errors.reference && 'border-red-500/70 ring-1 ring-red-500/30')}
                          placeholder={suggestedReference?.next || '439'}
                        />
                        {!product && suggestedReference && (
                          <p className={hintClass}>
                            Sugerida:{' '}
                            <button
                              type="button"
                              className="font-semibold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                              onClick={() => handleInputChange('reference', suggestedReference.next)}
                            >
                              {suggestedReference.next}
                            </button>
                            <span className="text-zinc-400"> · última {suggestedReference.last}</span>
                          </p>
                        )}
                        {errors.reference && <p className={errorClass}>{errors.reference}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-desc" className={labelClass}>
                        Descripción <span className="font-normal text-zinc-400">(opcional)</span>
                      </label>
                      <textarea
                        id="product-desc"
                        value={formData.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        className={cn(inputBase, 'min-h-[2.75rem] resize-none', errors.description && 'border-red-500/70')}
                        placeholder="Descripción breve"
                        rows={2}
                      />
                      {errors.description && <p className={errorClass}>{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="product-brand" className={labelClass}>
                          Marca <span className="font-normal text-zinc-400">(opcional)</span>
                        </label>
                        <input
                          id="product-brand"
                          type="text"
                          value={formData.brand}
                          onChange={e => handleInputChange('brand', e.target.value)}
                          className={cn(inputBase, errors.brand && 'border-red-500/70')}
                          placeholder="Marca"
                        />
                        {errors.brand && <p className={errorClass}>{errors.brand}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-cat" className={labelClass}>
                          Categoría <span className="font-normal text-zinc-400">(opcional)</span>
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
                        {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={ImageIcon}
                  title="Imagen del catálogo"
                  description="Foto para ficha y listados (máx. 5MB)."
                  iconClassName="text-sky-600 dark:text-sky-400"
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60">
                    {uploadPreview || catalogImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={uploadPreview || catalogImageUrl || ''}
                        alt="Vista previa catálogo"
                        className="mx-auto block h-32 w-full object-contain sm:h-36"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center px-3 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:h-36">
                        Sin imagen · sube una foto del producto
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                      className="h-7 border-zinc-300 bg-white px-2.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
                    </Button>
                    {catalogImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                        disabled={uploadingImage}
                        onClick={() => setCatalogImageUrl(null)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </SectionCard>
              </div>

              <div className="flex flex-col gap-4">
                <SectionCard icon={BarChart3} title="Control de stock" iconClassName="text-teal-600 dark:text-teal-400">
                  {product ? (
                    <p className="mb-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                      Solo lectura. Para ajustar o transferir, usa la tabla de productos.
                    </p>
                  ) : (
                    <p className="mb-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                      El stock inicial queda en Local.
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                        <Store className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                        <span className="text-xs font-semibold">Local</span>
                      </div>
                      <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        Total{' '}
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {formatIntegerInput(formData.stock.store)}
                        </span>{' '}
                        und.
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Stock actual</label>
                      {product ? (
                        <div className="w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-500 dark:border-zinc-600/80 dark:bg-zinc-900/60 dark:text-zinc-400">
                          {formatIntegerInput(formData.stock.store)} und.
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={formatIntegerInput(formData.stock.store)}
                          onChange={e => handleInputChange('stock.store', parseIntegerInput(e.target.value))}
                          className={cn(inputBase, errors.stockStore && 'border-red-500/70')}
                          placeholder="0"
                        />
                      )}
                      {errors.stockStore && <p className={errorClass}>{errors.stockStore}</p>}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={DollarSign}
                  title="Información financiera"
                  description="Compra y dos precios de venta."
                  iconClassName="text-violet-600 dark:text-violet-400"
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label htmlFor="product-cost" className={labelClass}>
                        Adquisición
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-cost"
                          type="text"
                          value={formatMoneyInput(formData.cost)}
                          onChange={e => handleInputChange('cost', parseMoneyInput(e.target.value))}
                          className={cn(inputBase, 'pl-6', errors.cost && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.cost && <p className={errorClass}>{errors.cost}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-retail-price" className={labelClass}>
                        Cliente final <span className="text-zinc-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-retail-price"
                          type="text"
                          value={formatMoneyInput(formData.retailPrice)}
                          onChange={e => handleInputChange('retailPrice', parseMoneyInput(e.target.value))}
                          className={cn(inputBase, 'pl-6', errors.retailPrice && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.retailPrice && <p className={errorClass}>{errors.retailPrice}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-wholesale-price" className={labelClass}>
                        Mayorista <span className="text-zinc-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                          $
                        </span>
                        <input
                          id="product-wholesale-price"
                          type="text"
                          value={formatMoneyInput(formData.wholesalePrice)}
                          onChange={e => handleInputChange('wholesalePrice', parseMoneyInput(e.target.value))}
                          className={cn(inputBase, 'pl-6', errors.wholesalePrice && 'border-red-500/70')}
                          placeholder="0"
                        />
                      </div>
                      {errors.wholesalePrice && <p className={errorClass}>{errors.wholesalePrice}</p>}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={AlertTriangle} title="Estado del producto" iconClassName="text-amber-600 dark:text-amber-400">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {statusOptions.map(option => {
                      const selected = formData.status === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange('status', option.value)}
                          aria-pressed={selected}
                          className={cn(
                            'inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all',
                            selected ? option.selected : option.idle
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </SectionCard>
              </div>
            </div>
          </form>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950"
          style={{ paddingBottom: `max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))` }}
        >
          <Button type="button" variant="destructive" onClick={handleClose} className="h-9 px-4">
            Cancelar
          </Button>
          <Button type="submit" form={formId} className="h-9 px-5">
            <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
