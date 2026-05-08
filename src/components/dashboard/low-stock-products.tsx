'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { Product } from '@/types'

interface LowStockProductsProps {
  products: Product[]
}

export function LowStockProducts({ products }: LowStockProductsProps) {
  const lowStockProducts = products.filter(product => product.stock.total <= 5) // Mostrar productos con stock total bajo

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'bg-red-100 text-red-800' }
    if (stock <= 5) return { label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'En Stock', color: 'bg-green-100 text-green-800' }
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          Productos con Stock Bajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No hay productos con stock bajo</p>
            </div>
          ) : (
            lowStockProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock.total)
              return (
                <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <Badge className={stockStatus.color}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      Ref: {product.reference} | Categoría: {product.categoryId}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        Stock total: <span className="font-medium">{product.stock.total}</span>
                      </span>
                      <span className="text-gray-600">
                        Bodega: <span className="font-medium">{product.stock.warehouse}</span>
                      </span>
                      <span className="text-gray-600">
                        Local: <span className="font-medium">{product.stock.store}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
