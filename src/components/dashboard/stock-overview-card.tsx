'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Warehouse, Store, AlertTriangle, CheckCircle } from 'lucide-react'

interface StockOverviewCardProps {
  totalStock: number
  warehouseStock: number
  localStock: number
  lowStockProducts: number
  outOfStockProducts: number
  totalProducts: number
}

export function StockOverviewCard({
  totalStock,
  warehouseStock,
  localStock,
  lowStockProducts,
  outOfStockProducts,
  totalProducts
}: StockOverviewCardProps) {
  const getStockStatus = () => {
    if (outOfStockProducts > 0) {
      return {
        status: 'critical',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        icon: AlertTriangle,
        message: `${outOfStockProducts} productos sin stock`
      }
    } else if (lowStockProducts > 0) {
      return {
        status: 'warning',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        icon: AlertTriangle,
        message: `${lowStockProducts} productos con stock bajo`
      }
    } else {
      return {
        status: 'good',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        icon: CheckCircle,
        message: 'Stock en buen estado'
      }
    }
  }

  const stockStatus = getStockStatus()
  const StatusIcon = stockStatus.icon

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 mr-3">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Resumen de Stock</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estado general del stock */}
          <div className={`p-4 rounded-xl ${stockStatus.bgColor} shadow-sm`}>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
                <StatusIcon className={`h-4 w-4 ${stockStatus.color}`} />
              </div>
              <span className={`font-medium ${stockStatus.color}`}>
                {stockStatus.message}
              </span>
            </div>
          </div>

          {/* Distribución del stock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-700 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {totalStock.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Unidades
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Warehouse className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {warehouseStock.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                En Bodega
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Store className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {localStock.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                En Local
              </p>
            </div>
          </div>

          {/* Estadísticas adicionales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {totalProducts}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Productos Totales
              </p>
            </div>

            <div className="text-center p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {lowStockProducts + outOfStockProducts}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Requieren Atención
              </p>
            </div>
          </div>

          {/* Porcentaje de distribución */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Bodega</span>
                <span>{totalStock > 0 ? ((warehouseStock / totalStock) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalStock > 0 ? (warehouseStock / totalStock) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Local</span>
                <span>{totalStock > 0 ? ((localStock / totalStock) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalStock > 0 ? (localStock / totalStock) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
