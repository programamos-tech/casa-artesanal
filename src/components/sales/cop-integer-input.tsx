'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCopInputDigits, parseCopInput } from '@/lib/cop-number-input'

interface CopIntegerInputProps {
  value: number
  onValueChange: (value: number) => void
  className?: string
  'aria-label'?: string
  placeholder?: string
  title?: string
  disabled?: boolean
  readOnly?: boolean
}

/** Input numérico COP: muestra separador de miles mientras se escribe y al enfocar. */
export function CopIntegerInput({
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
  placeholder,
  title,
  disabled,
  readOnly,
}: CopIntegerInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDraft(null)
    }
  }, [value, isFocused])

  const displayValue =
    isFocused && draft !== null
      ? draft
      : value > 0
        ? formatCopInputDigits(String(Math.round(value)))
        : ''

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      disabled={disabled}
      readOnly={readOnly}
      onFocus={() => {
        if (disabled || readOnly) return
        setIsFocused(true)
        setDraft(value > 0 ? formatCopInputDigits(String(Math.round(value))) : '')
      }}
      onChange={e => {
        if (disabled || readOnly) return
        const digits = e.target.value.replace(/[^\d]/g, '')
        const formatted = formatCopInputDigits(digits)
        setDraft(formatted)
        onValueChange(parseCopInput(digits))
      }}
      onBlur={() => {
        setIsFocused(false)
        setDraft(null)
      }}
      title={title}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={cn(className)}
    />
  )
}
