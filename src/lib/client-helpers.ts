import { Client } from '@/types'

/** Clientes que representan tiendas del sistema (se editan desde Microtiendas). */
export function isStoreClient(client: Client): boolean {
  if (!client?.name) return false
  const nameLower = client.name.toLowerCase()
  const storeKeywords = ['casa artesanal', 'casaartesanal', 'corozal', 'sahagun', 'sincelejo']
  return storeKeywords.some((keyword) => nameLower.includes(keyword))
}
