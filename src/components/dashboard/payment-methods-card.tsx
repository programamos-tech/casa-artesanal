'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, DollarSign, Smartphone, Building2, Shield, Zap } from 'lucide-react'

interface PaymentMethod {
  method: string
  count: number
  percentage: number
  totalAmount: number
}

interface PaymentMethodsCardProps {
  paymentMethods: PaymentMethod[]
}

export function PaymentMethodsCard({ paymentMethods }: PaymentMethodsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
      case 'efectivo':
        return <DollarSign className="h-5 w-5" />
      case 'credit':
      case 'crédito':
        return <CreditCard className="h-5 w-5" />
      case 'nequi':
        return <Smartphone className="h-5 w-5" />
      case 'bancolombia':
        return <Building2 className="h-5 w-5" />
      case 'transfer':
      case 'transferencia':
        return <Smartphone className="h-5 w-5" />
      case 'card':
      case 'tarjeta':
        return <CreditCard className="h-5 w-5" />
      case 'warranty':
      case 'garantía':
        return <Shield className="h-5 w-5" />
      case 'mixed':
      case 'mixto':
        return <Zap className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
      case 'efectivo':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-800 dark:text-green-400',
          bar: 'bg-green-500'
        }
      case 'credit':
      case 'crédito':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-800 dark:text-blue-400',
          bar: 'bg-blue-500'
        }
      case 'nequi':
      case 'bancolombia':
      case 'transfer':
      case 'transferencia':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/20',
          text: 'text-purple-800 dark:text-purple-400',
          bar: 'bg-purple-500'
        }
      case 'card':
      case 'tarjeta':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/20',
          text: 'text-amber-800 dark:text-amber-400',
          bar: 'bg-amber-500'
        }
      case 'warranty':
      case 'garantía':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'text-yellow-800 dark:text-yellow-400',
          bar: 'bg-yellow-500'
        }
      case 'mixed':
      case 'mixto':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/20',
          text: 'text-orange-800 dark:text-orange-400',
          bar: 'bg-orange-500'
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-neutral-800',
          text: 'text-gray-800 dark:text-gray-300',
          bar: 'bg-gray-500'
        }
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Efectivo'
      case 'credit':
        return 'Crédito'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia'
      case 'card':
        return 'Tarjeta'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const sortedMethods = [...paymentMethods].sort((a, b) => b.count - a.count)

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 mr-3">
            <CreditCard className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Métodos de Pago Más Utilizados</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMethods.length > 0 ? (
            sortedMethods.map((method, index) => {
              const colors = getMethodColor(method.method)
              const isTop = index === 0
              
              return (
                <div key={method.method} className="p-4 rounded-xl bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${colors.bg} shadow-sm`}>
                          <div className={colors.text}>
                            {getMethodIcon(method.method)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`font-medium ${colors.text}`}>
                              {getMethodLabel(method.method)}
                            </p>
                            {isTop && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs">
                                #1
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {method.count} transacciones
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(method.totalAmount)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {method.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-700 ${colors.bar}`}
                        style={{ width: `${method.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-neutral-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay datos de métodos de pago
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
