'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Construction, DollarSign, Clock, AlertCircle } from 'lucide-react'

export function DebtsConstructionCard() {
  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 mr-3">
            <Construction className="h-5 w-5 text-orange-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Gestión de Deudas</span>
          <Badge className="ml-3 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
            En Construcción
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="relative mb-6">
            <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Construction className="h-10 w-10 text-orange-500" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600 animate-pulse" />
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Módulo en Desarrollo
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Estamos trabajando en el módulo de gestión de deudas. Pronto podrás:
          </p>
          
          <div className="space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-neutral-800/50">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Registrar deudas de clientes
              </span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-neutral-800/50">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Seguimiento de pagos pendientes
              </span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-neutral-800/50">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Reportes de cartera
              </span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-neutral-800/50">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Alertas de vencimiento
              </span>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 shadow-sm">
            <div className="flex items-center justify-center space-x-2 text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Disponible próximamente
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
