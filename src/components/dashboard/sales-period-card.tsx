'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Target } from 'lucide-react'

interface SalesPeriodCardProps {
  period: 'week' | 'month' | 'quarter' | 'year'
  sales: number
  previousSales: number
  label: string
}

export function SalesPeriodCard({ period, sales, previousSales, label }: SalesPeriodCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateChange = () => {
    if (previousSales === 0) {
      return { change: 0, changeType: 'neutral' as const }
    }
    
    const change = ((sales - previousSales) / previousSales) * 100
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    
    return { change: Math.abs(change), changeType }
  }

  const { change, changeType } = calculateChange()

  const getPeriodIcon = () => {
    switch (period) {
      case 'week':
        return <Calendar className="h-5 w-5 text-blue-500" />
      case 'month':
        return <BarChart3 className="h-5 w-5 text-emerald-500" />
      case 'quarter':
        return <TrendingUp className="h-5 w-5 text-purple-500" />
      case 'year':
        return <Target className="h-5 w-5 text-orange-500" />
      default:
        return <BarChart3 className="h-5 w-5 text-emerald-500" />
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />
      case 'negative':
        return <TrendingDown className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white dark:bg-neutral-800 shadow-sm">
              {getPeriodIcon()}
            </div>
            <span className="text-lg font-medium text-gray-800 dark:text-gray-200">{label}</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {formatCurrency(sales)}
            </p>
            {previousSales > 0 && (
              <div className={`flex items-center space-x-2 ${getChangeColor()}`}>
                <div className="flex items-center space-x-1">
                  {getChangeIcon()}
                  <span className="text-sm font-medium">
                    {changeType === 'positive' ? '+' : changeType === 'negative' ? '-' : ''}
                    {change.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs anterior
                </span>
              </div>
            )}
          </div>
          
          {previousSales > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-neutral-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Anterior: {formatCurrency(previousSales)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
