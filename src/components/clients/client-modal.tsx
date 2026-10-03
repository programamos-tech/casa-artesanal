'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { Client } from '@/types'
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

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id'>) => void
  client?: Client | null
}

const typeOptions: { value: Client['type']; label: string; tone: ReportTone }[] = [
  { value: 'consumidor_final', label: 'Cliente final', tone: 'info' },
  { value: 'mayorista', label: 'Mayorista', tone: 'warning' },
  { value: 'minorista', label: 'Minorista', tone: 'neutral' },
]

const statusOptions: { value: Client['status']; label: string; tone: ReportTone }[] = [
  { value: 'active', label: 'Activo', tone: 'success' },
  { value: 'inactive', label: 'Inactivo', tone: 'neutral' },
]

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  document: '',
  address: '',
  city: '',
  state: '',
  type: 'consumidor_final' as Client['type'],
  status: 'active' as Client['status'],
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/45">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
  showLabel = true,
}: {
  label: string
  value: T
  options: { value: T; label: string; tone: ReportTone }[]
  onChange: (value: T) => void
  showLabel?: boolean
}) {
  return (
    <div>
      {showLabel ? <span className={modalLabelClass}>{label}</span> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className="casa-artesanal-preserve-surface grid gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map(option => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
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
    </div>
  )
}

export function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const [formData, setFormData] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        document: client.document || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        type: client.type || 'consumidor_final',
        status: client.status || 'active',
      })
    } else {
      setFormData(emptyForm)
    }
    setErrors({})
  }, [client])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (!formData.document.trim()) {
      newErrors.document = 'La cédula/NIT es obligatoria'
    }

    const emailValue = formData.email.trim()
    if (emailValue && emailValue.toLowerCase() !== 'n/a' && !/\S+@\S+\.\S+/.test(emailValue)) {
      newErrors.email = 'El email no es válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    setFormData(emptyForm)
    setErrors({})
    onClose()
  }

  const handleSave = () => {
    if (!validateForm()) return

    const emailValue = formData.email.trim()
    const processedEmail = emailValue && emailValue.toLowerCase() !== 'n/a' ? emailValue : ''

    onSave({
      name: formData.name.trim(),
      email: processedEmail,
      phone: formData.phone.trim(),
      document: formData.document.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      type: formData.type,
      status: formData.status,
      creditLimit: 0,
      currentDebt: 0,
      createdAt: client?.createdAt || new Date().toISOString(),
    })
    handleClose()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  const isEdit = !!client
  const formId = 'client-modal-form'

  const modal = (
    <div className={modalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(modalPanelClass, 'max-w-4xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <header className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="client-modal-title" className={modalTitleClass}>
              {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <p className={modalSubtitleClass}>
              {isEdit ? client.name : 'Datos de contacto, tipo y ubicación.'}
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
                    <div>
                      <label htmlFor="client-name" className={modalLabelClass}>
                        Nombre <span className="text-zinc-400 dark:text-white/30">*</span>
                      </label>
                      <input
                        id="client-name"
                        type="text"
                        value={formData.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        placeholder="Nombre del cliente"
                        autoComplete="name"
                        autoFocus={!isEdit}
                        className={cn(modalInputClass, errors.name && modalInputErrorClass)}
                      />
                      {errors.name && <p className={modalErrorClass}>{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="client-document" className={modalLabelClass}>
                        Cédula / NIT <span className="text-zinc-400 dark:text-white/30">*</span>
                      </label>
                      <input
                        id="client-document"
                        type="text"
                        value={formData.document}
                        onChange={e => handleInputChange('document', e.target.value)}
                        placeholder="Cédula o NIT"
                        autoComplete="off"
                        className={cn(modalInputClass, 'tabular-nums', errors.document && modalInputErrorClass)}
                      />
                      {errors.document && <p className={modalErrorClass}>{errors.document}</p>}
                    </div>

                    <SegmentedChoice
                      label="Tipo de cliente"
                      value={formData.type}
                      options={typeOptions}
                      onChange={value => handleInputChange('type', value)}
                    />
                  </div>
                </FormSection>

                <FormSection title="Estado">
                  <SegmentedChoice
                    label="Estado del cliente"
                    showLabel={false}
                    value={formData.status}
                    options={statusOptions}
                    onChange={value => handleInputChange('status', value)}
                  />
                </FormSection>
              </div>

              <div className="space-y-7">
                <FormSection title="Contacto">
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="client-phone" className={modalLabelClass}>
                        Teléfono <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                      </label>
                      <input
                        id="client-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                        placeholder="300 123 4567"
                        autoComplete="tel"
                        className={modalInputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="client-email" className={modalLabelClass}>
                        Email <span className="font-normal text-zinc-400 dark:text-white/30">(opcional)</span>
                      </label>
                      <input
                        id="client-email"
                        type="email"
                        value={formData.email}
                        onChange={e => handleInputChange('email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        autoComplete="email"
                        className={cn(modalInputClass, errors.email && modalInputErrorClass)}
                      />
                      {errors.email ? (
                        <p className={modalErrorClass}>{errors.email}</p>
                      ) : (
                        <p className={modalHintClass}>Si no tiene correo, déjalo vacío.</p>
                      )}
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Ubicación" description="Opcional. Sirve para identificar al cliente.">
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="client-address" className={modalLabelClass}>
                        Dirección
                      </label>
                      <input
                        id="client-address"
                        type="text"
                        value={formData.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        placeholder="Calle, número, barrio"
                        autoComplete="street-address"
                        className={modalInputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="client-city" className={modalLabelClass}>
                          Ciudad
                        </label>
                        <input
                          id="client-city"
                          type="text"
                          value={formData.city}
                          onChange={e => handleInputChange('city', e.target.value)}
                          placeholder="Sincelejo"
                          autoComplete="address-level2"
                          className={modalInputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="client-state" className={modalLabelClass}>
                          Departamento
                        </label>
                        <input
                          id="client-state"
                          type="text"
                          value={formData.state}
                          onChange={e => handleInputChange('state', e.target.value)}
                          placeholder="Sucre"
                          autoComplete="address-level1"
                          className={modalInputClass}
                        />
                      </div>
                    </div>
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
          <button type="button" onClick={handleClose} className={modalSecondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={modalPrimaryButtonClass}>
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
