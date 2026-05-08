'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import {
  User,
  LogOut,
  Mail,
  Shield,
  Calendar,
  Clock,
  KeyRound
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SidebarThemeToggle } from '@/components/ui/sidebar-theme-toggle'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      superadmin: 'Super Administrador',
      admin: 'Administrador',
      vendedor: 'Vendedor',
      cajero: 'Cajero',
      inventario: 'Inventario',
      contador: 'Contador'
    }
    return roles[role] || 'Usuario'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible'
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return (
      <RoleProtectedRoute module="dashboard" requiredAction="view">
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <div className="text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Cargando perfil…</p>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-24 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
        <div className="py-4 md:py-8">
          {/* Encabezado — misma jerarquía que facturador */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
              <User
                className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                strokeWidth={1.5}
                aria-hidden
              />
              <span>Mi perfil</span>
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Información de tu cuenta y configuración
            </p>
          </div>

          {/* En escritorio el tema está en el sidebar; en móvil/tablet también en la barra inferior */}
          <Card className={cn(cardShell, 'mb-4 xl:hidden')}>
            <CardContent className="p-4 md:p-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Apariencia
              </p>
              <SidebarThemeToggle className="w-full max-w-sm" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            {/* Tarjeta usuario */}
            <Card className={cardShell}>
              <CardContent className="flex flex-col items-center p-5 text-center md:p-6">
                <UserAvatar
                  name={user.name}
                  seed={user.id}
                  size="xl"
                  className="ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                />
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {getRoleLabel(user.role)}
                </p>
                <div className="mt-6 w-full border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/80 text-sm font-medium text-zinc-700 shadow-none transition-colors hover:border-[#ff9568]/55 hover:bg-[#ff9568]/[0.07] hover:text-[#ff9568] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9568]/25 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-[#ff9568]/45 dark:hover:bg-[#ff9568]/10 dark:hover:text-[#ffb090]"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                    Cerrar sesión
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Detalle */}
            <Card className={cn(cardShell, 'lg:col-span-2')}>
              <CardHeader className="space-y-0 border-b border-zinc-200/80 px-4 pb-3 pt-4 dark:border-zinc-800 md:px-6 md:pb-4 md:pt-5">
                <CardTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Información personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 p-0 md:px-2">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex gap-3 px-4 py-3.5 md:px-5">
                    <Mail
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Correo electrónico
                      </p>
                      <p className="mt-0.5 break-words text-sm text-zinc-900 dark:text-zinc-100">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 px-4 py-3.5 md:px-5">
                    <Shield
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Rol
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        {getRoleLabel(user.role)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 px-4 py-3.5 md:px-5">
                    <Clock
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Último inicio de sesión
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        {formatDate(user.lastLogin)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 px-4 py-3.5 md:px-5">
                    <Calendar
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Cuenta creada
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {user.permissions && user.permissions.length > 0 && (
                  <div className="border-t border-zinc-200/80 px-4 py-4 dark:border-zinc-800 md:px-6 md:py-5">
                    <div className="mb-3 flex items-center gap-2">
                      <KeyRound
                        className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Módulos accesibles
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((permission, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="rounded-md border-zinc-200/90 bg-zinc-50/90 px-2 py-0.5 text-xs font-medium normal-case text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                        >
                          {permission.module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
