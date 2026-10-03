'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { DatePicker } from '@/components/ui/date-picker'
import { X, AlertTriangle, ChevronDown, CircleDashed } from 'lucide-react'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { getPaymentMethodMeta } from '@/components/sales/payment-method-label'
import { toast } from 'sonner'
import { Egreso, EgresoKind } from '@/types'
import {
  EGRESO_CONCEPTS,
  EGRESO_KINDS,
  CUENTA_NO_CASH_MESSAGE,
  firstDayOfMonthISO,
  getEgresoPaymentLabel,
  type EgresoPaymentMethod,
} from '@/lib/egreso-concepts'
import { EgresosService, type CreateEgresoInput } from '@/lib/egresos-service'
import {
  MONEY_CHANNEL_LABELS,
  MonthlyResultService,
  type MoneyChannel,
} from '@/lib/monthly-result-service'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalHintClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'
import { cn } from '@/lib/utils'

interface EgresoModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  egreso?: Egreso | null
  /** Prefiere este tipo al abrir un egreso nuevo (p. ej. desde Caja → Egreso de cuenta). */
  defaultKind?: EgresoKind
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

const paymentOptions: { value: EgresoPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
]

const optionBaseClass =
  'casa-artesanal-preserve-surface flex items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors'

const optionIdleClass =
  'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.1] dark:text-white/60 dark:hover:border-white/20 dark:hover:text-white'

const optionActiveClass =
  'border-zinc-900 font-semibold text-zinc-900 ring-1 ring-zinc-900 dark:border-white dark:text-white dark:ring-white'

export function EgresoModal({
  isOpen,
  onClose,
  onSaved,
  egreso,
  defaultKind,
  currentUserId,
  currentUserName,
  storeId,
}: EgresoModalProps) {
  const isEdit = !!egreso
  const [concept, setConcept] = useState('papeleria')
  const [conceptOther, setConceptOther] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState<Date | null>(todayDate())
  const [expenseKind, setExpenseKind] = useState<EgresoKind>('caja')
  const [periodMonth, setPeriodMonth] = useState<Date | null>(todayDate())
  const [paymentMethod, setPaymentMethod] = useState<EgresoPaymentMethod>('cash')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cuentaAckNotTill, setCuentaAckNotTill] = useState(false)
  const [cuentaAckFromAccount, setCuentaAckFromAccount] = useState(false)
  const [channelAvail, setChannelAvail] = useState<{
    available: number
    inAmount: number
    label: string
    loading: boolean
  } | null>(null)

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
      setExpenseKind(egreso.expenseKind || 'caja')
      setPeriodMonth(
        egreso.periodMonth
          ? new Date(`${egreso.periodMonth.slice(0, 10)}T12:00:00`)
          : todayDate()
      )
      setPaymentMethod(egreso.paymentMethod || 'cash')
      setCuentaAckNotTill(false)
      setCuentaAckFromAccount(false)
    } else {
      setConcept('papeleria')
      setConceptOther('')
      setDescription('')
      setAmount('')
      setExpenseDate(todayDate())
      setExpenseKind('caja')
      setPeriodMonth(todayDate())
      setPaymentMethod('cash')
      setCuentaAckNotTill(false)
      setCuentaAckFromAccount(false)
    }
  }, [isOpen, egreso, defaultKind])

  const showOther = concept === 'otro'
  const amountValue = parseAmountInput(amount)
  const isCuenta = expenseKind === 'cuenta'
  const cuentaCashConflict = isCuenta && paymentMethod === 'cash'
  const needsCuentaDoubleCheck =
    isCuenta && (!isEdit || (egreso?.expenseKind || 'caja') !== 'cuenta')
  const cuentaDoubleCheckOk = !needsCuentaDoubleCheck || (cuentaAckNotTill && cuentaAckFromAccount)
  const visiblePaymentOptions = isCuenta
    ? paymentOptions.filter((option) => option.value !== 'cash')
    : paymentOptions

  useEffect(() => {
    if (!isOpen || !isCuenta || !periodMonth) {
      setChannelAvail(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setChannelAvail((prev) => ({
        available: prev?.available ?? 0,
        inAmount: prev?.inAmount ?? 0,
        label: getEgresoPaymentLabel(paymentMethod),
        loading: true,
      }))
      try {
        const y = periodMonth.getFullYear()
        const m = periodMonth.getMonth() + 1
        const channel = (paymentMethod === 'cash'
          ? 'cash'
          : paymentMethod === 'nequi'
            ? 'nequi'
            : paymentMethod === 'bancolombia'
              ? 'bancolombia'
              : paymentMethod === 'transfer'
                ? 'transfer'
                : paymentMethod === 'card'
                  ? 'card'
                  : 'other') as MoneyChannel
        const avail = await MonthlyResultService.getChannelAvailability({
          year: y,
          month: m,
          channel,
          storeId,
          excludeEgresoId: egreso?.id,
        })
        if (!cancelled) {
          setChannelAvail({
            available: avail.available,
            inAmount: avail.inAmount,
            label: MONEY_CHANNEL_LABELS[channel] || avail.label,
            loading: false,
          })
        }
      } catch {
        if (!cancelled) setChannelAvail(null)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isOpen, isCuenta, periodMonth, paymentMethod, storeId, egreso?.id])

  const handleConceptChange = (next: string) => {
    setConcept(next)
  }

  const handleKindChange = (kind: EgresoKind) => {
    setExpenseKind(kind)
    setCuentaAckNotTill(false)
    setCuentaAckFromAccount(false)
    if (kind === 'cuenta' && paymentMethod === 'cash') {
      setPaymentMethod('bancolombia')
    }
  }

  const exceedsChannel =
    isCuenta &&
    channelAvail &&
    !channelAvail.loading &&
    amountValue > channelAvail.available

  const payload = useMemo((): CreateEgresoInput => {
    return {
      concept,
      conceptOther: showOther ? conceptOther : undefined,
      description,
      amount: amountValue,
      expenseDate: toISODate(expenseDate) || toISODate(todayDate()),
      paymentMethod,
      expenseKind,
      periodMonth: isCuenta
        ? firstDayOfMonthISO(periodMonth || todayDate())
        : null,
      storeId,
    }
  }, [
    concept,
    conceptOther,
    showOther,
    description,
    amountValue,
    expenseDate,
    paymentMethod,
    expenseKind,
    isCuenta,
    periodMonth,
    storeId,
  ])

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
    if (exceedsChannel && channelAvail) {
      toast.error(
        `No hay suficiente dinero en ${channelAvail.label} este mes para ese monto`
      )
      return
    }
    if (needsCuentaDoubleCheck && !cuentaDoubleCheckOk) {
      toast.error('Marca las dos confirmaciones: esta mensualidad no sale de la gaveta ni entra al cierre.')
      return
    }
    if (cuentaCashConflict) {
      toast.error(CUENTA_NO_CASH_MESSAGE)
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
        toast.success(
          isCuenta ? 'Egreso de cuenta registrado (no afecta caja diaria)' : 'Egreso de caja registrado'
        )
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const channelTone: ReportTone = channelAvail?.loading
    ? 'neutral'
    : exceedsChannel
      ? 'danger'
      : channelAvail && amountValue > 0
        ? 'success'
        : 'neutral'

  const modal = (
    <div className={modalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(modalPanelClass, 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="egreso-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="egreso-modal-title" className={modalTitleClass}>
              {isEdit ? 'Editar egreso' : 'Nuevo egreso'}
            </h2>
            <p className={modalSubtitleClass}>Caja del turno o cuenta (arriendo, nómina…)</p>
          </div>
          <button type="button" className={modalCloseButtonClass} onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(modalBodyClass, 'space-y-5')}>
            <div>
              <span className={modalLabelClass}>Tipo</span>
              <div
                role="radiogroup"
                aria-label="Tipo de egreso"
                className="casa-artesanal-preserve-surface grid grid-cols-2 gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
              >
                {EGRESO_KINDS.map((k) => {
                  const active = expenseKind === k.value
                  return (
                    <button
                      key={k.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleKindChange(k.value)}
                      className={cn(
                        'casa-artesanal-preserve-surface inline-flex h-8 items-center justify-center rounded-md border px-2 text-[13px] transition-colors',
                        active
                          ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                          : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/55 dark:hover:text-white'
                      )}
                    >
                      {k.label}
                    </button>
                  )
                })}
              </div>
              <p className={modalHintClass}>{EGRESO_KINDS.find((k) => k.value === expenseKind)?.hint}</p>
            </div>

            <div>
              <label htmlFor="egreso-amount" className={modalLabelClass}>
                Monto
              </label>
              <input
                id="egreso-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="$ 0"
                autoFocus={!isEdit}
                className={cn(modalInputClass, 'h-11 text-lg font-semibold tabular-nums')}
                required
              />
            </div>

            <div>
              <label htmlFor="egreso-concept" className={modalLabelClass}>
                Concepto
              </label>
              <div className="relative">
                <select
                  id="egreso-concept"
                  value={concept}
                  onChange={(e) => handleConceptChange(e.target.value)}
                  className={cn(modalInputClass, 'cursor-pointer appearance-none pr-8')}
                >
                  {!EGRESO_CONCEPTS.some((c) => c.value === concept) ? (
                    <option value={concept}>{concept || 'Sin concepto'}</option>
                  ) : null}
                  {EGRESO_CONCEPTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
            </div>

            {showOther && (
              <div>
                <label htmlFor="egreso-other" className={modalLabelClass}>
                  ¿En qué se gastó?
                </label>
                <input
                  id="egreso-other"
                  value={conceptOther}
                  onChange={(e) => setConceptOther(e.target.value)}
                  placeholder="Ej. reparación urgente de vitrina"
                  className={modalInputClass}
                  required
                />
              </div>
            )}

            <div>
              <span className={modalLabelClass}>{isCuenta ? 'De dónde sale el dinero' : 'Medio de pago'}</span>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-label="Medio de pago">
                {visiblePaymentOptions.map(({ value, label }) => {
                  const active = paymentMethod === value
                  const meta = getPaymentMethodMeta(value)
                  const Icon = meta?.icon ?? CircleDashed
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      aria-pressed={active}
                      className={cn(optionBaseClass, 'h-9', active ? optionActiveClass : optionIdleClass)}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', meta?.tint)} strokeWidth={1.75} aria-hidden />
                      {label}
                    </button>
                  )
                })}
              </div>
              {isCuenta ? (
                <div className="mt-2 space-y-0.5 text-xs">
                  <p
                    className={cn(
                      'flex items-center gap-1.5',
                      channelTone === 'danger'
                        ? 'font-medium text-rose-600 dark:text-rose-400'
                        : channelTone === 'success'
                          ? 'font-medium text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-white/50'
                    )}
                  >
                    <StatusDot tone={channelTone} />
                    {channelAvail?.loading
                      ? 'Verificando si hay dinero en este canal…'
                      : exceedsChannel && channelAvail
                        ? `No hay suficiente dinero en ${channelAvail.label} este mes para ese monto. Elige otro canal o baja el valor.`
                        : channelAvail && amountValue > 0
                          ? `Sí hay dinero en ${channelAvail.label} para este egreso.`
                          : 'Elige el canal; el sistema valida si alcanza con lo recaudado del mes.'}
                  </p>
                  <p className="pl-3.5 text-zinc-400 dark:text-white/40">
                    Este egreso no baja el efectivo esperado del cierre diario de caja.
                  </p>
                </div>
              ) : null}
              {cuentaCashConflict ? (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{CUENTA_NO_CASH_MESSAGE}</p>
              ) : null}
            </div>

            {isCuenta && (
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-white/[0.08]">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={1.75} />
                  <div className="space-y-1 text-xs text-zinc-600 dark:text-white/65">
                    <p className="font-semibold text-zinc-900 dark:text-white">Diferencia: caja vs mensualidad</p>
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-white/85">Caja del turno:</span> el dinero sale de
                      la gaveta de hoy (efectivo). Baja el cierre de caja.
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-white/85">Cuenta / mensualidad:</span> arriendo,
                      nómina, servicios. Sale de Nequi, Bancolombia o transferencia. No toca la gaveta ni el cierre.
                    </p>
                  </div>
                </div>
                {needsCuentaDoubleCheck && (
                  <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-white/[0.07]">
                    <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 dark:text-white/75">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-900 dark:accent-white"
                        checked={cuentaAckNotTill}
                        onChange={(e) => setCuentaAckNotTill(e.target.checked)}
                      />
                      <span>
                        Entiendo que este gasto <span className="font-semibold">no sale de la gaveta de hoy</span> y{' '}
                        <span className="font-semibold">no baja el cierre de caja</span>.
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 dark:text-white/75">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-900 dark:accent-white"
                        checked={cuentaAckFromAccount}
                        onChange={(e) => setCuentaAckFromAccount(e.target.checked)}
                      />
                      <span>
                        Confirmo que el dinero sale de <span className="font-semibold">Nequi, Bancolombia o transferencia</span>.
                        Si salió en efectivo de la caja, debo elegir «Caja del turno».
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className={cn('grid gap-4', isCuenta && 'sm:grid-cols-2')}>
              {isCuenta && (
                <div>
                  <span className={modalLabelClass}>Mes al que aplica</span>
                  <DatePicker
                    selectedDate={periodMonth}
                    onDateSelect={setPeriodMonth}
                    placeholder="Mes del egreso"
                    ariaLabel="Mes del egreso de cuenta"
                    className="w-full"
                  />
                </div>
              )}
              <div>
                <span className={modalLabelClass}>Fecha de registro</span>
                <DatePicker
                  selectedDate={expenseDate}
                  onDateSelect={setExpenseDate}
                  placeholder="Seleccionar fecha"
                  ariaLabel="Fecha del egreso"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label htmlFor="egreso-notes" className={modalLabelClass}>
                Nota <span className="font-normal text-zinc-400 dark:text-white/35">(opcional)</span>
              </label>
              <textarea
                id="egreso-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle adicional…"
                rows={2}
                className={cn(modalInputClass, 'h-auto min-h-[4rem] resize-y py-2')}
              />
            </div>
          </div>

          <div className={modalFooterClass}>
            <button type="button" className={modalSecondaryButtonClass} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className={modalPrimaryButtonClass}
              disabled={saving || amountValue <= 0 || !!exceedsChannel || cuentaCashConflict || !cuentaDoubleCheckOk}
            >
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar egreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
