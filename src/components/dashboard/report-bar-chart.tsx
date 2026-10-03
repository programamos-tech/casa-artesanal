'use client'

import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type ReportBarSeries = {
  key: string
  name: string
  color: string
}

export const REPORT_CHART_COLORS = {
  primary: '#E39B3A',
  secondary: '#8B8DB4',
  tertiary: '#5FA88B',
  abono: '#0EA5E9',
} as const

export function compactCop(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')}M`
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${Math.round(value)}`
}

const fullCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

type Props = {
  data: Array<Record<string, string | number>>
  categoryKey: string
  series: ReportBarSeries[]
  isDarkMode: boolean
  height?: number
  hideValues?: boolean
  showValues?: boolean
  /** Eje y etiquetas cortas. Por defecto, pesos compactos. */
  formatCompact?: (value: number) => string
  /** Tooltip. Por defecto, pesos completos. */
  formatValue?: (value: number) => string
}

export function ReportBarChart({
  data,
  categoryKey,
  series,
  isDarkMode,
  height = 260,
  hideValues = false,
  showValues,
  formatCompact = compactCop,
  formatValue = fullCop,
}: Props) {
  const axisColor = isDarkMode ? '#a1a1aa' : '#71717a'
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const labelColor = isDarkMode ? '#f4f4f5' : '#27272a'
  const labelsOn = !hideValues && (showValues ?? data.length * series.length <= 12)

  return (
    <div className="w-full min-w-0">
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%" barGap={4}>
            <CartesianGrid vertical={false} stroke={gridColor} />
            <XAxis
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: axisColor }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11, fill: axisColor }}
              tickFormatter={(v: number) => (hideValues ? '' : formatCompact(v))}
            />
            <Tooltip
              cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
              formatter={(value: number, name: string) => [hideValues ? '••••••' : formatValue(value), name]}
              contentStyle={{
                backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#3f3f46' : '#e4e4e7'}`,
                borderRadius: 8,
                fontSize: 12,
                color: labelColor,
              }}
              labelStyle={{ color: labelColor, fontWeight: 600 }}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} maxBarSize={44}>
                {labelsOn ? (
                  <LabelList
                    dataKey={s.key}
                    position="top"
                    formatter={(v: ReactNode) => (typeof v === 'number' && v > 0 ? formatCompact(v) : '')}
                    style={{ fontSize: 11, fontWeight: 600, fill: labelColor }}
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span
                aria-hidden
                className="casa-artesanal-preserve-surface h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
