'use client'

import { useState, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, Trash2 } from 'lucide-react'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { Switch } from '@/components/ui/switch'
import { Category } from '@/types'
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

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void
  onToggleStatus: (categoryId: string, newStatus: 'active' | 'inactive') => void
  onDelete: (categoryId: string) => void
  categories: Category[]
}

const statusOptions: { value: 'active' | 'inactive'; label: string; tone: ReportTone }[] = [
  { value: 'active', label: 'Activa', tone: 'success' },
  { value: 'inactive', label: 'Inactiva', tone: 'neutral' },
]

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
  const listRef = useRef<HTMLUListElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(false)

  useLayoutEffect(() => {
    const el = listRef.current
    if (!isOpen || !el) {
      setCanScrollDown(false)
      return
    }

    const update = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      setCanScrollDown(remaining > 12)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [isOpen, mounted, categories.length])

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

  if (!isOpen) return null

  const sortedCategories = [...categories].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const formId = 'category-modal-form'

  const modal = (
    <div className={modalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(modalPanelClass, 'max-w-5xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <header className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="category-modal-title" className={modalTitleClass}>
              Gestión de categorías
            </h2>
            <p className={modalSubtitleClass}>Crea nuevas categorías y gestiona las existentes</p>
          </div>
          <button type="button" onClick={handleClose} className={modalCloseButtonClass} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className={cn(modalBodyClass, 'flex min-h-0 flex-col')}>
          <form
            id={formId}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={e => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-x-10 gap-y-7 lg:grid-cols-2 lg:grid-rows-1">
              <FormSection title="Información de la categoría" description="Datos visibles al clasificar productos.">
                <div className="space-y-3.5">
                  <div>
                    <label className={modalLabelClass} htmlFor="category-name">
                      Nombre <span className="text-zinc-400 dark:text-white/30">*</span>
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className={cn(modalInputClass, errors.name && modalInputErrorClass)}
                      placeholder="Nombre de la categoría"
                      autoFocus
                    />
                    {errors.name && <p className={modalErrorClass}>{errors.name}</p>}
                  </div>

                  <div>
                    <label className={modalLabelClass} htmlFor="category-description">
                      Descripción <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                    </label>
                    <textarea
                      id="category-description"
                      value={formData.description}
                      onChange={e => handleInputChange('description', e.target.value)}
                      className={cn(modalInputClass, 'h-auto min-h-[4.5rem] resize-none py-2')}
                      placeholder="Breve texto para clasificar la categoría"
                      rows={3}
                    />
                  </div>

                  <div>
                    <span className={modalLabelClass}>Estado</span>
                    <div
                      role="radiogroup"
                      aria-label="Estado de la categoría"
                      className="casa-artesanal-preserve-surface grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
                    >
                      {statusOptions.map(option => {
                        const selected = formData.status === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
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
                    <p className={modalHintClass}>Si está desactivada, no estará disponible al crear productos.</p>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Categorías existentes"
                description="Lista ordenada por fecha de creación."
                className="flex min-h-0 flex-col overflow-hidden"
              >
                {sortedCategories.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-zinc-500 dark:text-white/45">
                    No hay categorías creadas
                  </p>
                ) : (
                  <div className="relative min-h-0 flex-1">
                    <ul
                      ref={listRef}
                      className="h-full divide-y divide-zinc-200 overflow-y-auto overscroll-contain dark:divide-white/[0.07]"
                    >
                      {sortedCategories.map(cat => (
                        <li key={cat.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                          <h4 className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-900 dark:text-white">
                            {cat.name}
                          </h4>
                          <Switch
                            checked={cat.status === 'active'}
                            onCheckedChange={on => onToggleStatus(cat.id, on ? 'active' : 'inactive')}
                            aria-label={cat.status === 'active' ? 'Desactivar categoría' : 'Activar categoría'}
                          />
                          <button
                            type="button"
                            onClick={() => onDelete(cat.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 dark:text-white/40 dark:hover:text-rose-400"
                            title="Eliminar categoría"
                            aria-label={`Eliminar ${cat.name}`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {canScrollDown ? (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-white from-30% via-white/85 to-transparent pb-1.5 dark:from-[#111113] dark:via-[#111113]/90"
                        aria-hidden
                      >
                        <ChevronDown className="h-5 w-5 text-zinc-500 dark:text-white/70" strokeWidth={2} />
                      </div>
                    ) : null}
                  </div>
                )}
              </FormSection>
            </div>
          </form>
        </div>

        <footer
          className={modalFooterClass}
          style={{ paddingBottom: `max(0.875rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))` }}
        >
          <button type="button" onClick={handleClose} className={modalSecondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={modalPrimaryButtonClass}>
            Crear categoría
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
