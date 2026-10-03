'use client'

import { useParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { UserDetailView } from '@/components/roles/user-detail-view'

export default function UserDetailPage() {
  const params = useParams()
  const userId = typeof params?.userId === 'string' ? params.userId : ''

  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <UserDetailView userId={userId} />
    </RoleProtectedRoute>
  )
}
