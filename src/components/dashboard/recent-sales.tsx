'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sale } from '@/types'

interface RecentSalesProps {
  sales: Sale[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800'
      case 'credit':
        return 'bg-blue-100 text-blue-800'
      case 'transfer':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle>Ventas Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{sale.clientName}</h4>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatDate(sale.createdAt)}</span>
                  <Badge className={getStatusColor(sale.status)}>
                    {sale.status === 'completed' ? 'Completada' : 
                     sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                  </Badge>
                  <Badge className={getPaymentMethodColor(sale.paymentMethod)}>
                    {sale.paymentMethod === 'cash' ? 'Efectivo' :
                     sale.paymentMethod === 'credit' ? 'Crédito' : 'Transferencia'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {sale.items.length} producto(s) vendido(s)
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
