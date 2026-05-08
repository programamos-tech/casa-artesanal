'use client'

import { useState, useEffect, useLayoutEffect, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Store as StoreIcon, Upload } from 'lucide-react'
import { Store } from '@/types'

interface StoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (store: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'>) => void
  store?: Store | null
}

const inputClass =
  'h-10 border-zinc-200 bg-white text-base dark:border-zinc-700 dark:bg-zinc-950'

const textareaClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'

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
    phone: store?.phone || ''
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
        phone: store.phone || ''
      })
    } else {
      setFormData({
        name: '',
        nit: '',
        logo: '',
        address: '',
        city: '',
        phone: ''
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
    const storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'> = {
      name: formData.name.trim(),
      nit: formData.nit.trim() || undefined,
      logo: formData.logo.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      phone: formData.phone.trim() || undefined
    }
    onSave(storeData)
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, logo: 'El archivo debe ser una imagen' }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: 'La imagen no debe superar los 2MB' }))
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
            oldPath = formData.logo.replace(/^.*\/store-logos\//, '/storage/v1/object/public/store-logos/store-logos/')
          }
          fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(oldPath)}`, {
            method: 'DELETE'
          }).catch(() => {})
        } catch {
          /* ignore */
        }
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/storage/upload-store-logo', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir la imagen')
      }

      const data = await response.json()

      if (data.url) {
        setFormData((prev) => ({ ...prev, logo: data.url }))
        setErrors((prev) => ({ ...prev, logo: '' }))
      } else {
        throw new Error('No se pudo obtener la URL pública del archivo')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al subir la imagen'
      setErrors((prev) => ({ ...prev, logo: message }))
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (formData.logo && formData.logo.includes('store-logos')) {
      try {
        const url = new URL(formData.logo)
        const filePath = url.pathname
        await fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(filePath)}`, {
          method: 'DELETE'
        })
      } catch {
        /* ignore */
      }
    }
    setFormData((prev) => ({ ...prev, logo: '' }))
  }

  if (!isOpen) return null

  const isEdit = Boolean(store)

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 p-3 backdrop-blur-sm dark:bg-black/60 sm:p-6 sm:py-10 lg:px-12 xl:left-56"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="flex max-h-[min(88dvh,880px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900/95 sm:max-h-[min(94vh,880px)] sm:max-w-2xl lg:max-w-3xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200/90 px-4 py-3.5 sm:px-5 dark:border-zinc-800">
            <div className="flex min-w-0 items-center gap-2.5">
              <StoreIcon className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                  {isEdit ? 'Editar tienda' : 'Nueva tienda'}
                </h2>
                {isEdit && store?.name && (
                  <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                    Editando {store.name}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 touch-manipulation rounded-lg border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:translate-y-0 hover:bg-zinc-100 hover:shadow-none hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Card className="rounded-none border-0 shadow-none">
              <CardHeader className="px-3 pb-2 pt-4 sm:px-6 sm:pt-5">
                <CardTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Datos de la tienda
                </CardTitle>
                {!isEdit && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Completa los campos para registrar una nueva ubicación.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4 px-3 pb-4 pt-0 sm:px-6">
                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300">Logo (opcional)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50">
                      <Upload className="h-4 w-4 text-zinc-500" />
                      {isUploading ? 'Subiendo…' : formData.logo ? 'Cambiar imagen' : 'Subir logo'}
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
                          onClick={handleRemoveLogo}
                          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Quitar
                        </button>
                        <a
                          href={formData.logo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Abrir en pestaña nueva
                        </a>
                      </>
                    )}
                  </div>
                  {errors.logo && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.logo}</p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Máximo 2 MB. Formatos: JPG, PNG, GIF
                  </p>
                  {formData.logo && !errors.logo && (
                    <div className="relative mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80">
                      {isUploading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                          Subiendo…
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.logo}
                        alt="Vista previa del logo"
                        className="max-h-44 w-full object-contain sm:max-h-48"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-name" className="text-zinc-700 dark:text-zinc-300">
                    Nombre de la tienda *
                  </Label>
                  <Input
                    id="store-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Tienda Centro"
                    className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store-nit" className="text-zinc-700 dark:text-zinc-300">
                      NIT
                    </Label>
                    <Input
                      id="store-nit"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      placeholder="Ej: 900123456-7"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-city" className="text-zinc-700 dark:text-zinc-300">
                      Ciudad
                    </Label>
                    <Input
                      id="store-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Ej: Bogotá"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-phone" className="text-zinc-700 dark:text-zinc-300">
                    Teléfono
                  </Label>
                  <Input
                    id="store-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej: 300 123 4567"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-address" className="text-zinc-700 dark:text-zinc-300">
                    Dirección
                  </Label>
                  <textarea
                    id="store-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ej: Calle 10 # 20-30"
                    rows={3}
                    className={textareaClass}
                  />
                </div>
              </CardContent>
            </Card>

            <div
              className="flex justify-end gap-2 bg-white px-3 pb-3 pt-4 dark:bg-zinc-950 sm:gap-2.5 sm:px-6 sm:pb-4"
              style={{
                paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))'
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 w-full flex-1 touch-manipulation border border-zinc-300 bg-white text-sm font-medium text-zinc-700 shadow-none hover:translate-y-0 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading}
                className="h-9 w-full flex-1 touch-manipulation bg-zinc-900 text-sm font-medium text-white shadow-none hover:translate-y-0 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto sm:flex-none"
              >
                {isEdit ? 'Guardar cambios' : 'Registrar tienda'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
