'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Receipt, User, CreditCard, Calendar } from 'lucide-react'

interface RecentSale {
  id: string
  invoiceNumber: string
  clientName: string
  total: number
  paymentMethod: string
  createdAt: string
  status: string
}

interface RecentSalesCardProps {
  sales: RecentSale[]
  limit?: number
}

export function RecentSalesCard({ sales, limit = 8 }: RecentSalesCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <CreditCard className="h-4 w-4" />
      case 'credit':
        return <CreditCard className="h-4 w-4" />
      case 'transfer':
        return <CreditCard className="h-4 w-4" />
      case 'warranty':
        return <CreditCard className="h-4 w-4" />
      case 'mixed':
        return <CreditCard className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'credit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'warranty':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'mixed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-400'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Efectivo'
      case 'credit':
        return 'Crédito'
      case 'transfer':
        return 'Transferencia'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-400'
    }
  }

  const recentSales = sales.slice(0, limit)

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm h-96">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 mr-3">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Ventas Recientes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto space-y-3 pr-2">
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div key={sale.id} className="p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      #{sale.invoiceNumber}
                    </h4>
                    <Badge className={`text-xs ${getStatusColor(sale.status)}`}>
                      {sale.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTime(sale.createdAt)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {sale.clientName}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded ${getPaymentMethodColor(sale.paymentMethod)}`}>
                        {getPaymentMethodIcon(sale.paymentMethod)}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </span>
                    </div>
                    
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-neutral-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay ventas recientes
              </p>
            </div>
          )}
        </div>
        
        {sales.length > limit && (
          <div className="pt-4 border-t border-gray-100 dark:border-neutral-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {limit} de {sales.length} ventas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
