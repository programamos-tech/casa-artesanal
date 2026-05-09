'use client'

import { UserManagement } from '@/components/roles/user-management'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function RolesPage() {
  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="min-h-screen space-y-6 bg-gradient-to-b from-indigo-50/60 via-white to-violet-50/40 py-6 dark:from-indigo-950/30 dark:via-zinc-950 dark:to-violet-950/20">
        <UserManagement />
      </div>
    </RoleProtectedRoute>
  )
}