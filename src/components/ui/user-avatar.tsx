'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { createOpenPeepsDataUri } from '@/lib/dicebear-avatar'

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase()
}

const sizeClass = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base font-bold',
  xl: 'h-28 w-28 text-3xl font-bold'
} as const

const sizePixels: Record<keyof typeof sizeClass, number> = {
  xs: 28,
  sm: 36,
  md: 40,
  lg: 48,
  xl: 112
}

/** Solo si falla la imagen (foto o ilustración): fondo discreto, sin “marca” de rol. */
const fallbackClass =
  'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 dark:from-neutral-600 dark:to-neutral-700 dark:text-white'

export type UserAvatarSize = keyof typeof sizeClass

export interface UserAvatarProps {
  /** Nombre para accesibilidad y fallback de iniciales. */
  name: string
  /** Seed estable (p. ej. `user.id`) para que el mismo usuario siempre tenga el mismo muñeco. */
  seed?: string
  /** Foto real del usuario; si existe, sustituye a la ilustración. */
  src?: string | null
  alt?: string
  size?: UserAvatarSize
  className?: string
}

export function UserAvatar({
  name,
  seed,
  src,
  alt,
  size = 'md',
  className
}: UserAvatarProps) {
  const initials = getUserInitials(name || '?')
  const label = alt ?? name
  const photoSrc = src?.trim() || undefined
  const stableSeed = (seed ?? name).trim() || 'user'

  const illustratedUri = React.useMemo(
    () => createOpenPeepsDataUri(stableSeed, sizePixels[size]),
    [stableSeed, size]
  )

  const displaySrc = photoSrc ?? illustratedUri

  return (
    <Avatar className={cn(sizeClass[size], className)}>
      <AvatarImage src={displaySrc} alt={label} />
      <AvatarFallback delayMs={photoSrc ? 50 : 0} className={fallbackClass}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
