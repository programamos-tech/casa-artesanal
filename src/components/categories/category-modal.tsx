'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { X, Tag, Plus, Trash2, FileText } from 'lucide-react'
import { Category } from '@/types'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

/** Acento de marca (iconos / foco) alineado con roles e inventario */
const accentIconClass = 'h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400'
/** Campos con un toque de color al enfocar */
const formInputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-brand-500/45 dark:focus:ring-brand-400/20'
const formLabelClass =
  'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
const sectionHeaderClass =
  'space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800'
const sectionTitleClass =
  'flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50'
const sectionIconClass = accentIconClass
const sectionContentClass = 'space-y-3 p-4 md:p-6 md:pt-4'

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
  categories 
}: CategoryModalProps) {
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400'
      case 'inactive':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400'
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
        status: formData.status
      })
      // Limpiar el formulario después de crear una categoría
      setFormData({
        name: '',
        description: '',
        status: 'active'
      })
      setErrors({})
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active'
    })
    setErrors({})
    onClose()
  }

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/[0.18] p-3 backdrop-blur-[3px] dark:bg-black/45 sm:p-6 sm:py-10 xl:left-60"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-brand-500/[0.07] dark:border-zinc-800 dark:bg-zinc-950 dark:ring-brand-400/10 sm:max-h-[min(94vh,920px)] sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-3">
            <Tag
              className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-lg">
                Gestión de categorías
              </h2>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                Crea nuevas categorías y gestiona las existentes.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide bg-gradient-to-b from-brand-50/45 via-white to-white px-4 py-5 dark:from-brand-950/20 dark:via-zinc-950 dark:to-zinc-950 md:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <Card className={cardShell}>
                <CardHeader className={sectionHeaderClass}>
                  <CardTitle className={sectionTitleClass}>
                    <FileText className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                    Información de la categoría
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Datos visibles al clasificar productos.
                  </p>
                </CardHeader>
                <CardContent className={sectionContentClass}>
                  <div>
                    <label className={formLabelClass} htmlFor="category-name">
                      Nombre de la categoría *
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={cn(formInputClass, errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500/25')}
                      placeholder="Nombre de la categoría"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                  </div>

                  <div>
                    <label className={cn(formLabelClass, 'flex flex-wrap items-baseline gap-x-1')} htmlFor="category-description">
                      <span>Descripción</span>
                      <span className="text-[11px] font-normal normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      id="category-description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={cn(formInputClass, 'min-h-[5.5rem] resize-y')}
                      placeholder="Breve texto para clasificar la categoría (opcional)"
                      rows={3}
                    />
                  </div>

                  <label
                    htmlFor="category-active"
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      formData.status === 'active'
                        ? 'border-brand-200/90 bg-brand-50/80 dark:border-brand-900/50 dark:bg-brand-950/30'
                        : 'border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40'
                    )}
                  >
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Categoría activa
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Si está desactivada, no estará disponible al crear productos.
                      </span>
                    </div>
                    <Switch
                      id="category-active"
                      checked={formData.status === 'active'}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                      }
                    />
                  </label>
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader className={sectionHeaderClass}>
                  <CardTitle className={sectionTitleClass}>
                    <Tag className={sectionIconClass} strokeWidth={1.5} aria-hidden />
                    Categorías existentes
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Lista ordenada por fecha de creación.
                  </p>
                </CardHeader>
                <CardContent className={cn(sectionContentClass, 'pt-4')}>
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-0.5">
                    {categories
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3 transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-zinc-900 dark:text-zinc-50">{cat.name}</h4>
                              <Badge className={getStatusColor(cat.status)}>{getStatusLabel(cat.status)}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {cat.description?.trim()
                                ? cat.description
                                : <span className="italic text-zinc-400 dark:text-zinc-500">Sin descripción</span>}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Switch
                              checked={cat.status === 'active'}
                              onCheckedChange={(on) =>
                                onToggleStatus(cat.id, on ? 'active' : 'inactive')
                              }
                              aria-label={
                                cat.status === 'active' ? 'Desactivar categoría' : 'Activar categoría'
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(cat.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {categories.length === 0 && (
                      <div className="rounded-lg border border-dashed border-brand-200/70 bg-brand-50/40 py-10 text-center dark:border-brand-900/40 dark:bg-brand-950/20">
                        <Tag
                          className="mx-auto mb-3 h-10 w-10 text-brand-400 dark:text-brand-600"
                          strokeWidth={1.25}
                          aria-hidden
                        />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay categorías creadas</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div
            className="flex flex-col-reverse justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
            }}
          >
            <Button type="button" variant="outline" size="sm" onClick={handleClose} className="h-10 w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-10 w-full gap-2 bg-brand-600 text-white shadow-none hover:bg-brand-700 focus-visible:ring-brand-500/50 dark:bg-brand-500 dark:hover:bg-brand-400 sm:w-auto [&_svg]:text-white"
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
              Crear categoría
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
