'use client'

import { UserManagement } from '@/components/roles/user-management'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function RolesPage() {
  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="min-h-screen space-y-6 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 py-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <UserManagement />
      </div>
    </RoleProtectedRoute>
  )
}