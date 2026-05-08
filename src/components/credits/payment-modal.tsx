'use client'

import { useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPayment: (paymentData: Partial<PaymentRecord>) => void
  credit: Credit | null
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-56">
      <div
        className="max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-payment-modal-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/80">
          <div className="flex min-w-0 items-center gap-2.5">
            <DollarSign className="h-5 w-5 shrink-0 text-zinc-500" strokeWidth={1.5} />
            <h2
              id="credit-payment-modal-title"
              className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Registrar abono
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {credit.clientName} · Factura {credit.invoiceNumber}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Total {formatCurrency(credit.totalAmount)}
                {' · '}
                Pendiente{' '}
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(credit.pendingAmount)}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Monto del abono</Label>
              <input
                type="text"
                value={formData.amount}
                onChange={e => handleNumberChange('amount', e.target.value)}
                placeholder="0"
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                  inputClass,
                  'h-12 text-lg',
                  errors.amount ||
                    (formData.amount && parseFormattedNumber(formData.amount) > credit.pendingAmount)
                    ? 'border-red-500/80 bg-red-50/50 dark:bg-red-950/20'
                    : ''
                )}
              />
              {errors.amount && (
                <p className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors.amount}
                </p>
              )}
              {!errors.amount && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Máximo: {formatCurrency(credit.pendingAmount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Método</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    { v: 'cash' as const, label: 'Efectivo', Icon: Banknote },
                    { v: 'nequi' as const, label: 'Nequi', Icon: Smartphone },
                    { v: 'bancolombia' as const, label: 'Bancolombia', Icon: Building2 },
                    { v: 'transfer' as const, label: 'Transferencia (otro)', Icon: Landmark },
                    { v: 'card' as const, label: 'Tarjeta', Icon: Wallet },
                    { v: 'mixed' as const, label: 'Mixto', Icon: Shuffle },
                  ] as const
                ).map(({ v, label, Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handlePaymentMethodChange(v)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center text-[11px] font-medium leading-snug transition-colors sm:text-xs',
                      formData.paymentMethod === v
                        ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(formData.paymentMethod === 'cash' || formData.paymentMethod === 'mixed') && (
              <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                <Label className="text-zinc-700 dark:text-zinc-300">
                  {formData.paymentMethod === 'cash' ? 'Monto recibido' : 'Monto recibido en efectivo'}{' '}
                  <span className="font-normal text-zinc-500">(opcional)</span>
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Para calcular vuelto respecto al efectivo del abono
                </p>
                <input
                  type="text"
                  value={formData.receivedAmount}
                  onChange={e => handleNumberChange('receivedAmount', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  autoComplete="off"
                  className={cn(
                    inputClass,
                    'h-11 text-base',
                    errors.receivedAmount ? 'border-red-500/80 bg-red-50/50 dark:bg-red-950/20' : ''
                  )}
                />
                {errors.receivedAmount && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.receivedAmount}</p>
                )}
                {formData.receivedAmount && formData.amount && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200/90 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <Coins className="h-4 w-4" strokeWidth={1.5} />
                      Vuelto
                    </span>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.paymentMethod === 'mixed' && (
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Desglose del abono mixto</p>
                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300">Canal del monto digital</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { v: 'nequi' as const, label: 'Nequi', Icon: Smartphone },
                        { v: 'bancolombia' as const, label: 'Bancolombia', Icon: Building2 },
                      ] as const
                    ).map(({ v, label, Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, digitalChannel: v }))}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                          formData.digitalChannel === v
                            ? 'border-zinc-500 bg-zinc-100 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50'
                            : 'border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <Banknote className="h-4 w-4" strokeWidth={1.5} />
                    Monto en efectivo
                  </Label>
                  <input
                    type="text"
                    value={formData.cashAmount}
                    onChange={e => handleNumberChange('cashAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(inputClass, 'h-11 text-base', errors.cashAmount ? 'border-red-500/80' : '')}
                  />
                  {errors.cashAmount && <p className="text-sm text-red-600 dark:text-red-400">{errors.cashAmount}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    {formData.digitalChannel === 'bancolombia' ? (
                      <Building2 className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Smartphone className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    Monto en {formData.digitalChannel === 'bancolombia' ? 'Bancolombia' : 'Nequi'}
                  </Label>
                  <input
                    type="text"
                    value={formData.transferAmount}
                    onChange={e => handleNumberChange('transferAmount', e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(inputClass, 'h-11 text-base', errors.transferAmount ? 'border-red-500/80' : '')}
                  />
                  {errors.transferAmount && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.transferAmount}</p>
                  )}
                </div>
                {errors.mixed && <p className="text-sm text-red-600 dark:text-red-400">{errors.mixed}</p>}
                {formData.amount && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Total abono:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseFormattedNumber(formData.amount))}
                    </span>
                    {' · '}
                    Suma desglose:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(parseFormattedNumber(formData.cashAmount) + parseFormattedNumber(formData.transferAmount))}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Notas (opcional)</Label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Observaciones sobre el abono…"
                rows={2}
                className={cn(inputClass, 'min-h-[4rem] resize-y py-2.5 text-sm')}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              Registrar abono
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
