'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Target, PiggyBank } from 'lucide-react'

interface ProfitInvestmentCardProps {
  totalSales: number
  totalInvestment: number
  totalProfit: number
  profitMargin: number
  previousProfit?: number
  previousMargin?: number
}

export function ProfitInvestmentCard({
  totalSales,
  totalInvestment,
  totalProfit,
  profitMargin,
  previousProfit = 0,
  previousMargin = 0
}: ProfitInvestmentCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      return { change: 0, changeType: 'neutral' as const }
    }
    
    const change = ((current - previous) / previous) * 100
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    
    return { change: Math.abs(change), changeType }
  }

  const profitChange = calculateChange(totalProfit, previousProfit)
  const marginChange = calculateChange(profitMargin, previousMargin)

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />
      case 'negative':
        return <TrendingDown className="h-4 w-4" />
      default:
        return null
    }
  }

  const getMarginStatus = () => {
    if (profitMargin >= 50) {
      return {
        status: 'excellent',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        label: 'Excelente'
      }
    } else if (profitMargin >= 30) {
      return {
        status: 'good',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        label: 'Bueno'
      }
    } else if (profitMargin >= 15) {
      return {
        status: 'fair',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        label: 'Regular'
      }
    } else {
      return {
        status: 'poor',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        label: 'Bajo'
      }
    }
  }

  const marginStatus = getMarginStatus()

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 mr-3">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Inversión y Ganancias</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Resumen principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(totalSales)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ventas Totales
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(totalInvestment)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Inversión Total
              </p>
            </div>

            <div className="text-center p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(totalProfit)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ganancia Neta
              </p>
            </div>
          </div>

          {/* Margen de ganancia */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  Margen de Ganancia
                </span>
                <Badge className={`${marginStatus.bgColor} ${marginStatus.color}`}>
                  {marginStatus.label}
                </Badge>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {profitMargin.toFixed(1)}%
                </p>
                {previousMargin > 0 && (
                  <div className={`flex items-center justify-center space-x-2 ${getChangeColor(marginChange.changeType)}`}>
                    {getChangeIcon(marginChange.changeType)}
                    <span className="text-sm font-medium">
                      {marginChange.changeType === 'positive' ? '+' : marginChange.changeType === 'negative' ? '-' : ''}
                      {marginChange.change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      vs anterior
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de progreso del margen */}
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-700 ${
                    profitMargin >= 50 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    profitMargin >= 30 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    profitMargin >= 15 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${Math.min(profitMargin, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Comparación de ganancias */}
          {previousProfit > 0 && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Ganancia período anterior:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(previousProfit)}
                </span>
              </div>
              
              <div className={`flex items-center justify-center space-x-2 ${getChangeColor(profitChange.changeType)}`}>
                {getChangeIcon(profitChange.changeType)}
                <span className="text-sm font-medium">
                  {profitChange.changeType === 'positive' ? '+' : profitChange.changeType === 'negative' ? '-' : ''}
                  {profitChange.change.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  cambio en ganancias
                </span>
              </div>
            </div>
          )}

          {/* ROI (Return on Investment) */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Retorno de Inversión (ROI)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
