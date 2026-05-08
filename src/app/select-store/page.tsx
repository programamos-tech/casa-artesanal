'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from '@/types'
import { StoresService } from '@/lib/stores-service'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Store as StoreIcon, Crown, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { LoginThemeToggle } from '@/components/auth/login-theme-toggle'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export default function SelectStorePage() {
  const router = useRouter()
  const { user, switchStore } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [mainStore, setMainStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    // Verificar que el usuario sea super admin
    if (!user || !canAccessAllStores(user)) {
      router.push('/dashboard')
      return
    }

    loadStores()
  }, [user, router])

  const loadStores = async () => {
    try {
      setLoading(true)
      const allStores = await StoresService.getAllStores(true) // Incluir inactivas
      const main = await StoresService.getMainStore()
      
      // Separar tienda principal de las demás
      const otherStores = allStores.filter(s => s.id !== MAIN_STORE_ID)
      
      setMainStore(main)
      setStores(otherStores)
    } catch (error) {
      console.error('Error loading stores:', error)
      toast.error('Error al cargar las tiendas')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStore = async (store: Store) => {
    if (!switchStore) return
    
    try {
      setSelecting(store.id)
      
      // Tienda principal: guardar UUID explícito para badges, recepciones y permisos (no null)
      const newStoreId = store.id === MAIN_STORE_ID ? MAIN_STORE_ID : store.id
      switchStore(newStoreId)
      
      // Crear slug para la URL
      const storeSlug = store.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30)
      
      // Redirigir al dashboard
      router.push(`/dashboard?store=${storeSlug}`)
    } catch (error) {
      console.error('Error selecting store:', error)
      toast.error('Error al seleccionar la tienda')
      setSelecting(null)
    }
  }

  if (loading) {
    return (
      <div
        data-auth-page
        className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-black dark:via-neutral-950 dark:to-black"
      >
        <LoginThemeToggle className="absolute right-4 top-4 z-20 md:right-8 md:top-8" />
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Cargando tiendas...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-auth-page
      className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4 dark:from-black dark:via-neutral-950 dark:to-black"
    >
      <LoginThemeToggle className="absolute right-4 top-4 z-20 md:right-8 md:top-8" />
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center mb-3 md:mb-4">
            <Image
              src="/logo.ya.png"
              alt="La Casa Artesanal"
              width={72}
              height={72}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Selecciona la tienda a la que deseas acceder
          </h1>
        </div>

        {/* Tiendas */}
        {/* Mobile: Grid de 3 columnas */}
        <div className="sm:hidden grid grid-cols-3 gap-2 md:gap-4">
          {/* Tienda Principal */}
          {mainStore && (
            <Card
              onClick={() => handleSelectStore(mainStore)}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-900"
            >
              <CardContent className="p-2 md:p-4 flex flex-col items-center text-center">
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800 mb-1.5 md:mb-2">
                  {mainStore.logo ? (
                    <Image
                      src={mainStore.logo}
                      alt={mainStore.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StoreIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                  )}
                  <div className="absolute -top-0.5 -right-0.5 bg-yellow-500 dark:bg-yellow-400 text-white rounded-full p-0.5 md:p-1 shadow-lg border-2 border-white dark:border-neutral-800">
                    <Crown className="h-2 w-2 md:h-2.5 md:w-2.5" />
                  </div>
                </div>
                <p className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-white text-center line-clamp-2 leading-tight">
                  {mainStore.name}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Micro Tiendas */}
          {stores.map((store) => (
            <Card
              key={store.id}
              onClick={() => !store.isActive ? null : handleSelectStore(store)}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 ${
                !store.isActive ? 'opacity-50 cursor-not-allowed' : ''
              } border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900`}
            >
              <CardContent className="p-2 md:p-4 flex flex-col items-center text-center">
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shadow-md ring-2 ring-gray-200 dark:ring-gray-600 mb-1.5 md:mb-2">
                  {store.logo ? (
                    <Image
                      src={store.logo}
                      alt={store.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StoreIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <p className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-white text-center line-clamp-2 leading-tight">
                  {store.name}
                </p>
                {!store.isActive && (
                  <p className="text-[9px] md:text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                    Inactiva
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: Grid centrado */}
        <div className="hidden sm:flex sm:justify-center sm:flex-wrap gap-4">
          {/* Tienda Principal */}
          {mainStore && (
            <Card
              onClick={() => handleSelectStore(mainStore)}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-900"
            >
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center">
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800 mb-2 md:mb-3">
                  {mainStore.logo ? (
                    <Image
                      src={mainStore.logo}
                      alt={mainStore.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StoreIcon className="h-8 w-8 md:h-10 md:w-10 text-gray-400 dark:text-gray-500" />
                  )}
                  <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-yellow-500 dark:bg-yellow-400 text-white rounded-full p-1 md:p-1.5 shadow-lg border-2 border-white dark:border-neutral-800">
                    <Crown className="h-2.5 w-2.5 md:h-4 md:w-4" />
                  </div>
                </div>
                <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2 leading-tight">
                  {mainStore.name}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Micro Tiendas */}
          {stores.map((store) => (
            <Card
              key={store.id}
              onClick={() => !store.isActive ? null : handleSelectStore(store)}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 ${
                !store.isActive ? 'opacity-50 cursor-not-allowed' : ''
              } border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900`}
            >
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center">
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shadow-md ring-2 ring-gray-200 dark:ring-gray-600 mb-2 md:mb-3">
                  {store.logo ? (
                    <Image
                      src={store.logo}
                      alt={store.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StoreIcon className="h-8 w-8 md:h-10 md:w-10 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2 leading-tight">
                  {store.name}
                </p>
                {!store.isActive && (
                  <p className="text-[10px] md:text-xs text-red-600 dark:text-red-400 mt-0.5">
                    Inactiva
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
