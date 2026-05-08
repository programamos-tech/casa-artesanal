'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CURRENT_RELEASE_ID,
  RELEASE_STORAGE_KEY,
  releaseNotes,
} from '@/config/app-release'
import { cn } from '@/lib/utils'

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false)

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(RELEASE_STORAGE_KEY, CURRENT_RELEASE_ID)
    } catch {
      // ignore quota / private mode
    }
  }, [])

  useEffect(() => {
    try {
      const seen = localStorage.getItem(RELEASE_STORAGE_KEY)
      if (seen !== CURRENT_RELEASE_ID) {
        setOpen(true)
      }
    } catch {
      setOpen(true)
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      markSeen()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(90vh,32rem)] gap-0 overflow-hidden border-zinc-200/90 p-0 dark:border-zinc-700 sm:max-w-lg',
          'bg-white dark:bg-zinc-950'
        )}
      >
        <DialogHeader className="space-y-0 border-b border-zinc-200/80 bg-zinc-50/80 px-6 py-5 text-left dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {releaseNotes.title}
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                {releaseNotes.intro}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(50vh,20rem)] overflow-y-auto px-6 py-4">
          <ul className="list-none space-y-3 text-sm text-zinc-800 dark:text-zinc-200">
            {releaseNotes.items.map((text, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80 dark:bg-emerald-400/80"
                  aria-hidden
                />
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="border-t border-zinc-200/80 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30 sm:justify-end">
          <Button
            type="button"
            className="w-full sm:w-auto sm:min-w-[10rem]"
            onClick={() => handleOpenChange(false)}
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
