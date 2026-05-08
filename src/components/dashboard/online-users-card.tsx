'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wifi, WifiOff, Circle } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface OnlineUser {
  id: string
  name: string
  email: string
  lastSeen: string
  role: string
}

interface OnlineUsersCardProps {
  onlineUsers: OnlineUser[]
  totalUsers: number
}

export function OnlineUsersCard({ onlineUsers, totalUsers }: OnlineUsersCardProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) {
      return 'Ahora mismo'
    } else if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `Hace ${hours}h`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `Hace ${days}d`
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'vendedor':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'cajero':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'inventario':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'contador':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-400'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'vendedor':
        return 'Vendedor'
      case 'cajero':
        return 'Cajero'
      case 'inventario':
        return 'Inventario'
      case 'contador':
        return 'Contador'
      default:
        return 'Usuario'
    }
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 mr-3">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Usuarios en Línea</span>
          <Badge className="ml-3 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
            {onlineUsers.length} conectado{onlineUsers.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {onlineUsers.length > 0 ? (
            <div className="space-y-3">
              {onlineUsers.map((user) => (
                <div key={user.id} className="p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm border border-green-200 dark:border-green-800/30">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <UserAvatar name={user.name} seed={user.id} size="lg" />
                      <div className="absolute -bottom-1 -right-1">
                        <div className="p-1 rounded-full bg-green-500">
                          <Circle className="h-2 w-2 text-white fill-current" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {user.name}
                        </h4>
                        <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Wifi className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(user.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-neutral-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <WifiOff className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Ningún usuario en línea
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No hay usuarios conectados al sistema
              </p>
            </div>
          )}

          {/* Resumen */}
          <div className="pt-4 border-t border-gray-100 dark:border-neutral-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total de usuarios registrados
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalUsers}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
