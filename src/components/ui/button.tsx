import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Estilo de marca: primario = superficie clara + texto oscuro; secundario = borde fino + fondo transparente.
 * Sin sombra ni “lift” — transiciones suaves.
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
        'inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-zinc-500/40 dark:focus-visible:ring-offset-zinc-950',
        variant === 'default' &&
          'rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-900 shadow-none hover:border-zinc-400 hover:bg-white dark:border-brand-600/85 dark:bg-brand-500 dark:text-white dark:hover:border-brand-500 dark:hover:bg-brand-400',
        variant === 'destructive' &&
          'rounded-lg border border-red-600/90 bg-red-600 text-white shadow-none hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
        variant === 'outline' &&
          'rounded-lg border border-zinc-300 bg-white text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-brand-700/70 dark:bg-zinc-900/65 dark:text-brand-200 dark:hover:border-brand-600/80 dark:hover:bg-zinc-800',
        variant === 'secondary' &&
          'rounded-lg border border-transparent bg-zinc-200/90 text-zinc-900 shadow-none hover:bg-zinc-300/80 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/45',
        variant === 'ghost' &&
          'rounded-lg border border-transparent text-zinc-700 shadow-none hover:bg-zinc-100 dark:text-brand-200 dark:hover:bg-brand-900/30',
        variant === 'link' &&
          'rounded-md text-zinc-600 shadow-none underline-offset-4 hover:underline dark:text-brand-300',
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
