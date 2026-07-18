'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import {
  X,
  Wallet,
  Banknote,
  Landmark,
  Smartphone,
  Building2,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { Egreso } from '@/types'
import { EGRESO_CONCEPTS, type EgresoPaymentMethod } from '@/lib/egreso-concepts'
import { EgresosService, type CreateEgresoInput } from '@/lib/egresos-service'
import {
  appModalBodyClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalHintClass,
  appModalInputClass,
  appModalLabelClass,
  appModalOverlayClass,
  appModalPanelClass,
} from '@/lib/app-modal'
import { cn } from '@/lib/utils'

interface EgresoModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  egreso?: Egreso | null
  currentUserId: string
  currentUserName?: string
  storeId: string
}

function todayDate() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

function toISODate(date: Date | null): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatAmountInput(value: string): string {
  const numeric = value.replace(/[^\d]/g, '')
  if (!numeric) return ''
  return parseInt(numeric, 10).toLocaleString('es-CO')
}

function parseAmountInput(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

const paymentOptions: {
  value: EgresoPaymentMethod
  label: string
  Icon: typeof Banknote
  selected: string
}[] = [
  {
    value: 'cash',
    label: 'Efectivo',
    Icon: Banknote,
    selected:
      'border-emerald-300 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80 dark:border-emerald-700/60 dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-800/50',
  },
  {
    value: 'transfer',
    label: 'Transferencia',
    Icon: Landmark,
    selected:
      'border-sky-300 bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:border-sky-700/60 dark:bg-sky-900/45 dark:text-sky-100 dark:ring-sky-800/50',
  },
  {
    value: 'nequi',
    label: 'Nequi',
    Icon: Smartphone,
    selected:
      'border-violet-300 bg-violet-100 text-violet-900 ring-1 ring-violet-200/80 dark:border-violet-700/60 dark:bg-violet-900/50 dark:text-violet-100 dark:ring-violet-800/50',
  },
  {
    value: 'bancolombia',
    label: 'Bancolombia',
    Icon: Building2,
    selected:
      'border-amber-300 bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:border-amber-700/60 dark:bg-amber-900/45 dark:text-amber-100 dark:ring-amber-800/50',
  },
  {
    value: 'card',
    label: 'Tarjeta',
    Icon: CreditCard,
    selected:
      'border-rose-300 bg-rose-100 text-rose-900 ring-1 ring-rose-200/80 dark:border-rose-700/60 dark:bg-rose-900/45 dark:text-rose-100 dark:ring-rose-800/50',
  },
  {
    value: 'other',
    label: 'Otro',
    Icon: MoreHorizontal,
    selected:
      'border-stone-300 bg-stone-100 text-stone-800 ring-1 ring-stone-200/80 dark:border-zinc-500/70 dark:bg-zinc-700/55 dark:text-zinc-100 dark:ring-zinc-600/50',
  },
]

const paymentIdleClass =
  'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800'

export function EgresoModal({
  isOpen,
  onClose,
  onSaved,
  egreso,
  currentUserId,
  currentUserName,
  storeId,
}: EgresoModalProps) {
  const isEdit = !!egreso
  const [concept, setConcept] = useState('arriendo')
  const [conceptOther, setConceptOther] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState<Date | null>(todayDate())
  const [paymentMethod, setPaymentMethod] = useState<EgresoPaymentMethod>('cash')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (egreso) {
      setConcept(egreso.concept)
      setConceptOther(egreso.conceptOther || '')
      setDescription(egreso.description || '')
      setAmount(egreso.amount > 0 ? Math.round(egreso.amount).toLocaleString('es-CO') : '')
      setExpenseDate(
        egreso.expenseDate
          ? new Date(`${egreso.expenseDate.slice(0, 10)}T12:00:00`)
          : todayDate()
      )
      setPaymentMethod(egreso.paymentMethod || 'cash')
    } else {
      setConcept('arriendo')
      setConceptOther('')
      setDescription('')
      setAmount('')
      setExpenseDate(todayDate())
      setPaymentMethod('cash')
    }
  }, [isOpen, egreso])

  const showOther = concept === 'otro'
  const amountValue = parseAmountInput(amount)

  const payload = useMemo((): CreateEgresoInput => {
    return {
      concept,
      conceptOther: showOther ? conceptOther : undefined,
      description,
      amount: amountValue,
      expenseDate: toISODate(expenseDate) || toISODate(todayDate()),
      paymentMethod,
      storeId,
    }
  }, [concept, conceptOther, showOther, description, amountValue, expenseDate, paymentMethod, storeId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseDate) {
      toast.error('Selecciona la fecha del egreso')
      return
    }
    if (amountValue <= 0) {
      toast.error('Ingresa un monto mayor a 0')
      return
    }
    if (showOther && !conceptOther.trim()) {
      toast.error('Describe en qué se gastó')
      return
    }
    setSaving(true)
    try {
      if (isEdit && egreso) {
        const result = await EgresosService.updateEgreso(egreso.id, payload)
        if (!result.success) {
          toast.error(result.error || 'No se pudo actualizar')
          return
        }
        toast.success('Egreso actualizado')
      } else {
        const result = await EgresosService.createEgreso(payload, currentUserId, currentUserName)
        if (!result.success) {
          toast.error(result.error || 'No se pudo registrar')
          return
        }
        toast.success('Egreso registrado')
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="egreso-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Wallet className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2
                id="egreso-modal-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {isEdit ? 'Editar egreso' : 'Nuevo egreso'}
              </h2>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                Registra el gasto en pocos pasos
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(appModalBodyClass, 'space-y-4')}>
            <div>
              <label htmlFor="egreso-amount" className={appModalLabelClass}>
                Monto
              </label>
              <input
                id="egreso-amount"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(formatAmountInput(e.target.value))}
                placeholder="Ej. 150.000"
                autoFocus={!isEdit}
                className={cn(
                  appModalInputClass,
                  'h-14 text-center text-2xl font-bold tabular-nums tracking-tight'
                )}
                required
              />
              <p className={cn(appModalHintClass, 'mt-1 text-center')}>Escribe solo números; se formatea solo</p>
            </div>

            <div>
              <label htmlFor="egreso-concept" className={appModalLabelClass}>
                Concepto
              </label>
              <Select value={concept} onValueChange={setConcept}>
                <SelectTrigger
                  id="egreso-concept"
                  className={cn(appModalInputClass, 'h-11 justify-between font-medium')}
                >
                  <SelectValue placeholder="¿En qué se gastó?" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {EGRESO_CONCEPTS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showOther && (
              <div>
                <label htmlFor="egreso-other" className={appModalLabelClass}>
                  ¿En qué se gastó?
                </label>
                <input
                  id="egreso-other"
                  value={conceptOther}
                  onChange={e => setConceptOther(e.target.value)}
                  placeholder="Ej. reparación urgente de vitrina"
                  className={cn(appModalInputClass, 'h-11')}
                  required
                />
              </div>
            )}

            <div>
              <span className={appModalLabelClass}>Medio de pago</span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Medio de pago">
                {paymentOptions.map(({ value, label, Icon, selected }) => {
                  const active = paymentMethod === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      aria-pressed={active}
                      className={cn(
                        'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2.5 text-center text-[11px] font-bold leading-snug transition-colors sm:text-xs',
                        active ? selected : paymentIdleClass
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className={appModalLabelClass}>Fecha</span>
              <DatePicker
                selectedDate={expenseDate}
                onDateSelect={setExpenseDate}
                placeholder="Seleccionar fecha"
                ariaLabel="Fecha del egreso"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="egreso-notes" className={appModalLabelClass}>
                Nota <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <textarea
                id="egreso-notes"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detalle adicional…"
                rows={2}
                className={cn(appModalInputClass, 'min-h-[4rem] resize-y py-2.5')}
              />
            </div>
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || amountValue <= 0}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar egreso'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
