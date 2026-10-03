'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { FabricaDemo } from '@/components/fabrica/fabrica-demo'
import { resolveFabricaRoute } from '@/components/fabrica/fabrica-nav'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'

export default function FabricaPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const raw = params?.screen
  const { screen, orderCode } = resolveFabricaRoute(Array.isArray(raw) ? raw : raw ? [raw] : undefined)
  const allowed = canAccessAllStores(user)

  useEffect(() => {
    if (user && !allowed) router.replace('/dashboard')
  }, [user, allowed, router])

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      {allowed ? <FabricaDemo screen={screen} orderCode={orderCode} /> : null}
    </RoleProtectedRoute>
  )
}
