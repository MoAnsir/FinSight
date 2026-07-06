import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_app/insights')({
  component: InsightsPage,
})

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function InsightsPage() {
  const { data, isLoading } = useQuery<{ categoryBreakdown: { category: string | null; _sum: { amount: string }; _count: number }[] }>({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights'),
  })

  const pieData = (data?.categoryBreakdown ?? [])
    .filter((c) => Number(c._sum.amount) < 0)
    .map((c) => ({ name: c.category ?? 'Other', value: Math.abs(Number(c._sum.amount)) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Insights</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
