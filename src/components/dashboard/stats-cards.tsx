'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  CreditCard, 
  AlertTriangle,
  ShoppingCart,
  BarChart3
} from 'lucide-react'
import { DashboardStats } from '@/types'
import { getPeriodChanges } from '@/data/timeBasedData'

interface StatsCardsProps {
  stats: DashboardStats
  period?: string
}

export function StatsCards({ stats, period = 'month' }: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  const changes = getPeriodChanges(period)

  const cards = [
    {
      title: 'Ventas Totales',
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: changes.sales,
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Inversión Total',
      value: formatCurrency(stats.totalInvestment),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: changes.investment,
      changeColor: 'text-blue-600'
    },
    {
      title: 'Ganancia Total',
      value: formatCurrency(stats.totalProfit),
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: changes.profit,
      changeColor: 'text-purple-600'
    },
    {
      title: 'Margen de Ganancia',
      value: formatPercentage(stats.profitMargin),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: changes.margin,
      changeColor: 'text-orange-600'
    },
    {
      title: 'Productos en Stock',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: changes.products,
      changeColor: 'text-indigo-600'
    },
    {
      title: 'Clientes Activos',
      value: stats.totalClients.toString(),
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: changes.clients,
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Pagos Pendientes',
      value: formatCurrency(stats.pendingPayments),
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: changes.payments,
      changeColor: 'text-red-600'
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockProducts.toString(),
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: changes.stock,
      changeColor: 'text-yellow-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {card.value}
            </div>
            <p className={`text-xs ${card.changeColor} mt-1`}>
              {card.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
