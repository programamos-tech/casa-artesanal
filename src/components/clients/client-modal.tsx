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
  'w-full rounded-lg border border-zinc-600/80 bg-zinc-800/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20'

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
    <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/40 p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      </div>
      {children}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md dark:bg-black/75 xl:left-56">
      <div
        className="flex max-h-[min(100dvh,100vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-4 py-4 md:px-6 md:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-600/90 bg-zinc-800/80">
              <UserPen className="h-5 w-5 text-zinc-300" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="client-modal-title" className="text-lg font-bold tracking-tight text-white md:text-xl">
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                {isEdit ? 'Modifica la información del cliente' : 'Agrega un nuevo cliente al sistema'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-950 px-4 py-4 md:px-6 md:py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <SectionCard icon={User} title="Información Básica">
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Nombre del Cliente <span className="text-zinc-500">*</span>
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={cn(inputBase, errors.name && 'border-red-500/70 ring-1 ring-red-500/30')}
                  />
                  {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Tipo de Cliente</span>
                  <div className="flex rounded-xl bg-zinc-800/90 p-1 ring-1 ring-zinc-700/80">
                    {typeOptions.map((opt) => {
                      const Icon = getTypeIcon(opt.value)
                      const active = formData.type === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleInputChange('type', opt.value)}
                          className={cn(
                            'flex min-h-[2.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-all sm:flex-row sm:text-sm',
                            active
                              ? 'bg-white text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4',
                              active ? 'text-zinc-800' : 'text-zinc-500'
                            )}
                          />
                          <span className="leading-tight">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Mail} title="Información de Contacto">
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-document" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Cédula/NIT <span className="text-zinc-500">*</span>
                  </label>
                  <input
                    id="client-document"
                    type="text"
                    value={formData.document}
                    onChange={(e) => handleInputChange('document', e.target.value)}
                    className={cn(inputBase, errors.document && 'border-red-500/70')}
                  />
                  {errors.document && <p className="mt-1.5 text-sm text-red-400">{errors.document}</p>}
                </div>

                <div>
                  <label htmlFor="client-phone" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Teléfono
                  </label>
                  <input
                    id="client-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label htmlFor="client-email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Email <span className="font-normal text-zinc-500">(opcional)</span>
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={cn(inputBase, errors.email && 'border-red-500/70')}
                  />
                  {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>}
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                    Si no tienes email, déjalo vacío o escribe &quot;N/A&quot;
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Información de Ubicación">
              <div className="space-y-4">
                <div>
                  <label htmlFor="client-address" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Dirección
                  </label>
                  <input
                    id="client-address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="client-city" className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Ciudad
                    </label>
                    <input
                      id="client-city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="client-state" className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Estado
                    </label>
                    <input
                      id="client-state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={ToggleLeft} title="Estado del Cliente">
              <fieldset className="flex flex-wrap gap-6">
                <legend className="sr-only">Estado del cliente</legend>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    name="client-status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="h-4 w-4 border-zinc-500 bg-zinc-800 accent-zinc-300 focus:ring-2 focus:ring-zinc-400/30 focus:ring-offset-0 focus:ring-offset-zinc-950"
                  />
                  <span className="text-sm font-medium text-zinc-200">Activo</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="radio"
                    name="client-status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="h-4 w-4 border-zinc-500 bg-zinc-800 accent-zinc-300 focus:ring-2 focus:ring-zinc-400/30 focus:ring-offset-0 focus:ring-offset-zinc-950"
                  />
                  <span className="text-sm font-medium text-zinc-200">Inactivo</span>
                </label>
              </fieldset>
            </SectionCard>
          </div>
        </div>

        <footer
          className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-4 md:px-6"
          style={{ paddingBottom: `max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))` }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-500/80 bg-transparent px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-100"
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
