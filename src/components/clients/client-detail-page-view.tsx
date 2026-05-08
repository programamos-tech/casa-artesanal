'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Edit,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
  FileText,
  Calendar,
  Hash,
  Store,
  Copy,
  Receipt,
  Wallet,
  TrendingDown,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Client, Credit } from '@/types'
import {
  creditStatusBadgeClass,
  creditStatusLabel,
  getEffectiveCreditStatus,
} from '@/lib/credit-status-ui'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const panel =
  'rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50'

const linkOutlineSm = cn(
  'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 shadow-none transition-colors duration-150 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/45 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70 sm:flex-none'
)

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20'

export type ClientDetailEditDraft = Pick<
  Client,
  'name' | 'email' | 'phone' | 'document' | 'address' | 'city' | 'state' | 'type' | 'status'
>

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

function getTypeLabel(type: Client['type']) {
  switch (type) {
    case 'mayorista':
      return 'Mayorista'
    case 'minorista':
      return 'Minorista'
    case 'consumidor_final':
      return 'Cliente final'
    default:
      return type
  }
}

function getTypeBadgeClass(type: Client['type']) {
  switch (type) {
    case 'minorista':
      return 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    case 'mayorista':
      return 'border-sky-500/25 bg-sky-500/[0.06] text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300/90'
    case 'consumidor_final':
      return 'border-violet-500/25 bg-violet-500/[0.06] text-violet-950 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300/90'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function getStatusBadgeClass(status: Client['status']) {
  return status === 'active'
    ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
}

function storeLabel(storeId?: string) {
  if (!storeId || storeId === MAIN_STORE_ID) return 'Tienda principal'
  return 'Microtienda'
}

function storeSublabel(storeId?: string) {
  if (!storeId || storeId === MAIN_STORE_ID) return null
  return storeId
}


export interface ClientDetailPageViewProps {
  client: Client
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  canMutate: boolean
  credits?: Credit[]
  creditsLoading?: boolean
  /** Edición en la misma vista */
  editing: boolean
  draft: ClientDetailEditDraft | null
  onDraftChange: (patch: Partial<ClientDetailEditDraft>) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  saving?: boolean
  editErrors?: Record<string, string>
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40',
        className
      )}
    >
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  )
}

const typeOptions: { value: Client['type']; label: string }[] = [
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'minorista', label: 'Minorista' },
  { value: 'consumidor_final', label: 'Cliente final' },
]

export function ClientDetailPageView({
  client,
  onBack,
  onEdit,
  onDelete,
  canMutate,
  credits = [],
  creditsLoading = false,
  editing,
  draft,
  onDraftChange,
  onCancelEdit,
  onSaveEdit,
  saving = false,
  editErrors = {},
}: ClientDetailPageViewProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const displayType = editing && draft ? draft.type : client.type
  const TypeIcon = displayType === 'consumidor_final' ? User : Building2
  const displayName = editing && draft ? draft.name : client.name

  const availableCredit = Math.max(0, client.creditLimit - client.currentDebt)
  const usagePct =
    client.creditLimit > 0 ? Math.min(100, Math.round((client.currentDebt / client.creditLimit) * 100)) : 0

  const totalPendingCredits = credits.reduce((sum, c) => sum + (c.pendingAmount > 0 ? c.pendingAmount : 0), 0)
  const activeCreditsCount = credits.filter((c) => c.pendingAmount > 0 && c.status !== 'cancelled').length

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(client.id)
      toast.success('ID del cliente copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const recentCredits = credits.slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:py-5 md:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <UserAvatar name={displayName || client.name} seed={client.id} size="lg" className="ring-2 ring-zinc-200/80 dark:ring-zinc-700" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ficha del cliente</p>
              {editing && draft ? (
                <>
                  <div className="mt-2 space-y-2">
                    <label htmlFor="detail-client-name" className="sr-only">
                      Nombre
                    </label>
                    <input
                      id="detail-client-name"
                      type="text"
                      value={draft.name}
                      onChange={(e) => onDraftChange({ name: e.target.value })}
                      className={cn(inputClass, 'mt-0 text-lg font-semibold', editErrors.name && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50')}
                      placeholder="Nombre del cliente"
                    />
                    {editErrors.name && <p className="text-xs text-red-600 dark:text-red-400">{editErrors.name}</p>}
                    <label htmlFor="detail-client-document" className="sr-only">
                      Documento
                    </label>
                    <input
                      id="detail-client-document"
                      type="text"
                      value={draft.document}
                      onChange={(e) => onDraftChange({ document: e.target.value })}
                      className={cn(inputClass, 'font-mono text-sm', editErrors.document && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50')}
                      placeholder="Cédula / NIT"
                    />
                    {editErrors.document && <p className="text-xs text-red-600 dark:text-red-400">{editErrors.document}</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="flex min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-900/80 sm:max-w-md">
                      {typeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onDraftChange({ type: opt.value })}
                          className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm',
                            draft.type === opt.value
                              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="radio"
                        name="detail-status"
                        checked={draft.status === 'active'}
                        onChange={() => onDraftChange({ status: 'active' })}
                        className="h-4 w-4 border-zinc-400 text-zinc-900 focus:ring-zinc-400"
                      />
                      Activo
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="radio"
                        name="detail-status"
                        checked={draft.status === 'inactive'}
                        onChange={() => onDraftChange({ status: 'inactive' })}
                        className="h-4 w-4 border-zinc-400 text-zinc-900 focus:ring-zinc-400"
                      />
                      Inactivo
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <TypeIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                    <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                      {client.name}
                    </h1>
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-zinc-600 dark:text-zinc-300">{client.document}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn('border px-2 py-0.5 text-[11px] font-normal', getTypeBadgeClass(client.type))}>
                      {getTypeLabel(client.type)}
                    </Badge>
                    <Badge variant="outline" className={cn('border px-2 py-0.5 text-[11px] font-normal', getStatusBadgeClass(client.status))}>
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex-1 sm:flex-none" disabled={saving}>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              Volver
            </Button>
            <Link href={`/payments/${client.id}`} className={cn(linkOutlineSm, saving && 'pointer-events-none opacity-50')}>
              <CreditCard className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              Créditos
            </Link>
            {canMutate && !editing && (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={onEdit} className="flex-1 sm:flex-none">
                  <Edit className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 sm:flex-none"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Eliminar
                </Button>
              </>
            )}
            {canMutate && editing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="flex-1 sm:flex-none"
                >
                  <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={onSaveEdit} disabled={saving} className="flex-1 sm:flex-none">
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-4 px-4 py-6 md:space-y-5 md:px-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={Wallet} label="Cupo de crédito" value={formatCurrency(client.creditLimit)} />
          <StatCard icon={TrendingDown} label="Saldo adeudado" value={formatCurrency(client.currentDebt)} />
          <StatCard icon={Receipt} label="Cupo disponible" value={formatCurrency(availableCredit)} />
        </section>

        {client.creditLimit > 0 && (
          <section className={cn(panel, 'p-4 md:px-6 md:py-5')}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Uso del cupo</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {usagePct}% del cupo en uso frente al límite configurado
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{usagePct}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-700 transition-[width] dark:bg-zinc-300"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </section>
        )}

        <section className={cn(panel, 'p-4 md:p-6')}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <Hash className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            Identificación
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!editing && (
              <>
                <Field label="Documento">{client.document}</Field>
                <Field label="Tipo">{getTypeLabel(client.type)}</Field>
                <Field label="Estado en sistema">{client.status === 'active' ? 'Activo' : 'Inactivo'}</Field>
              </>
            )}
            {editing && (
              <p className="col-span-full text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
                Nombre, documento, tipo y estado se editan arriba en la cabecera.
              </p>
            )}
            <Field label="Tienda asignada">
              <span className="inline-flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                <span>{storeLabel(client.storeId)}</span>
              </span>
              {storeSublabel(client.storeId) && (
                <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">{storeSublabel(client.storeId)}</p>
              )}
            </Field>
            <Field label="Alta en el sistema">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                {formatDateTime(client.createdAt)}
              </span>
            </Field>
            <Field label="ID interno">
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {client.id}
                </code>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => void copyId()}>
                  <Copy className="h-3 w-3" strokeWidth={1.5} />
                  Copiar
                </Button>
              </div>
            </Field>
            {client.nit ? <Field label="NIT / complemento">{client.nit}</Field> : null}
          </dl>
        </section>

        <section className={cn(panel, 'p-4 md:p-6')}>
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">Contacto</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Correo">
              {editing && draft ? (
                <>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => onDraftChange({ email: e.target.value })}
                    className={cn(inputClass, editErrors.email && 'border-red-500 ring-1 ring-red-200 dark:ring-red-900/50')}
                    placeholder="correo@ejemplo.com (opcional)"
                  />
                  {editErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.email}</p>}
                  <p className="mt-1 text-xs text-zinc-500">Vacío o N/A si no aplica.</p>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200">
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-zinc-500">Sin correo</span>
                  )}
                </span>
              )}
            </Field>
            <Field label="Teléfono">
              {editing && draft ? (
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => onDraftChange({ phone: e.target.value })}
                  className={inputClass}
                  placeholder="Teléfono"
                />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                  {client.phone ? (
                    <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200">
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-zinc-500">Sin teléfono</span>
                  )}
                </span>
              )}
            </Field>
          </dl>
        </section>

        <section className={cn(panel, 'p-4 md:p-6')}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <MapPin className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            Ubicación
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Dirección" className="sm:col-span-2">
              {editing && draft ? (
                <input
                  type="text"
                  value={draft.address}
                  onChange={(e) => onDraftChange({ address: e.target.value })}
                  className={inputClass}
                  placeholder="Dirección"
                />
              ) : client.address?.trim() ? (
                client.address
              ) : (
                <span className="text-zinc-500">Sin dirección</span>
              )}
            </Field>
            <Field label="Ciudad">
              {editing && draft ? (
                <input
                  type="text"
                  value={draft.city}
                  onChange={(e) => onDraftChange({ city: e.target.value })}
                  className={inputClass}
                  placeholder="Ciudad"
                />
              ) : client.city?.trim() ? (
                client.city
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </Field>
            <Field label="Departamento / estado">
              {editing && draft ? (
                <input
                  type="text"
                  value={draft.state}
                  onChange={(e) => onDraftChange({ state: e.target.value })}
                  className={inputClass}
                  placeholder="Departamento o estado"
                />
              ) : client.state?.trim() ? (
                client.state
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </Field>
          </dl>
        </section>

        <section className={cn(panel, 'overflow-hidden p-0')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 px-4 py-4 dark:border-zinc-800 md:px-6">
            <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              Créditos y facturas
            </h2>
            {!creditsLoading && credits.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {activeCreditsCount} con saldo pendiente · Total pendiente{' '}
                <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                  {formatCurrency(totalPendingCredits)}
                </span>
              </p>
            )}
          </div>
          <div className="p-4 md:p-6 md:pt-4">
            {creditsLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando créditos…</p>
              </div>
            ) : credits.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No hay registros de crédito para este cliente en tu tienda.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="bg-zinc-50/80 px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50">
                          Factura
                        </th>
                        <th className="bg-zinc-50/80 px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50">
                          Total
                        </th>
                        <th className="bg-zinc-50/80 px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50">
                          Pendiente
                        </th>
                        <th className="bg-zinc-50/80 px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50">
                          Estado
                        </th>
                        <th className="w-24 bg-zinc-50/80 px-2 py-2.5 dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {recentCredits.map((credit) => {
                        const displayStatus = getEffectiveCreditStatus(credit)
                        return (
                        <tr key={credit.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20">
                          <td className="px-3 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">{credit.invoiceNumber}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(credit.totalAmount)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(credit.pendingAmount)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn('border px-2 py-0.5 text-[11px] font-normal', creditStatusBadgeClass(displayStatus, credit))}
                            >
                              {creditStatusLabel(displayStatus, credit, { completedLabel: 'Pagado' })}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">
                            <Link
                              href={`/payments/${client.id}/credit/${credit.id}`}
                              className="inline-flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">
                  {recentCredits.map((credit) => {
                    const displayStatus = getEffectiveCreditStatus(credit)
                    return (
                    <li key={credit.id}>
                      <Link
                        href={`/payments/${client.id}/credit/${credit.id}`}
                        className="block rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-zinc-500">{credit.invoiceNumber}</p>
                            <p className="mt-1 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                              Pendiente {formatCurrency(credit.pendingAmount)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0 border px-2 py-0.5 text-[11px] font-normal', creditStatusBadgeClass(displayStatus, credit))}
                          >
                            {creditStatusLabel(displayStatus, credit, { completedLabel: 'Pagado' })}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  )})}
                </ul>
                {credits.length > recentCredits.length && (
                  <div className="mt-4 text-center">
                    <Link
                      href={`/payments/${client.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
                    >
                      Ver todos los créditos ({credits.length})
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {!canMutate && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Este perfil corresponde a una tienda del sistema. Los datos se gestionan desde{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Microtiendas</span>.
          </p>
        )}
      </div>
    </div>
  )
}
