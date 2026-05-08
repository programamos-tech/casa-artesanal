import { createAvatar } from '@dicebear/core'
import * as openPeeps from '@dicebear/open-peeps'

/** Avatares estilo ilustración (Open Peeps — CC0). Mismo seed ⇒ mismo personaje. */
export function createOpenPeepsDataUri(seed: string, size: number): string {
  const s = seed.trim() || 'anonymous'
  return createAvatar(openPeeps, {
    seed: s,
    size
  }).toDataUri()
}
