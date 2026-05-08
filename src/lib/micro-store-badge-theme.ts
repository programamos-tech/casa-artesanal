/**
 * Color estable por microtienda (hash del id) para identificar sucursales de un vistazo.
 */
function hashStoreId(storeId: string): number {
  let h = 0
  for (let i = 0; i < storeId.length; i++) {
    h = (Math.imul(31, h) + storeId.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const PALETTES = [
  {
    shell:
      'border-sky-500/35 bg-sky-500/[0.09] text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/[0.14] dark:text-sky-100',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  {
    shell:
      'border-violet-500/35 bg-violet-500/[0.09] text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/[0.14] dark:text-violet-100',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  {
    shell:
      'border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/[0.12] dark:text-amber-100',
    icon: 'text-amber-700 dark:text-amber-400',
  },
  {
    shell:
      'border-rose-500/35 bg-rose-500/[0.09] text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/[0.14] dark:text-rose-100',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  {
    shell:
      'border-cyan-500/35 bg-cyan-500/[0.09] text-cyan-950 dark:border-cyan-400/40 dark:bg-cyan-500/[0.14] dark:text-cyan-100',
    icon: 'text-cyan-700 dark:text-cyan-400',
  },
  {
    shell:
      'border-orange-500/40 bg-orange-500/[0.1] text-orange-950 dark:border-orange-400/45 dark:bg-orange-500/[0.12] dark:text-orange-100',
    icon: 'text-orange-700 dark:text-orange-400',
  },
  {
    shell:
      'border-fuchsia-500/35 bg-fuchsia-500/[0.09] text-fuchsia-900 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/[0.14] dark:text-fuchsia-100',
    icon: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    shell:
      'border-teal-500/35 bg-teal-500/[0.09] text-teal-950 dark:border-teal-400/40 dark:bg-teal-500/[0.14] dark:text-teal-100',
    icon: 'text-teal-700 dark:text-teal-400',
  },
  {
    shell:
      'border-indigo-500/35 bg-indigo-500/[0.09] text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-500/[0.14] dark:text-indigo-100',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    shell:
      'border-lime-600/35 bg-lime-500/[0.12] text-lime-950 dark:border-lime-400/40 dark:bg-lime-500/[0.12] dark:text-lime-100',
    icon: 'text-lime-800 dark:text-lime-400',
  },
] as const

export function getMicroStoreBadgePalette(storeId: string): (typeof PALETTES)[number] {
  const idx = hashStoreId(storeId) % PALETTES.length
  return PALETTES[idx]!
}
