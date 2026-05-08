import { DashboardStats } from '@/types'

export const timeBasedStats: Record<string, DashboardStats> = {
  week: {
    totalSales: 18500,
    totalInvestment: 12000,
    totalProfit: 6500,
    profitMargin: 35.1,
    totalProducts: 156,
    totalClients: 89,
    pendingPayments: 3200,
    lowStockProducts: 12
  },
  month: {
    totalSales: 125000,
    totalInvestment: 85000,
    totalProfit: 40000,
    profitMargin: 32.0,
    totalProducts: 156,
    totalClients: 89,
    pendingPayments: 12500,
    lowStockProducts: 12
  },
  year: {
    totalSales: 1850000,
    totalInvestment: 1250000,
    totalProfit: 600000,
    profitMargin: 32.4,
    totalProducts: 156,
    totalClients: 89,
    pendingPayments: 45000,
    lowStockProducts: 12
  },
  all: {
    totalSales: 2500000,
    totalInvestment: 1700000,
    totalProfit: 800000,
    profitMargin: 32.0,
    totalProducts: 156,
    totalClients: 89,
    pendingPayments: 75000,
    lowStockProducts: 12
  }
}

export const getPeriodChanges = (period: string) => {
  const changes = {
    week: {
      sales: '+8.2%',
      investment: '+5.1%',
      profit: '+12.3%',
      margin: '+1.2%',
      products: '+2',
      clients: '+3',
      payments: '-1',
      stock: 'Requiere atención'
    },
    month: {
      sales: '+12.5%',
      investment: '+8.2%',
      profit: '+15.3%',
      margin: '+2.1%',
      products: '+3',
      clients: '+5',
      payments: '-2',
      stock: 'Requiere atención'
    },
    year: {
      sales: '+18.7%',
      investment: '+15.2%',
      profit: '+22.1%',
      margin: '+3.4%',
      products: '+12',
      clients: '+18',
      payments: '-8',
      stock: 'Requiere atención'
    },
    all: {
      sales: '+25.3%',
      investment: '+22.1%',
      profit: '+28.7%',
      margin: '+4.2%',
      products: '+24',
      clients: '+35',
      payments: '-15',
      stock: 'Requiere atención'
    }
  }
  
  return changes[period as keyof typeof changes] || changes.month
}

export const getPeriodLabel = (period: string) => {
  switch (period) {
    case 'week':
      return 'Esta Semana'
    case 'month':
      return 'Este Mes'
    case 'year':
      return 'Este Año'
    case 'all':
      return 'Todo el Tiempo'
    default:
      return 'Este Mes'
  }
}

export const getPeriodDescription = (period: string) => {
  switch (period) {
    case 'week':
      return 'Métricas de los últimos 7 días'
    case 'month':
      return 'Métricas del mes actual'
    case 'year':
      return 'Métricas del año actual'
    case 'all':
      return 'Métricas históricas completas'
    default:
      return 'Métricas del mes actual'
  }
}
