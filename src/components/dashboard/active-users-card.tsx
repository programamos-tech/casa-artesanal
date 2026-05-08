'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, UserX, Clock, Activity } from 'lucide-react'

interface ActiveUsersCardProps {
  totalUsers: number
  onlineUsers: number
  offlineUsers: number
  lastActivity?: string
}

export function ActiveUsersCard({
  totalUsers,
  onlineUsers,
  offlineUsers,
  lastActivity
}: ActiveUsersCardProps) {
  const getOnlineStatus = () => {
    if (onlineUsers > 0) {
      return {
        status: 'online',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        label: 'Usuarios en línea'
      }
    } else {
      return {
        status: 'offline',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-neutral-800',
        label: 'Ningún usuario en línea'
      }
    }
  }

  const onlineStatus = getOnlineStatus()
  const onlinePercentage = totalUsers > 0 ? (onlineUsers / totalUsers) * 100 : 0

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 mr-3">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Usuarios en Línea</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estado general */}
          <div className={`p-4 rounded-xl ${onlineStatus.bgColor} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
                  <Activity className={`h-4 w-4 ${onlineStatus.color}`} />
                </div>
                <span className={`font-medium ${onlineStatus.color}`}>
                  {onlineStatus.label}
                </span>
              </div>
              <Badge className={`${onlineStatus.bgColor} ${onlineStatus.color}`}>
                {onlineUsers} en línea
              </Badge>
            </div>
          </div>

          {/* Estadísticas de usuarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-700 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {totalUsers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Usuarios
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {onlineUsers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                En Línea
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-700 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <UserX className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {offlineUsers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Desconectados
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Usuarios en Línea</span>
              <span>{onlinePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  onlineUsers > 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-400'
                }`}
                style={{ width: `${onlinePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Última actividad */}
          {lastActivity && (
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Última actividad: {lastActivity}</span>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Estado Actual
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {onlineUsers} de {totalUsers} usuarios en línea
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
