import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import type { MonthlyData, CategoryBreakdown } from '../types'
import { formatCurrency } from '../utils/formatters'

interface MonthlyChartProps {
  data: MonthlyData[]
  currencySymbol: string
  currencyLocale: string
}

function CustomTooltip({ active, payload, label, currencySymbol, currencyLocale }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currencySymbol: string
  currencyLocale: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10, 15, 30, 0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '10px 14px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {entry.name}: {formatCurrency(entry.value, currencySymbol, currencyLocale)}
        </p>
      ))}
    </div>
  )
}

export function MonthlyBarChart({ data, currencySymbol, currencyLocale }: MonthlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4} barCategoryGap="28%">
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          width={52}
        />
        <Tooltip
          content={<CustomTooltip currencySymbol={currencySymbol} currencyLocale={currencyLocale} />}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, paddingTop: 12 }}
        />
        <Bar dataKey="income" name="Income" fill="url(#incomeGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        <Bar dataKey="expenses" name="Expenses" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface PieChartProps {
  data: CategoryBreakdown[]
  currencySymbol: string
  currencyLocale: string
}

function PieTooltip({ active, payload, currencySymbol, currencyLocale }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: CategoryBreakdown }>
  currencySymbol: string
  currencyLocale: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{
      background: 'rgba(10, 15, 30, 0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '10px 14px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <p style={{ color: item.payload.color, fontWeight: 600, fontSize: 13 }}>{item.name}</p>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
        {formatCurrency(item.value, currencySymbol, currencyLocale)}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
        {item.payload.percentage.toFixed(1)}%
      </p>
    </div>
  )
}

interface DailyDataPoint { day: string; expense: number; income: number }
interface DailyChartProps { data: DailyDataPoint[]; currencySymbol: string; currencyLocale: string }

export function DailySpendingChart({ data, currencySymbol, currencyLocale }: DailyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="dailyInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 11 }} axisLine={false} tickLine={false} width={48}
          tickFormatter={v => `${currencySymbol}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
        <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} currencyLocale={currencyLocale} />}
          cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="expense" name="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#dailyExp)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#4ade80" strokeWidth={2} fill="url(#dailyInc)" dot={false} activeDot={{ r: 4, fill: '#4ade80' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ExpensePieChart({ data, currencySymbol, currencyLocale }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          dataKey="amount"
          nameKey="category"
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.color}
              opacity={0.88}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip currencySymbol={currencySymbol} currencyLocale={currencyLocale} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
