'use client'

import { useState, useEffect, useLayoutEffect, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Upload, X } from 'lucide-react'
import { Store } from '@/types'
import { cn } from '@/lib/utils'
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
    <div className={modalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(modalPanelClass, 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="store-modal-title" className={modalTitleClass}>
              {isEdit ? 'Editar tienda' : 'Nueva tienda'}
            </h2>
            <p className={modalSubtitleClass}>
              {isEdit && store?.name ? store.name : 'Datos de la ubicación'}
            </p>
          </div>
          <button type="button" className={modalCloseButtonClass} onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={cn(modalBodyClass, 'space-y-4')}>
            <div>
              <span className={modalLabelClass}>Logo</span>
              <div className="flex items-center gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-white/[0.1] dark:bg-white/[0.04]">
                  {formData.logo && !errors.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.logo} alt="Logo de la tienda" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Upload className="h-4 w-4 text-zinc-300 dark:text-white/25" strokeWidth={1.75} />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label
                      className={cn(
                        modalSecondaryButtonClass,
                        'cursor-pointer gap-1.5',
                        isUploading && 'pointer-events-none opacity-50'
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {isUploading ? 'Subiendo…' : formData.logo ? 'Cambiar' : 'Subir logo'}
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
                        <a
                          href={formData.logo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={modalCloseButtonClass}
                          title="Abrir logo"
                          aria-label="Abrir logo"
                        >
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleRemoveLogo()}
                          className="h-8 px-1.5 text-[13px] font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                  <p className={modalHintClass}>Máximo 2 MB · JPG, PNG o GIF</p>
                </div>
              </div>
              {errors.logo && <p className={modalErrorClass}>{errors.logo}</p>}
            </div>

            <div>
              <label htmlFor="store-name" className={modalLabelClass}>
                Nombre de la tienda <span className="text-zinc-400 dark:text-white/35">*</span>
              </label>
              <input
                id="store-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Casa Artesanal Parque"
                className={cn(modalInputClass, errors.name && modalInputErrorClass)}
              />
              {errors.name && <p className={modalErrorClass}>{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="store-nit" className={modalLabelClass}>
                  NIT
                </label>
                <input
                  id="store-nit"
                  value={formData.nit}
                  onChange={e => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="Ej. 900123456-7"
                  className={modalInputClass}
                />
              </div>
              <div>
                <label htmlFor="store-phone" className={modalLabelClass}>
                  Teléfono
                </label>
                <input
                  id="store-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej. 300 123 4567"
                  className={modalInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div>
                <label htmlFor="store-city" className={modalLabelClass}>
                  Ciudad
                </label>
                <input
                  id="store-city"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ej. Bogotá"
                  className={modalInputClass}
                />
              </div>
              <div>
                <label htmlFor="store-address" className={modalLabelClass}>
                  Dirección
                </label>
                <input
                  id="store-address"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, número, barrio o piso"
                  className={modalInputClass}
                />
              </div>
            </div>
          </div>

          <div className={modalFooterClass}>
            <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={modalPrimaryButtonClass} disabled={isUploading}>
              {isEdit ? 'Guardar cambios' : 'Crear tienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
