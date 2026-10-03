import {
  ArrowRightLeft,
  Banknote,
  CircleDashed,
  CreditCard,
  HandCoins,
  Landmark,
  Layers,
  MoreHorizontal,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const paymentMethodMeta: Record<string, { label: string; icon: LucideIcon; tint: string }> = {
  cash: { label: 'Efectivo', icon: Banknote, tint: 'text-emerald-600 dark:text-emerald-400' },
  credit: { label: 'Crédito', icon: HandCoins, tint: 'text-amber-600 dark:text-amber-400' },
  nequi: { label: 'Nequi', icon: Smartphone, tint: 'text-fuchsia-600 dark:text-fuchsia-400' },
  bancolombia: { label: 'Bancolombia', icon: Landmark, tint: 'text-sky-600 dark:text-sky-400' },
  transfer: { label: 'Transferencia', icon: ArrowRightLeft, tint: 'text-indigo-600 dark:text-indigo-300' },
  card: { label: 'Tarjeta', icon: CreditCard, tint: 'text-violet-600 dark:text-violet-300' },
  mixed: { label: 'Mixto', icon: Layers, tint: 'text-teal-600 dark:text-teal-300' },
  warranty: { label: 'Garantía', icon: ShieldCheck, tint: 'text-zinc-600 dark:text-zinc-300' },
  other: { label: 'Otro', icon: MoreHorizontal, tint: 'text-zinc-500 dark:text-zinc-400' },
}

export function getPaymentMethodMeta(method: string) {
  return paymentMethodMeta[method]
}

export function getPaymentMethodLabel(method: string): string {
  return paymentMethodMeta[method]?.label ?? (method === 'pending' ? 'Sin método' : method)
}

export function PaymentMethodLabel({ method, className }: { method: string; className?: string }) {
  const meta = paymentMethodMeta[method]
  const Icon = meta?.icon ?? CircleDashed
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Icon
        className={cn('size-3.5 shrink-0', meta?.tint ?? 'text-zinc-500 dark:text-zinc-400')}
        strokeWidth={1.75}
        aria-hidden
      />
      {getPaymentMethodLabel(method)}
    </span>
  )
}
