'use client'

import { useState, useEffect, useLayoutEffect, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Store as StoreIcon, Upload } from 'lucide-react'
import { Store } from '@/types'
import { cn } from '@/lib/utils'
import {
  appModalBodyClass,
  appModalErrorClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalHintClass,
  appModalInputClass,
  appModalLabelClass,
  appModalOverlayClass,
  appModalPanelClass,
} from '@/lib/app-modal'
import { cardShell } from '@/lib/card-shell'

interface StoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (store: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'>) => void
  store?: Store | null
}

export function StoreModal({ isOpen, onClose, onSave, store }: StoreModalProps) {
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const [formData, setFormData] = useState({
    name: store?.name || '',
    nit: store?.nit || '',
    logo: store?.logo || '',
    address: store?.address || '',
    city: store?.city || '',
    phone: store?.phone || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        nit: store.nit || '',
        logo: store.logo || '',
        address: store.address || '',
        city: store.city || '',
        phone: store.phone || '',
      })
    } else {
      setFormData({
        name: '',
        nit: '',
        logo: '',
        address: '',
        city: '',
        phone: '',
      })
    }
    setErrors({})
  }, [store])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la tienda es requerido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    onSave({
      name: formData.name.trim(),
      nit: formData.nit.trim() || undefined,
      logo: formData.logo.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'El archivo debe ser una imagen' }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'La imagen no debe superar los 2MB' }))
      return
    }

    try {
      setIsUploading(true)

      if (formData.logo && formData.logo.includes('store-logos')) {
        try {
          let oldPath = formData.logo
          try {
            const oldUrl = new URL(formData.logo)
            oldPath = oldUrl.pathname
          } catch {
            oldPath = formData.logo.replace(
              /^.*\/store-logos\//,
              '/storage/v1/object/public/store-logos/store-logos/'
            )
          }
          fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(oldPath)}`, {
            method: 'DELETE',
          }).catch(() => {})
        } catch {
          /* ignore */
        }
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/storage/upload-store-logo', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir la imagen')
      }

      const data = await response.json()

      if (data.url) {
        setFormData(prev => ({ ...prev, logo: data.url }))
        setErrors(prev => ({ ...prev, logo: '' }))
      } else {
        throw new Error('No se pudo obtener la URL pública del archivo')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al subir la imagen'
      setErrors(prev => ({ ...prev, logo: message }))
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (formData.logo && formData.logo.includes('store-logos')) {
      try {
        const url = new URL(formData.logo)
        await fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(url.pathname)}`, {
          method: 'DELETE',
        })
      } catch {
        /* ignore */
      }
    }
    setFormData(prev => ({ ...prev, logo: '' }))
  }

  if (!isOpen) return null

  const isEdit = Boolean(store)

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <StoreIcon
              className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="store-modal-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {isEdit ? 'Editar tienda' : 'Nueva tienda'}
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {isEdit && store?.name
                  ? `Editando ${store.name}`
                  : 'Completa los datos de la ubicación'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={cn(appModalBodyClass, 'space-y-4')}>
            <div className={cn(cardShell, 'space-y-2 p-3')}>
              <span className={cn(appModalLabelClass, 'mb-0')}>Logo (opcional)</span>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg border-transparent bg-emerald-500 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600',
                    isUploading && 'pointer-events-none opacity-50'
                  )}
                >
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                  {isUploading ? 'Subiendo…' : formData.logo ? 'Cambiar logo' : 'Subir logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                </label>
                {formData.logo && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleRemoveLogo()}
                      className="text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      Quitar
                    </button>
                    <a
                      href={formData.logo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      Abrir
                    </a>
                  </>
                )}
              </div>
              {errors.logo && <p className={appModalErrorClass}>{errors.logo}</p>}
              <p className={appModalHintClass}>Máximo 2 MB · JPG, PNG o GIF</p>
              {formData.logo && !errors.logo && (
                <div className="relative mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80">
                  {isUploading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                      Subiendo…
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.logo}
                    alt="Vista previa del logo"
                    className="max-h-40 w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="store-name" className={appModalLabelClass}>
                Nombre de la tienda <span className="text-zinc-400">*</span>
              </label>
              <input
                id="store-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Casa Artesanal Parque"
                className={cn(
                  appModalInputClass,
                  'h-11',
                  errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                )}
              />
              {errors.name && <p className={appModalErrorClass}>{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="store-nit" className={appModalLabelClass}>
                  NIT
                </label>
                <input
                  id="store-nit"
                  value={formData.nit}
                  onChange={e => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="Ej. 900123456-7"
                  className={cn(appModalInputClass, 'h-11')}
                />
              </div>
              <div>
                <label htmlFor="store-city" className={appModalLabelClass}>
                  Ciudad
                </label>
                <input
                  id="store-city"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ej. Bogotá"
                  className={cn(appModalInputClass, 'h-11')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="store-phone" className={appModalLabelClass}>
                Teléfono
              </label>
              <input
                id="store-phone"
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej. 300 123 4567"
                className={cn(appModalInputClass, 'h-11')}
              />
            </div>

            <div>
              <label htmlFor="store-address" className={appModalLabelClass}>
                Dirección
              </label>
              <textarea
                id="store-address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, número, barrio o piso"
                rows={2}
                className={cn(appModalInputClass, 'min-h-[4rem] resize-y py-2.5')}
              />
            </div>
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isEdit ? 'Guardar cambios' : 'Registrar tienda'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
