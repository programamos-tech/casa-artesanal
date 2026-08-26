'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { CashRequiredModal } from '@/components/caja/cash-required-modal'
import {
  getCashOperationGate,
  type CashGateAction,
  type CashGateStatus,
} from '@/lib/cash-operation-gate'

interface CashOperationGateContextValue {
  ensureCashReady: (
    action: CashGateAction,
    options?: { allowPreviousDay?: boolean }
  ) => Promise<boolean>
}

const CashOperationGateContext = createContext<CashOperationGateContextValue | null>(
  null
)

export function CashOperationGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [blocked, setBlocked] = useState<{
    status: Exclude<CashGateStatus, 'ok'>
    action: CashGateAction
  } | null>(null)

  const ensureCashReady = useCallback(
    async (action: CashGateAction, options?: { allowPreviousDay?: boolean }) => {
      const gate = await getCashOperationGate()
      if (gate.status === 'ok') {
        setBlocked(null)
        return true
      }
      if (gate.status === 'must_close' && options?.allowPreviousDay) {
        setBlocked(null)
        return true
      }
      setBlocked({ status: gate.status, action })
      return false
    },
    []
  )

  const value = useMemo(() => ({ ensureCashReady }), [ensureCashReady])

  return (
    <CashOperationGateContext.Provider value={value}>
      {children}
      <CashRequiredModal
        isOpen={Boolean(blocked)}
        status={blocked?.status || 'must_open'}
        action={blocked?.action || 'sale'}
        onDismiss={() => setBlocked(null)}
        onGoToCaja={() => {
          setBlocked(null)
          router.push('/caja')
        }}
      />
    </CashOperationGateContext.Provider>
  )
}

export function useCashOperationGate() {
  const ctx = useContext(CashOperationGateContext)
  if (!ctx) {
    throw new Error('useCashOperationGate debe usarse dentro de CashOperationGateProvider')
  }
  return ctx
}
