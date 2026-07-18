'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { X, Tag, Plus, Trash2, FileText } from 'lucide-react'
import { Category } from '@/types'
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
  modalCardShellClass,
} from '@/lib/app-modal'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void
  onToggleStatus: (categoryId: string, newStatus: 'active' | 'inactive') => void
  onDelete: (categoryId: string) => void
  categories: Category[]
}

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
  categories,
}: CategoryModalProps) {
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      case 'inactive':
        return 'border-stone-200 bg-stone-50 text-stone-700 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300'
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'inactive':
        return 'Inactiva'
      default:
        return status
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })
      setFormData({
        name: '',
        description: '',
        status: 'active',
      })
      setErrors({})
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
    })
    setErrors({})
    onClose()
  }

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  const sortedCategories = [...categories].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return createPortal(
    <div className={appModalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-[min(94vw,72rem)]')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Tag className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2
                id="category-modal-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                Gestión de categorías
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                Crea nuevas categorías y gestiona las existentes
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            handleSave()
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={appModalBodyClass}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className={modalCardShellClass}>
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Información de la categoría
                  </h3>
                </div>
                <p className={cn(appModalHintClass, 'mb-3')}>Datos visibles al clasificar productos.</p>

                <div className="space-y-3">
                  <div>
                    <label className={appModalLabelClass} htmlFor="category-name">
                      Nombre de la categoría *
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className={cn(
                        appModalInputClass,
                        errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                      )}
                      placeholder="Nombre de la categoría"
                    />
                    {errors.name && <p className={appModalErrorClass}>{errors.name}</p>}
                  </div>

                  <div>
                    <label className={appModalLabelClass} htmlFor="category-description">
                      Descripción <span className="font-normal text-zinc-400">(opcional)</span>
                    </label>
                    <textarea
                      id="category-description"
                      value={formData.description}
                      onChange={e => handleInputChange('description', e.target.value)}
                      className={cn(appModalInputClass, 'min-h-20 resize-none')}
                      placeholder="Breve texto para clasificar la categoría"
                      rows={3}
                    />
                  </div>

                  <label
                    htmlFor="category-active"
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      formData.status === 'active'
                        ? 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/25'
                        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50'
                    )}
                  >
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Categoría activa
                      </span>
                      <span className={appModalHintClass}>
                        Si está desactivada, no estará disponible al crear productos.
                      </span>
                    </div>
                    <Switch
                      id="category-active"
                      checked={formData.status === 'active'}
                      onCheckedChange={checked =>
                        setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className={cn(modalCardShellClass, 'flex min-h-0 flex-col')}>
                <div className="mb-1 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Categorías existentes
                  </h3>
                </div>
                <p className={cn(appModalHintClass, 'mb-3')}>Lista ordenada por fecha de creación.</p>

                <div className="min-h-0 max-h-[min(28rem,50dvh)] flex-1 space-y-2 overflow-y-auto overscroll-contain">
                  {sortedCategories.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 transition-colors hover:bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{cat.name}</h4>
                          <Badge
                            variant="outline"
                            className={cn('border px-2 py-0 text-[11px] font-medium', getStatusColor(cat.status))}
                          >
                            {getStatusLabel(cat.status)}
                          </Badge>
                        </div>
                        <p className={cn(appModalHintClass, 'mt-1')}>
                          {cat.description?.trim() ? (
                            cat.description
                          ) : (
                            <span className="italic text-zinc-400 dark:text-zinc-500">Sin descripción</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch
                          checked={cat.status === 'active'}
                          onCheckedChange={on => onToggleStatus(cat.id, on ? 'active' : 'inactive')}
                          aria-label={
                            cat.status === 'active' ? 'Desactivar categoría' : 'Activar categoría'
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(cat.id)}
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
                      <Tag
                        className="mx-auto mb-3 h-8 w-8 text-zinc-400 dark:text-zinc-500"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <p className={appModalHintClass}>No hay categorías creadas</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Crear categoría
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
