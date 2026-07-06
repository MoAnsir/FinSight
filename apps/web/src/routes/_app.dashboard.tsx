import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

interface Insights {
  categoryBreakdown: { category: string | null; _sum: { amount: string }; _count: number }[]
  monthlyTotals: { month: string; income: number; expenses: number }[]
}

function DashboardPage() {
  const { data, isLoading } = useQuery<Insights>({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights'),
  })

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard…</div>
      </div>
    )
  }

  const totalExpenses = data?.monthlyTotals?.reduce((sum, m) => sum + Number(m.expenses), 0) ?? 0
  const totalIncome = data?.monthlyTotals?.reduce((sum, m) => sum + Number(m.income), 0) ?? 0

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Income (6m)" value={formatCurrency(totalIncome)} color="text-green-600" />
        <StatCard label="Total Expenses (6m)" value={formatCurrency(totalExpenses)} color="text-red-500" />
        <StatCard label="Net Savings (6m)" value={formatCurrency(totalIncome - totalExpenses)} color="text-indigo-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Cash Flow (Last 6 Months)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data?.monthlyTotals ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="income" stroke="#22c55e" fill="#dcfce7" name="Income" />
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#fee2e2" name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Spending by Category</h2>
        <div className="space-y-3">
          {(data?.categoryBreakdown ?? []).slice(0, 8).map((c) => (
            <div key={c.category ?? 'Uncategorised'} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{c.category ?? 'Uncategorised'}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(Math.abs(Number(c._sum.amount)))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
