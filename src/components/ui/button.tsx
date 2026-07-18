import { cn } from '@/lib/utils'
import { appBtnCancelClass, appBtnPrimaryClass } from '@/lib/app-button'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Estilo ERP: primario = confirmar/crear (emerald); destructive = cancelar/eliminar (rose).
 * Color por función, sólido, texto blanco en bold.
 */
export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-zinc-500/40 dark:focus-visible:ring-offset-zinc-950',
        variant === 'default' && cn('rounded-lg', appBtnPrimaryClass),
        variant === 'destructive' && cn('rounded-lg', appBtnCancelClass),
        variant === 'outline' &&
          'rounded-lg border border-zinc-300 bg-white font-semibold text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
        variant === 'secondary' &&
          'rounded-lg border border-transparent bg-zinc-200/90 font-semibold text-zinc-900 shadow-none hover:bg-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        variant === 'ghost' &&
          'rounded-lg border border-transparent font-medium text-zinc-700 shadow-none hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
        variant === 'link' &&
          'rounded-md font-medium text-zinc-600 shadow-none underline-offset-4 hover:underline dark:text-zinc-300',
        {
          'min-h-10 px-5 text-sm': size === 'default',
          'h-9 px-3.5 text-sm': size === 'sm',
          'min-h-12 px-6 text-base': size === 'lg',
          'h-10 w-10 shrink-0 p-0': size === 'icon',
        },
        className
      )}
      {...props}
    />
  )
}
