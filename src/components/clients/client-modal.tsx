'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  User,
  Building2,
  Mail,
  MapPin,
  UserPen,
  ToggleLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Client } from '@/types'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
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

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id'>) => void
  client?: Client | null
}

const sectionCardClass = cn(cardShell, 'flex h-full min-h-0 flex-col p-4 shadow-sm')

const statusOptions = [
  {
    value: 'active' as const,
    label: 'Activo',
    idle: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-700/90 hover:border-emerald-300/80 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/90',
    selected:
      'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200/80 dark:border-emerald-700/60 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-800/50',
  },
  {
    value: 'inactive' as const,
    label: 'Inactivo',
    idle: 'border-stone-200/80 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100/80 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-300',
    selected:
      'border-stone-300 bg-stone-100 text-stone-700 shadow-sm ring-1 ring-stone-200/80 dark:border-zinc-500/70 dark:bg-zinc-700/60 dark:text-zinc-100 dark:ring-zinc-600/50',
  },
]

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={sectionCardClass}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

export function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    document: client?.document || '',
    address: client?.address || '',
    city: client?.city || '',
    state: client?.state || '',
    type: client?.type || 'consumidor_final',
    status: client?.status || 'active',
  })

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
      setFormData({
        name: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        city: '',
        state: '',
        type: 'consumidor_final',
        status: 'active',
      })
    }
    setErrors({})
  }, [client])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mayorista':
      case 'minorista':
        return Building2
      default:
        return User
    }
  }

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

  const handleSave = () => {
    if (validateForm()) {
      const emailValue = formData.email.trim()
      const processedEmail = emailValue && emailValue.toLowerCase() !== 'n/a' ? emailValue : ''

      const clientData: Omit<Client, 'id'> = {
        name: formData.name.trim(),
        email: processedEmail,
        phone: formData.phone.trim(),
        document: formData.document.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        type: formData.type as Client['type'],
        status: formData.status as Client['status'],
        creditLimit: 0,
        currentDebt: 0,
        createdAt: new Date().toISOString(),
      }

      onSave(clientData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      address: '',
      city: '',
      state: '',
      type: 'consumidor_final',
      status: 'active',
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  const isEdit = !!client

  const typeOptions = [
    {
      value: 'consumidor_final' as const,
      label: 'Cliente final',
      selected:
        'border-sky-300 bg-sky-50 text-sky-800 shadow-sm ring-1 ring-sky-200/80 dark:border-sky-700/70 dark:bg-sky-950/45 dark:text-sky-200 dark:ring-sky-800/60',
    },
    {
      value: 'mayorista' as const,
      label: 'Cliente mayorista',
      selected:
        'border-violet-300 bg-violet-50 text-violet-800 shadow-sm ring-1 ring-violet-200/80 dark:border-violet-700/70 dark:bg-violet-950/45 dark:text-violet-200 dark:ring-violet-800/60',
    },
    {
      value: 'minorista' as const,
      label: 'Minorista',
      selected:
        'border-amber-300 bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-200/80 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60',
    },
  ]

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-5xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <UserPen className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2
                id="client-modal-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {isEdit ? 'Modifica la información del cliente' : 'Agrega un nuevo cliente al sistema'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div className={appModalBodyClass}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
            <SectionCard icon={User} title="Información Básica">
              <div className="flex h-full flex-col space-y-3">
                <div>
                  <label htmlFor="client-name" className={appModalLabelClass}>
                    Nombre del Cliente <span className="text-zinc-400">*</span>
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="Ej. María Pérez García"
                    autoComplete="name"
                    className={cn(
                      appModalInputClass,
                      errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                  />
                  {errors.name && <p className={appModalErrorClass}>{errors.name}</p>}
                </div>

                <div className="mt-auto">
                  <span className={appModalLabelClass}>Tipo de Cliente</span>
                  <div
                    className="grid grid-cols-3 gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-900/50"
                    role="group"
                    aria-label="Tipo de cliente"
                  >
                    {typeOptions.map(opt => {
                      const Icon = getTypeIcon(opt.value)
                      const active = formData.type === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleInputChange('type', opt.value)}
                          aria-pressed={active}
                          className={cn(
                            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border border-transparent px-1 text-center transition-all',
                            active
                              ? opt.selected
                              : 'text-zinc-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              active ? 'text-current' : 'text-zinc-400 dark:text-zinc-500'
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="line-clamp-2 max-w-full text-[10px] font-semibold leading-tight sm:text-[11px]">
                            {opt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Mail} title="Información de Contacto">
              <div className="space-y-3">
                <div>
                  <label htmlFor="client-document" className={appModalLabelClass}>
                    Cédula/NIT <span className="text-zinc-400">*</span>
                  </label>
                  <input
                    id="client-document"
                    type="text"
                    value={formData.document}
                    onChange={e => handleInputChange('document', e.target.value)}
                    placeholder="Cédula o NIT"
                    autoComplete="off"
                    className={cn(
                      appModalInputClass,
                      errors.document && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                  />
                  {errors.document && <p className={appModalErrorClass}>{errors.document}</p>}
                </div>

                <div>
                  <label htmlFor="client-phone" className={appModalLabelClass}>
                    Teléfono
                  </label>
                  <input
                    id="client-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    autoComplete="tel"
                    className={appModalInputClass}
                  />
                </div>

                <div>
                  <label htmlFor="client-email" className={appModalLabelClass}>
                    Email <span className="font-normal text-zinc-400">(opcional)</span>
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    className={cn(
                      appModalInputClass,
                      errors.email && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                  />
                  {errors.email && <p className={appModalErrorClass}>{errors.email}</p>}
                  <p className={cn(appModalHintClass, 'mt-1')}>
                    Si no tienes email, déjalo vacío o escribe &quot;N/A&quot;
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Información de Ubicación">
              <div className="space-y-3">
                <div>
                  <label htmlFor="client-address" className={appModalLabelClass}>
                    Dirección
                  </label>
                  <input
                    id="client-address"
                    type="text"
                    value={formData.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    placeholder="Calle, número, barrio"
                    autoComplete="street-address"
                    className={appModalInputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="client-city" className={appModalLabelClass}>
                      Ciudad
                    </label>
                    <input
                      id="client-city"
                      type="text"
                      value={formData.city}
                      onChange={e => handleInputChange('city', e.target.value)}
                      placeholder="Ej. Sincelejo"
                      autoComplete="address-level2"
                      className={appModalInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="client-state" className={appModalLabelClass}>
                      Estado
                    </label>
                    <input
                      id="client-state"
                      type="text"
                      value={formData.state}
                      onChange={e => handleInputChange('state', e.target.value)}
                      placeholder="Ej. Sucre"
                      autoComplete="address-level1"
                      className={appModalInputClass}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={ToggleLeft} title="Estado del Cliente">
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map(option => {
                  const selected = formData.status === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('status', option.value)}
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex items-center justify-center rounded-lg border px-2.5 py-2.5 text-xs font-semibold transition-all',
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

        <div className={appModalFooterClass}>
          <Button type="button" variant="destructive" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            {isEdit ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
