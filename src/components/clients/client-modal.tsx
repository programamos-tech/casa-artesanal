'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  UserPen,
  ToggleLeft,
} from 'lucide-react'
import { Client } from '@/types'
import { cn } from '@/lib/utils'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id'>) => void
  client?: Client | null
}

const inputBase =
  'casa-artesanal-preserve-surface w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 placeholder:opacity-100 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-violet-400 dark:focus:ring-violet-400/25'

/** Tonos alineados con KPI / reportes (dashboard) */
const tone = {
  basic: 'text-slate-600 dark:text-slate-400',
  contact: 'text-violet-600 dark:text-violet-400',
  location: 'text-teal-600 dark:text-teal-400',
  status: 'text-amber-600 dark:text-amber-400',
  active: 'text-green-600 dark:text-green-400',
} as const

function SectionCard({
  icon: Icon,
  title,
  iconClassName,
  children,
}: {
  icon: typeof User
  title: string
  iconClassName: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-indigo-100/90 bg-white p-3 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/15 md:p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className={cn('h-5 w-5 shrink-0', iconClassName)} strokeWidth={1.75} aria-hidden />
        <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
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
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  const isEdit = !!client

  const typeOptions = [
    { value: 'mayorista' as const, label: 'Mayorista' },
    { value: 'minorista' as const, label: 'Minorista' },
    { value: 'consumidor_final' as const, label: 'Consumidor Final' },
  ]

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 py-2 backdrop-blur-md dark:bg-black/75 xl:left-56 px-[clamp(1.25rem,8vw,7rem)] sm:px-[clamp(1.75rem,11vw,9rem)] lg:px-[clamp(2rem,14vw,11rem)]">
      <div
        className="casa-artesanal-preserve-surface flex max-h-[min(calc(100dvh-1rem),calc(100vh-1rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/35 via-zinc-50 to-zinc-50 shadow-2xl dark:border-indigo-900/35 dark:from-indigo-950/25 dark:via-zinc-950 dark:to-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/70 px-4 py-2.5 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/30 md:px-6 md:py-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 dark:border-indigo-700/50 dark:bg-indigo-950/50">
              <UserPen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="client-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                {isEdit ? 'Modifica la información del cliente' : 'Agrega un nuevo cliente al sistema'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50/90 px-4 py-2.5 dark:bg-zinc-950 md:px-6 md:py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-2 md:gap-4 md:items-stretch">
            <SectionCard icon={User} title="Información Básica" iconClassName={tone.basic}>
              <div className="flex h-full flex-col space-y-4">
                <div>
                  <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Nombre del Cliente <span className="text-zinc-500">*</span>
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej. María Pérez García"
                    autoComplete="name"
                    className={cn(inputBase, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                  />
                  {errors.name && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                </div>

                <div className="mt-auto">
                  <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Cliente</span>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-200/95 bg-zinc-100/90 p-1 shadow-inner dark:border-zinc-700 dark:bg-zinc-900/60"
                    role="group"
                    aria-label="Tipo de cliente"
                  >
                    {typeOptions.map((opt) => {
                      const Icon = getTypeIcon(opt.value)
                      const active = formData.type === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleInputChange('type', opt.value)}
                          className={cn(
                            'flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center transition-all',
                            active
                              ? 'bg-white shadow-sm ring-1 ring-zinc-200/95 dark:bg-zinc-950 dark:ring-zinc-600'
                              : 'text-zinc-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4',
                              active ? tone.contact : 'text-zinc-400 dark:text-zinc-500'
                            )}
                          />
                          <span className="line-clamp-2 max-w-full text-[10px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-[11px]">
                            {opt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Mail} title="Información de Contacto" iconClassName={tone.contact}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-document" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Cédula/NIT <span className="text-zinc-500">*</span>
                  </label>
                  <input
                    id="client-document"
                    type="text"
                    value={formData.document}
                    onChange={(e) => handleInputChange('document', e.target.value)}
                    placeholder="Cédula o NIT"
                    autoComplete="off"
                    className={cn(inputBase, errors.document && 'border-red-500/70')}
                  />
                  {errors.document && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.document}</p>}
                </div>

                <div>
                  <label htmlFor="client-phone" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Teléfono
                  </label>
                  <input
                    id="client-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    autoComplete="tel"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label htmlFor="client-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    className={cn(inputBase, errors.email && 'border-red-500/70')}
                  />
                  {errors.email && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
                    Si no tienes email, déjalo vacío o escribe &quot;N/A&quot;
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Información de Ubicación" iconClassName={tone.location}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-address" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Dirección
                  </label>
                  <input
                    id="client-address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Calle, número, barrio"
                    autoComplete="street-address"
                    className={inputBase}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="client-city" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Ciudad
                    </label>
                    <input
                      id="client-city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Ej. Sincelejo"
                      autoComplete="address-level2"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="client-state" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Estado
                    </label>
                    <input
                      id="client-state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Ej. Sucre"
                      autoComplete="address-level1"
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={ToggleLeft} title="Estado del Cliente" iconClassName={tone.status}>
              <fieldset className="flex h-full min-h-[7rem] flex-col justify-center gap-3 sm:min-h-0">
                <legend className="sr-only">Estado del cliente</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
                      formData.status === 'active'
                        ? 'border-green-300/90 bg-green-50/95 ring-1 ring-green-400/25 dark:border-green-800/60 dark:bg-green-950/35 dark:ring-green-500/20'
                        : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600'
                    )}
                  >
                    <input
                      type="radio"
                      name="client-status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="h-4 w-4 shrink-0 border-zinc-400 bg-white accent-green-600 focus:ring-2 focus:ring-green-500/35 focus:ring-offset-2 focus:ring-offset-white dark:border-zinc-500 dark:bg-zinc-800 dark:accent-green-500 dark:focus:ring-offset-zinc-950"
                    />
                    <span className={cn('text-sm font-semibold', tone.active)}>Activo</span>
                  </label>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors',
                      formData.status === 'inactive'
                        ? 'border-zinc-400/90 bg-zinc-100/95 ring-1 ring-zinc-400/20 dark:border-zinc-600 dark:bg-zinc-800/60 dark:ring-zinc-500/15'
                        : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600'
                    )}
                  >
                    <input
                      type="radio"
                      name="client-status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="h-4 w-4 shrink-0 border-zinc-400 bg-white accent-zinc-500 focus:ring-2 focus:ring-zinc-400/35 focus:ring-offset-2 focus:ring-offset-white dark:border-zinc-500 dark:bg-zinc-800 dark:focus:ring-offset-zinc-950"
                    />
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Inactivo</span>
                  </label>
                </div>
              </fieldset>
            </SectionCard>
          </div>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-indigo-100/80 bg-white/95 px-4 py-2.5 backdrop-blur-sm dark:border-indigo-900/40 dark:bg-zinc-950/95 md:px-6 md:py-3"
          style={{ paddingBottom: `max(0.625rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))` }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-500/80 dark:bg-transparent dark:text-white dark:hover:bg-zinc-800/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-transparent bg-brand-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {isEdit ? 'Actualizar Cliente' : 'Crear Cliente'}
          </button>
        </footer>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
