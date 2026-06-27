import type { Client } from '@/types'

const STORE_CLIENT_KEYWORDS = [
  'casa artesanal',
  'casaartesanal',
  'corozal',
  'sahagun',
  'sincelejo',
  'store',
  'tienda',
  'microtienda',
  'micro tienda',
  'sucursal',
]

export function isStoreClient(client: Client): boolean {
  if (!client?.name) return false
  const nameLower = client.name.toLowerCase()
  return STORE_CLIENT_KEYWORDS.some(keyword => nameLower.includes(keyword))
}

export function filterNonStoreClients(clients: Client[]): Client[] {
  return clients.filter(client => client && !isStoreClient(client))
}
