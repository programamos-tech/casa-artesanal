'use client'

import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface PaymentMethodsChartProps {
  data: {
    labels: string[]
    datasets: {
      data: number[]
      backgroundColor: string[]
      borderColor: string[]
      borderWidth: number
    }[]
  }
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Métodos de Pago',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    cutout: '60%'
  }

  return (
    <div className="h-80">
      <Doughnut data={data} options={options} />
    </div>
  )
}
