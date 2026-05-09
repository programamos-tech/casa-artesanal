'use client'

import { UserManagement } from '@/components/roles/user-management'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function RolesPage() {
  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="min-h-screen space-y-6 bg-zinc-50 py-6 dark:bg-zinc-950">
        <UserManagement />
      </div>
    </RoleProtectedRoute>
  )
}