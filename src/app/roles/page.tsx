'use client'

import { UserManagement } from '@/components/roles/user-management'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function RolesPage() {
  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        <UserManagement />
      </div>
    </RoleProtectedRoute>
  )
}