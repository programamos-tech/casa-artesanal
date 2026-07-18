'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  X,
  DollarSign,
  Banknote,
  Shuffle,
  AlertCircle,
  Coins,
  Landmark,
  Wallet,
  Smartphone,
  Building2,
} from 'lucide-react'
import { Credit, PaymentRecord } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUser } from '@/lib/store-helper'
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
} from '@/lib/app-modal'
import { cardShell } from '@/lib/card-shell'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPayment: (paymentData: Partial<PaymentRecord>) => void
  credit: Credit | null
}

const inputClass = cn(appModalInputClass, 'rounded-lg')

const methodOptions = [
  {
    v: 'cash' as const,
    label: 'Efectivo',
    Icon: Banknote,
    selected:
      'border-emerald-300 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80 dark:border-emerald-700/60 dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-800/50',
  },
  {
    v: 'nequi' as const,
    label: 'Nequi',
    Icon: Smartphone,
    selected:
      'border-violet-300 bg-violet-100 text-violet-900 ring-1 ring-violet-200/80 dark:border-violet-700/60 dark:bg-violet-900/50 dark:text-violet-100 dark:ring-violet-800/50',
  },
  {
    v: 'bancolombia' as const,
    label: 'Bancolombia',
    Icon: Building2,
    selected:
      'border-amber-300 bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:border-amber-700/60 dark:bg-amber-900/45 dark:text-amber-100 dark:ring-amber-800/50',
  },
  {
    v: 'transfer' as const,
    label: 'Transferencia (otro)',
    Icon: Landmark,
    selected:
      'border-sky-300 bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:border-sky-700/60 dark:bg-sky-900/45 dark:text-sky-100 dark:ring-sky-800/50',
  },
  {
    v: 'card' as const,
    label: 'Tarjeta',
    Icon: Wallet,
    selected:
      'border-rose-300 bg-rose-100 text-rose-900 ring-1 ring-rose-200/80 dark:border-rose-700/60 dark:bg-rose-900/45 dark:text-rose-100 dark:ring-rose-800/50',
  },
  {
    v: 'mixed' as const,
    label: 'Mixto',
    Icon: Shuffle,
    selected:
      'border-stone-300 bg-stone-100 text-stone-800 ring-1 ring-stone-200/80 dark:border-zinc-500/70 dark:bg-zinc-700/55 dark:text-zinc-100 dark:ring-zinc-600/50',
  },
]

const methodIdleClass =
  'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800'

export function PaymentModal({ isOpen, onClose, onAddPayment, credit }: PaymentModalProps) {
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card' | 'mixed',
    digitalChannel: 'nequi' as 'nequi' | 'bancolombia',
    cashAmount: '',
    transferAmount: '',
    receivedAmount: '',
    description: ''
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const formatNumber = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '')
    if (!numericValue) return ''
    return parseInt(numericValue, 10).toLocaleString('es-CO')
  }

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/[^\d]/g, '')) || 0
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(n)

  const handleNumberChange = (field: string, value: string) => {
    const formatted = formatNumber(value)
    setFormData(prev => ({ ...prev, [field]: formatted }))

    if (field === 'amount' && credit) {
      const amountValue = parseFormattedNumber(formatted)
      if (amountValue > credit.pendingAmount) {
        setErrors(prev => ({
          ...prev,
          amount: `El monto no puede exceder el saldo pendiente (${formatCurrency(credit.pendingAmount)})`
        }))
      } else if (errors.amount) {
        setErrors(prev => ({ ...prev, amount: '' }))
      }
    }

    if (field !== 'amount' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!credit) return

    const nextErrors: { [key: string]: string } = {}

    const amountValue = parseFormattedNumber(formData.amount)
    if (!formData.amount || amountValue <= 0) {
      nextErrors.amount = 'El monto debe ser mayor a 0'
    }

    if (amountValue > credit.pendingAmount) {
      nextErrors.amount = 'El monto no puede ser mayor al saldo pendiente'
    }

    if (formData.paymentMethod === 'cash') {
      if (formData.receivedAmount) {
        const receivedValue = parseFormattedNumber(formData.receivedAmount)
        if (receivedValue <= 0) {
          nextErrors.receivedAmount = 'El monto recibido debe ser mayor a 0'
        } else if (receivedValue < amountValue) {
          nextErrors.receivedAmount = 'El monto recibido no puede ser menor al monto del abono'
        }
      }
    }

    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      const transferValue = parseFormattedNumber(formData.transferAmount)
      const receivedValue = parseFormattedNumber(formData.receivedAmount)

      if (!formData.cashAmount || cashValue <= 0) {
        nextErrors.cashAmount = 'El monto en efectivo debe ser mayor a 0'
      }
      if (!formData.transferAmount || transferValue <= 0) {
        nextErrors.transferAmount = 'El monto por Nequi o Bancolombia debe ser mayor a 0'
      }
      if (formData.receivedAmount) {
        if (receivedValue <= 0) {
          nextErrors.receivedAmount = 'El monto recibido en efectivo debe ser mayor a 0'
        } else if (receivedValue < cashValue) {
          nextErrors.receivedAmount = 'El monto recibido no puede ser menor al monto en efectivo'
        }
      }

      const totalMixed = cashValue + transferValue

      if (Math.abs(totalMixed - amountValue) > 0.01) {
        const difference = amountValue - totalMixed
        if (difference > 0) {
          nextErrors.mixed = `Faltan ${formatCurrency(difference)} para completar el monto total`
        } else {
          nextErrors.mixed = `Sobran ${formatCurrency(Math.abs(difference))} del monto total`
        }
      }
    }

    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    let userId = user?.id
    let userName = user?.name

    if (!userId) {
      const currentUser = getCurrentUser()
      userId = currentUser?.id || undefined
      userName = currentUser?.name || userName
    }

    const paymentData: Partial<PaymentRecord> = {
      creditId: credit.id,
      amount: parseFormattedNumber(formData.amount),
      paymentDate: new Date().toISOString(),
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      userId: userId,
      userName: userName || 'Usuario Actual',
      createdAt: new Date().toISOString()
    }

    if (formData.paymentMethod === 'mixed') {
      paymentData.cashAmount = parseFormattedNumber(formData.cashAmount)
      paymentData.transferAmount = parseFormattedNumber(formData.transferAmount)
      paymentData.digitalTransferMethod = formData.digitalChannel
    }

    onAddPayment(paymentData)
    onClose()
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      paymentMethod: 'cash',
      digitalChannel: 'nequi',
      cashAmount: '',
      transferAmount: '',
      receivedAmount: '',
      description: ''
    })
    setErrors({})
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handlePaymentMethodChange = (value: 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'card' | 'mixed') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: value,
      cashAmount: '',
      transferAmount: '',
      receivedAmount: ''
    }))
    setErrors({})
  }

  const calculateChange = (): number => {
    if (
      formData.paymentMethod === 'transfer' ||
      formData.paymentMethod === 'nequi' ||
      formData.paymentMethod === 'bancolombia' ||
      formData.paymentMethod === 'card'
    )
      return 0

    if (!formData.amount || !formData.receivedAmount) return 0

    const amountValue = parseFormattedNumber(formData.amount)
    const receivedValue = parseFormattedNumber(formData.receivedAmount)

    if (formData.paymentMethod === 'cash') {
      return receivedValue > amountValue ? receivedValue - amountValue : 0
    }

    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      return receivedValue > cashValue ? receivedValue - cashValue : 0
    }

    return 0
  }

  if (!isOpen || !credit) return null

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={handleClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-payment-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <DollarSign className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <h2
              id="credit-payment-modal-title"
              className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Registrar abono
            </h2>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn(appModalBodyClass, 'space-y-4')}>
            <div className={cn(cardShell, 'space-y-1 p-3')}>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {credit.clientName} · Factura {credit.invoiceNumber}
              </p>
              <p className={appModalHintClass}>
                Total {formatCurrency(credit.totalAmount)}
                {' · '}
                Pendiente{' '}
                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatCurrency(credit.pendingAmount)}
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="payment-amount" className={appModalLabelClass}>
                Monto del abono
              </label>
              <input
                id="payment-amount"
                type="text"
                value={formData.amount}
                onChange={e => handleNumberChange('amount', e.target.value)}
                placeholder="0"
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                  inputClass,
                  'h-12 text-lg font-semibold tabular-nums',
                  errors.amount ||
                    (formData.amount && parseFormattedNumber(formData.amount) > credit.pendingAmount)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    : ''
                )}
              />
              {errors.amount && (
                <p className={cn(appModalErrorClass, 'flex items-start gap-1.5')}>
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {errors.amount}
                </p>
              )}
              {!errors.amount && (
                <p className={cn(appModalHintClass, 'mt-1')}>
                  Máximo: {formatCurrency(credit.pendingAmount)}
                </p>
              )}
            </div>

            <div>
              <span className={appModalLabelClass}>Método</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Método de pago">
                {methodOptions.map(({ v, label, Icon, selected }) => {
                  const active = formData.paymentMethod === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handlePaymentMethodChange(v)}
                      aria-pressed={active}
                      className={cn(
                        'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center text-[11px] font-bold leading-snug transition-colors sm:text-xs',
                        active ? selected : methodIdleClass
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {(formData.paymentMethod === 'cash' || formData.paymentMethod === 'mixed') && (
              <div className={cn(cardShell, 'space-y-2 p-3')}>
                <label htmlFor="payment-received" className={appModalLabelClass}>
                  {formData.paymentMethod === 'cash' ? 'Monto recibido' : 'Monto recibido en efectivo'}{' '}
                  <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <p className={appModalHintClass}>Para calcular vuelto respecto al efectivo del abono</p>
                <input
                  id="payment-received"
                  type="text"
                  value={formData.receivedAmount}
                  onChange={e => handleNumberChange('receivedAmount', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  autoComplete="off"
                  className={cn(
                    inputClass,
                    'h-11 text-base tabular-nums',
                    errors.receivedAmount && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                  )}
                />
                {errors.receivedAmount && (
                  <p className={appModalErrorClass}>{errors.receivedAmount}</p>
                )}
                {formData.receivedAmount && formData.amount && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <Coins className="h-4 w-4" strokeWidth={1.75} />
                      Vuelto
                    </span>
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.paymentMethod === 'mixed' && (
              <div className={cn(cardShell, 'space-y-3 p-3')}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Desglose del abono mixto</p>
                <div>
                  <span className={appModalLabelClass}>Canal del monto digital</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          v: 'nequi' as const,
                          label: 'Nequi',
                          Icon: Smartphone,
                          selected: methodOptions.find(o => o.v === 'nequi')!.selected,
                        },
                        {
                          v: 'bancolombia' as const,
                          label: 'Bancolombia',
                          Icon: Building2,
                          selected: methodOptions.find(o => o.v === 'bancolombia')!.selected,
                        },
                      ] as const
                    ).map(({ v, label, Icon, selected }) => {
                      const active = formData.digitalChannel === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, digitalChannel: v }))}
                          aria-pressed={active}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold transition-colors',
                            active ? selected : methodIdleClass
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
                  <label htmlFor="payment-cash-amount" className={cn(appModalLabelClass, 'flex items-center gap-2')}>
                    <Banknote className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Monto en efectivo
                  </label>
                  <input
                    id="payment-cash-amount"
                    type="text"
                    value={formData.cashAmount}
                    onChange={e => handleNumberChange('cashAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(
                      inputClass,
                      'h-11 text-base tabular-nums',
                      errors.cashAmount && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                  />
                  {errors.cashAmount && <p className={appModalErrorClass}>{errors.cashAmount}</p>}
                </div>
                <div>
                  <label htmlFor="payment-transfer-amount" className={cn(appModalLabelClass, 'flex items-center gap-2')}>
                    {formData.digitalChannel === 'bancolombia' ? (
                      <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    Monto en {formData.digitalChannel === 'bancolombia' ? 'Bancolombia' : 'Nequi'}
                  </label>
                  <input
                    id="payment-transfer-amount"
                    type="text"
                    value={formData.transferAmount}
                    onChange={e => handleNumberChange('transferAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(
                      inputClass,
                      'h-11 text-base tabular-nums',
                      errors.transferAmount && 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                    )}
                  />
                  {errors.transferAmount && (
                    <p className={appModalErrorClass}>{errors.transferAmount}</p>
                  )}
                </div>
                {errors.mixed && <p className={appModalErrorClass}>{errors.mixed}</p>}
                {formData.amount && (
                  <p className={appModalHintClass}>
                    Total abono:{' '}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseFormattedNumber(formData.amount))}
                    </span>
                    {' · '}
                    Suma desglose:{' '}
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(
                        parseFormattedNumber(formData.cashAmount) +
                          parseFormattedNumber(formData.transferAmount)
                      )}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="payment-notes" className={appModalLabelClass}>
                Notas (opcional)
              </label>
              <textarea
                id="payment-notes"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Observaciones sobre el abono…"
                rows={2}
                className={cn(inputClass, 'min-h-[4rem] resize-y py-2.5 text-sm')}
              />
            </div>
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Registrar abono</Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
