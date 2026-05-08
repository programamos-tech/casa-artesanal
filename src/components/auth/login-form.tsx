'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { LoginThemeToggle } from '@/components/auth/login-theme-toggle'

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const fieldLabel = 'text-[13px] font-medium text-zinc-600 dark:text-zinc-300'

const inputShell =
  'relative flex h-12 w-full items-center rounded-lg border shadow-inner outline-none transition-colors focus-within:border-zinc-500/55 focus-within:ring-2 focus-within:ring-zinc-500/15 ' +
  'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/60'

const inputField =
  'h-full w-full min-w-0 border-0 bg-transparent py-3 pl-10 pr-3 text-[15px] outline-none focus:ring-0 ' +
  'text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500'

const inputFieldPassword = 'pr-11'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    const success = await login(data.email, data.password)

    if (success) {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('casa_artesanal_user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          const roleNorm = (userData.role || '').toLowerCase().trim()
          const isSuperAdmin =
            roleNorm === 'superadmin' || (roleNorm.includes('super') && (roleNorm.includes('admin') || roleNorm.includes('administrador')))

          if (isSuperAdmin) {
            router.push('/select-store')
          } else {
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
      } else {
        router.push('/dashboard')
      }
    } else {
      setError('Credenciales inválidas. Verifica tu email y contraseña.')
    }
  }

  return (
    <div
      data-auth-page
      className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <LoginThemeToggle className="fixed right-4 top-4 z-20 md:right-8 md:top-8" />

      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-15%,rgba(24,24,27,0.08),transparent_54%)] dark:bg-[radial-gradient(ellipse_100%_55%_at_50%_-15%,rgba(244,244,245,0.06),transparent_54%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex justify-center">
          <div className="relative h-20 w-20 md:h-24 md:w-24">
            <Image src="/logo2.png" alt="Casa Artesanal" width={96} height={96} className="object-contain" priority />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-white">Bienvenido</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
          <div className="space-y-2">
            <label htmlFor="login-form-email" className={fieldLabel}>
              Email
            </label>
            <div className={cn(inputShell, errors.email && 'border-red-500/50 ring-2 ring-red-500/15')}>
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                id="login-form-email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                className={inputField}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-form-password" className={fieldLabel}>
              Contraseña
            </label>
            <div className={cn(inputShell, errors.password && 'border-red-500/50 ring-2 ring-red-500/15')}>
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                id="login-form-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(inputField, inputFieldPassword)}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-300"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
          </div>

          {error && (
            <Alert className="rounded-lg border-red-200 bg-red-50 dark:border-red-500/25 dark:bg-red-950/40">
              <AlertDescription className="text-sm text-red-800 dark:text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex w-full min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold transition-colors',
              'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" strokeWidth={1.5} />
                Iniciando sesión…
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-300">Credenciales de demo</h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
            Email y contraseña: solicitar al administrador.
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-zinc-600 dark:text-zinc-500">© 2026 Casa Artesanal. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
