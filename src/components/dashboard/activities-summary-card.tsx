'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, ShoppingCart, Package, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'sale' | 'product' | 'client' | 'stock' | 'system'
  action: string
  description: string
  timestamp: string
  user?: string
  status: 'success' | 'warning' | 'error' | 'info'
}

interface ActivitiesSummaryCardProps {
  activities: ActivityItem[]
  limit?: number
}

export function ActivitiesSummaryCard({ activities, limit = 10 }: ActivitiesSummaryCardProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="h-4 w-4" />
      case 'product':
        return <Package className="h-4 w-4" />
      case 'client':
        return <Users className="h-4 w-4" />
      case 'stock':
        return <Package className="h-4 w-4" />
      case 'system':
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-800 dark:text-green-400',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'text-yellow-800 dark:text-yellow-400',
          icon: AlertCircle,
          iconColor: 'text-yellow-600'
        }
      case 'error':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-800 dark:text-red-400',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        }
      default:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-800 dark:text-blue-400',
          icon: Clock,
          iconColor: 'text-blue-600'
        }
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Venta'
      case 'product':
        return 'Producto'
      case 'client':
        return 'Cliente'
      case 'stock':
        return 'Stock'
      case 'system':
        return 'Sistema'
      default:
        return 'Actividad'
    }
  }

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

  const recentActivities = activities.slice(0, limit)

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm h-96">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 mr-3">
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Resumen de Actividades</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto space-y-3 pr-2">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => {
              const statusColors = getStatusColor(activity.status)
              const StatusIcon = statusColors.icon
              
              return (
                <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className={`p-2 rounded-xl ${statusColors.bg} shadow-sm`}>
                    <div className={statusColors.iconColor}>
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-sm font-medium ${statusColors.text}`}>
                        {getTypeLabel(activity.type)}
                      </span>
                      <StatusIcon className={`h-3 w-3 ${statusColors.iconColor}`} />
                    </div>
                    
                    <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                      {activity.action}
                    </p>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(activity.timestamp)}
                      </span>
                      {activity.user && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          por {activity.user}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-neutral-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay actividades recientes
              </p>
            </div>
          )}
        </div>
        
        {activities.length > limit && (
          <div className="pt-4 border-t border-gray-100 dark:border-neutral-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {limit} de {activities.length} actividades
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
