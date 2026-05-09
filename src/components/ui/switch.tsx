"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-black/[0.06] bg-zinc-300/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-600 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] dark:focus-visible:ring-offset-zinc-950 data-[state=checked]:border-brand-600/30 data-[state=checked]:bg-brand-500 data-[state=checked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] dark:data-[state=checked]:border-brand-400/25 dark:data-[state=checked]:bg-brand-500 data-[state=unchecked]:bg-zinc-300/90 dark:data-[state=unchecked]:bg-zinc-600",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.04)] ring-0 transition-transform will-change-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5 dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(255,255,255,0.08)]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
