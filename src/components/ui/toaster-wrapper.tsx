'use client'

import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'

export function ToasterWrapper() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <Toaster />
}

