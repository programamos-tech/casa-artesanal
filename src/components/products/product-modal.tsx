'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ImagePlus, ChevronDown } from 'lucide-react'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { Product, Category } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { useProducts } from '@/contexts/products-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatMoneyInput, parseMoneyInput, formatIntegerInput, parseIntegerInput } from '@/lib/money-input'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalErrorClass,
  modalFooterClass,
  modalHeaderClass,
  modalHintClass,
  modalInputClass,
  modalInputErrorClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'

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

const inputBase = modalInputClass
const inputErrorClass = modalInputErrorClass
const labelClass = modalLabelClass
const errorClass = modalErrorClass
const hintClass = modalHintClass
const secondaryBtnClass = modalSecondaryButtonClass
const primaryBtnClass = modalPrimaryButtonClass

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/45">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function MoneyInput({
  id,
  value,
  onChange,
  hasError,
}: {
  id: string
  value: number
  onChange: (value: number) => void
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[13px] text-zinc-400 dark:text-white/35">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatMoneyInput(value)}
        onChange={e => onChange(parseMoneyInput(e.target.value))}
        className={cn(inputBase, 'pl-6 tabular-nums', hasError && inputErrorClass)}
        placeholder="0"
      />
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

  const statusOptions: { value: Product['status']; label: string; tone: ReportTone }[] = [
    { value: 'active', label: 'Activo', tone: 'success' },
    { value: 'inactive', label: 'Inactivo', tone: 'neutral' },
    { value: 'discontinued', label: 'Descontinuado', tone: 'danger' },
    { value: 'out_of_stock', label: 'Sin stock', tone: 'warning' },
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
    <div className={modalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(modalPanelClass, 'max-w-4xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <header className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="product-modal-title" className={modalTitleClass}>
              {isEdit ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p className={modalSubtitleClass}>
              {isEdit ? product.name : 'Datos del catálogo, precios y stock inicial en la tienda seleccionada.'}
            </p>
          </div>
          <button type="button" onClick={handleClose} className={modalCloseButtonClass} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className={modalBodyClass}>
          <form
            id={formId}
            onSubmit={e => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2">
              <div className="space-y-7">
                <FormSection title="Información básica">
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
                      <div>
                        <label htmlFor="product-name" className={labelClass}>
                          Nombre <span className="text-zinc-400 dark:text-white/30">*</span>
                        </label>
                        <input
                          id="product-name"
                          type="text"
                          value={formData.name}
                          onChange={e => handleInputChange('name', e.target.value)}
                          className={cn(inputBase, errors.name && inputErrorClass)}
                          placeholder="Nombre del producto"
                          autoFocus={!isEdit}
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-ref" className={labelClass}>
                          Referencia <span className="text-zinc-400 dark:text-white/30">*</span>
                        </label>
                        <input
                          id="product-ref"
                          type="text"
                          value={formData.reference}
                          onChange={e => handleInputChange('reference', e.target.value)}
                          className={cn(inputBase, 'tabular-nums', errors.reference && inputErrorClass)}
                          placeholder={suggestedReference?.next || '439'}
                        />
                        {!product && suggestedReference && !errors.reference && (
                          <p className={hintClass}>
                            Última:{' '}
                            <span className="tabular-nums">{suggestedReference.last}</span>
                            {formData.reference.trim() !== suggestedReference.next && (
                              <>
                                {' · '}
                                <button
                                  type="button"
                                  className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white"
                                  onClick={() => handleInputChange('reference', suggestedReference.next)}
                                >
                                  usar {suggestedReference.next}
                                </button>
                              </>
                            )}
                          </p>
                        )}
                        {errors.reference && <p className={errorClass}>{errors.reference}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-desc" className={labelClass}>
                        Descripción <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                      </label>
                      <textarea
                        id="product-desc"
                        value={formData.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        className={cn(inputBase, 'h-auto min-h-[4.5rem] resize-none py-2', errors.description && inputErrorClass)}
                        placeholder="Descripción breve"
                        rows={3}
                      />
                      {errors.description && <p className={errorClass}>{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="product-brand" className={labelClass}>
                          Marca <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                        </label>
                        <input
                          id="product-brand"
                          type="text"
                          value={formData.brand}
                          onChange={e => handleInputChange('brand', e.target.value)}
                          className={cn(inputBase, errors.brand && inputErrorClass)}
                          placeholder="Marca"
                        />
                        {errors.brand && <p className={errorClass}>{errors.brand}</p>}
                      </div>
                      <div>
                        <label htmlFor="product-cat" className={labelClass}>
                          Categoría <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                        </label>
                        <div className="relative">
                          <select
                            id="product-cat"
                            value={formData.categoryId}
                            onChange={e => handleInputChange('categoryId', e.target.value)}
                            className={cn(
                              inputBase,
                              'cursor-pointer appearance-none pr-8',
                              !formData.categoryId && 'text-zinc-400 dark:text-white/30',
                              errors.categoryId && inputErrorClass
                            )}
                          >
                            <option value="">Sin categoría</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </div>
                        {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
                      </div>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Imagen del catálogo" description="Se muestra en la ficha y en los listados. Máximo 5 MB.">
                  <input
                    ref={catalogFileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingImage}
                    onChange={handleCatalogImageFile}
                  />
                  {uploadPreview || catalogImageUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="casa-artesanal-preserve-surface flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadPreview || catalogImageUrl || ''}
                          alt="Vista previa catálogo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => catalogFileInputRef.current?.click()}
                          className={secondaryBtnClass}
                        >
                          {uploadingImage ? 'Subiendo…' : 'Cambiar imagen'}
                        </button>
                        {catalogImageUrl && !uploadingImage && (
                          <button
                            type="button"
                            onClick={() => setCatalogImageUrl(null)}
                            className="text-xs text-zinc-500 transition-colors hover:text-rose-600 dark:text-white/45 dark:hover:text-rose-400"
                          >
                            Quitar imagen
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => catalogFileInputRef.current?.click()}
                      className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-800 disabled:opacity-60 dark:border-white/[0.14] dark:text-white/45 dark:hover:border-white/30 dark:hover:text-white/80"
                    >
                      <ImagePlus className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                      <span className="text-[13px]">{uploadingImage ? 'Subiendo…' : 'Subir imagen'}</span>
                    </button>
                  )}
                </FormSection>
              </div>

              <div className="space-y-7 lg:border-l lg:border-zinc-200 lg:pl-10 lg:dark:border-white/[0.07]">
                <FormSection title="Precios" description="Costo de compra y precios de venta.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="product-cost" className={labelClass}>
                        Costo
                      </label>
                      <MoneyInput
                        id="product-cost"
                        value={formData.cost}
                        onChange={v => handleInputChange('cost', v)}
                        hasError={!!errors.cost}
                      />
                      {errors.cost && <p className={errorClass}>{errors.cost}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-retail-price" className={labelClass}>
                        Cliente final <span className="text-zinc-400 dark:text-white/30">*</span>
                      </label>
                      <MoneyInput
                        id="product-retail-price"
                        value={formData.retailPrice}
                        onChange={v => handleInputChange('retailPrice', v)}
                        hasError={!!errors.retailPrice}
                      />
                      {errors.retailPrice && <p className={errorClass}>{errors.retailPrice}</p>}
                    </div>
                    <div>
                      <label htmlFor="product-wholesale-price" className={labelClass}>
                        Mayorista <span className="text-zinc-400 dark:text-white/30">*</span>
                      </label>
                      <MoneyInput
                        id="product-wholesale-price"
                        value={formData.wholesalePrice}
                        onChange={v => handleInputChange('wholesalePrice', v)}
                        hasError={!!errors.wholesalePrice}
                      />
                      {errors.wholesalePrice && <p className={errorClass}>{errors.wholesalePrice}</p>}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  title="Stock"
                  description={
                    product
                      ? 'Solo lectura. Para ajustar o trasladar, usa las acciones de la tabla de productos.'
                      : 'Unidades con las que arranca el producto en la tienda seleccionada.'
                  }
                >
                  <div className="max-w-[12rem]">
                    <label htmlFor="product-stock" className={labelClass}>
                      {product ? 'Stock actual' : 'Stock inicial'}
                    </label>
                    {product ? (
                      <div className="flex h-9 items-center text-[13px] tabular-nums text-zinc-700 dark:text-white/80">
                        {formatIntegerInput(formData.stock.store)} und.
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          id="product-stock"
                          type="text"
                          inputMode="numeric"
                          value={formatIntegerInput(formData.stock.store)}
                          onChange={e => handleInputChange('stock.store', parseIntegerInput(e.target.value))}
                          className={cn(inputBase, 'pr-12 tabular-nums', errors.stockStore && inputErrorClass)}
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-zinc-400 dark:text-white/35">
                          und.
                        </span>
                      </div>
                    )}
                    {errors.stockStore && <p className={errorClass}>{errors.stockStore}</p>}
                  </div>
                </FormSection>

                <FormSection title="Estado">
                  <div
                    role="radiogroup"
                    aria-label="Estado del producto"
                    className="casa-artesanal-preserve-surface grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-100 p-0.5 sm:grid-cols-4 dark:bg-white/[0.06]"
                  >
                    {statusOptions.map(option => {
                      const selected = formData.status === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => handleInputChange('status', option.value)}
                          className={cn(
                            'casa-artesanal-preserve-surface inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[13px] transition-colors',
                            selected
                              ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/55 dark:hover:text-white'
                          )}
                        >
                          <StatusDot tone={option.tone} className={cn(!selected && 'opacity-60')} />
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </FormSection>
              </div>
            </div>
          </form>
        </div>

        <footer
          className={modalFooterClass}
          style={{ paddingBottom: `max(0.875rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))` }}
        >
          <button type="button" onClick={handleClose} className={secondaryBtnClass}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={primaryBtnClass}>
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
