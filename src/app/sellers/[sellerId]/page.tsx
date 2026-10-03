'use client'

import { useParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { UserDetailView } from '@/components/roles/user-detail-view'

export default function SellerDetailPage() {
  const params = useParams()
  const sellerId = typeof params?.sellerId === 'string' ? params.sellerId : ''

  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <UserDetailView userId={sellerId} />
    </RoleProtectedRoute>
  )
}
