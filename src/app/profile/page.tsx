'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SidebarThemeToggle } from '@/components/ui/sidebar-theme-toggle'
import { UserDetailView } from '@/components/roles/user-detail-view'

const logoutBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:border-rose-200 hover:text-rose-600 dark:border-white/[0.12] dark:text-white/80 dark:hover:border-rose-500/40 dark:hover:text-rose-400'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      {!user ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando perfil…</p>
        </div>
      ) : (
        <UserDetailView
          userId={user.id}
          variant="self"
          actions={
            <button type="button" onClick={handleLogout} className={logoutBtnClass}>
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          }
          extra={
            <section className="mt-8 xl:hidden">
              <h2 className="mb-2 text-[13px] font-semibold text-zinc-900 dark:text-white">Apariencia</h2>
              <SidebarThemeToggle className="w-full max-w-sm" />
            </section>
          }
        />
      )}
    </RoleProtectedRoute>
  )
}
