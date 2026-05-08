'use client'

import { cn } from '@/lib/utils'

interface ZonatBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function ZonatBadge({ className, size = 'md', showText = true }: ZonatBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const logoSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn(
      "inline-flex items-center space-x-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold shadow-sm",
      sizeClasses[size],
      className
    )}>
      <img 
        src="/logo2.png" 
        alt="ZONA T Logo" 
        className={cn(logoSize[size])}
      />
      {showText && (
        <span>ZONA T</span>
      )}
    </div>
  )
}
