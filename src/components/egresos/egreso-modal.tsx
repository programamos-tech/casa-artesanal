'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Egreso } from '@/types'
import {
  EGRESO_CONCEPTS,
  EGRESO_PAYMENT_METHODS,
  type EgresoPaymentMethod,
} from '@/lib/egreso-concepts'
import { EgresosService, type CreateEgresoInput } from '@/lib/egresos-service'
import { appModalOverlayClass, appModalPanelClass } from '@/lib/app-modal'
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

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState<EgresoPaymentMethod>('cash')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (egreso) {
      setConcept(egreso.concept)
      setConceptOther(egreso.conceptOther || '')
      setDescription(egreso.description || '')
      setAmount(String(egreso.amount || ''))
      setExpenseDate(egreso.expenseDate?.slice(0, 10) || todayISO())
      setPaymentMethod(egreso.paymentMethod || 'cash')
    } else {
      setConcept('arriendo')
      setConceptOther('')
      setDescription('')
      setAmount('')
      setExpenseDate(todayISO())
      setPaymentMethod('cash')
    }
  }, [isOpen, egreso])

  const showOther = concept === 'otro'

  const payload = useMemo((): CreateEgresoInput => {
    return {
      concept,
      conceptOther: showOther ? conceptOther : undefined,
      description,
      amount: Number(String(amount).replace(/[^\d.]/g, '')) || 0,
      expenseDate,
      paymentMethod,
      storeId,
    }
  }, [concept, conceptOther, showOther, description, amount, expenseDate, paymentMethod, storeId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  return (
    <div className={appModalOverlayClass} role="presentation">
      <div
        className={cn(appModalPanelClass, 'sm:max-w-lg lg:max-w-xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="egreso-modal-title"
      >
        <div className="flex items-center justify-between border-b border-white/40 px-4 py-3 dark:border-zinc-700/50 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900/10 text-zinc-800 dark:bg-white/10 dark:text-zinc-100">
              <Wallet className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 id="egreso-modal-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {isEdit ? 'Editar egreso' : 'Nuevo egreso'}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-lg p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <Label htmlFor="egreso-concept">Concepto</Label>
              <Select value={concept} onValueChange={setConcept}>
                <SelectTrigger id="egreso-concept" className="h-11 bg-white/70 dark:bg-zinc-900/50">
                  <SelectValue placeholder="Selecciona un concepto" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {EGRESO_CONCEPTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showOther && (
              <div className="space-y-1.5">
                <Label htmlFor="egreso-other">¿En qué se gastó?</Label>
                <Input
                  id="egreso-other"
                  value={conceptOther}
                  onChange={(e) => setConceptOther(e.target.value)}
                  placeholder="Ej. reparación urgente de vitrina"
                  className="h-11 bg-white/70 dark:bg-zinc-900/50"
                  required
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="egreso-amount">Monto</Label>
                <Input
                  id="egreso-amount"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-11 bg-white/70 dark:bg-zinc-900/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="egreso-date">Fecha</Label>
                <Input
                  id="egreso-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-11 bg-white/70 dark:bg-zinc-900/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="egreso-method">Medio de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as EgresoPaymentMethod)}
              >
                <SelectTrigger id="egreso-method" className="h-11 bg-white/70 dark:bg-zinc-900/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EGRESO_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="egreso-notes">Nota (opcional)</Label>
              <Textarea
                id="egreso-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle adicional…"
                rows={3}
                className="resize-none bg-white/70 dark:bg-zinc-900/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/40 px-4 py-3 dark:border-zinc-700/50 sm:px-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar egreso'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
