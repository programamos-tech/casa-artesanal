'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, TrendingUp, Award } from 'lucide-react'

interface TopProduct {
  id: string
  name: string
  quantitySold: number
  totalRevenue: number
  category?: string
}

interface TopProductsCardProps {
  products: TopProduct[]
  limit?: number
}

export function TopProductsCard({ products, limit = 5 }: TopProductsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Award className="h-4 w-4 text-yellow-500" />
      case 1:
        return <Award className="h-4 w-4 text-gray-400" />
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
      case 1:
        return 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-300'
      case 2:
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400'
      default:
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
    }
  }

  const topProducts = products.slice(0, limit)

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 mr-3">
            <Package className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Productos Más Vendidos</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl ${getRankColor(index)} shadow-sm`}>
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    {product.category && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {product.category}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {product.quantitySold}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(product.totalRevenue)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-neutral-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay productos vendidos aún
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
