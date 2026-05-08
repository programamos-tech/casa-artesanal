'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User } from '@/types'
import { AuthService } from '@/lib/auth-service'
import { persistZonatUser, clearZonatSessionCookie, setZonatSessionCookie } from '@/lib/auth-session'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  createUser: (userData: any) => Promise<boolean>
  getAllUsers: () => Promise<User[]>
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>
  deleteUser: (id: string) => Promise<boolean>
  switchStore: (storeId: string | undefined) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function parseStoredUser(json: string): User | null {
  try {
    const o = JSON.parse(json) as User & { storeId?: string | null }
    return {
      ...o,
      storeId: o.storeId === null || o.storeId === undefined ? undefined : o.storeId
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearClientSession = useCallback(() => {
    localStorage.removeItem('casa_artesanal_user')
    clearZonatSessionCookie()
  }, [])

  // Verificar sesión al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('casa_artesanal_user')
          if (savedUser) {
            let userData: { storeId?: unknown }
            try {
              userData = JSON.parse(savedUser)
            } catch {
              clearClientSession()
              return
            }
            const savedStoreId = userData.storeId

            const currentUser = await AuthService.getCurrentUser()
            if (currentUser) {
              if (savedStoreId !== undefined) {
                currentUser.storeId = savedStoreId === null ? undefined : (savedStoreId as string)
              }

              setUser(currentUser)
              persistZonatUser(currentUser)
            } else {
              clearClientSession()
            }
          }
        }
      } catch (e) {
        console.error('[AuthProvider] checkAuth:', e)
        try {
          clearClientSession()
        } catch {
          /* ignore */
        }
      } finally {
        setIsLoading(false)
      }
    }

    void checkAuth()
  }, [clearClientSession])

  // Otras pestañas: mismo origen — sincronizar usuario y cookie de middleware
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'casa_artesanal_user' || e.storageArea !== localStorage) return
      if (e.newValue === null) {
        setUser(null)
        clearZonatSessionCookie()
        return
      }
      const parsed = parseStoredUser(e.newValue)
      if (parsed) {
        setUser(parsed)
        setZonatSessionCookie(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Renovación deslizante: al volver a la pestaña y cada ~20 min mientras hay sesión
  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    const refreshCookieFromStorage = () => {
      const raw = localStorage.getItem('casa_artesanal_user')
      if (raw) setZonatSessionCookie(raw)
    }

    refreshCookieFromStorage()
    const id = window.setInterval(refreshCookieFromStorage, 20 * 60 * 1000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshCookieFromStorage()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [user])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)

    try {
      const userData = await AuthService.login(email, password)

      if (userData) {
        setUser(userData)
        if (typeof window !== 'undefined') {
          persistZonatUser(userData)
        }
        setIsLoading(false)

        return true
      }

      setIsLoading(false)
      return false
    } catch (error) {
      setIsLoading(false)
      return false
    }
  }

  const createUser = async (userData: any): Promise<boolean> => {
    try {
      const newUser = await AuthService.createUser(userData, user?.id)
      return newUser !== null
    } catch (error) {
      return false
    }
  }

  const getAllUsers = async (): Promise<User[]> => {
    try {
      return await AuthService.getAllUsers()
    } catch (error) {
      return []
    }
  }

  const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
    try {
      const success = await AuthService.updateUser(id, updates, user?.id)

      if (success && user?.id === id) {
        const updatedUser = await AuthService.getUserById(id)
        if (updatedUser) {
          setUser(updatedUser)
          if (typeof window !== 'undefined') {
            persistZonatUser(updatedUser)
          }
        }
      }
      return success
    } catch (error) {
      return false
    }
  }

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      return await AuthService.deleteUser(id, user?.id)
    } catch (error) {
      return false
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      clearClientSession()
    }
  }

  const switchStore = (storeId: string | undefined) => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      storeId: storeId === undefined ? undefined : storeId
    }

    setUser(updatedUser)
    if (typeof window !== 'undefined') {
      persistZonatUser(updatedUser)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        createUser,
        getAllUsers,
        updateUser,
        deleteUser,
        switchStore
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
