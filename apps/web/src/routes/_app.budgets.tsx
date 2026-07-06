import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@finsight/config'
import type { BudgetProgress } from '@finsight/types'

export const Route = createFileRoute('/_app/budgets')({
  component: BudgetsPage,
})

function BudgetsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0])
  const [limit, setLimit] = useState('')

  const { data: budgets = [], isLoading } = useQuery<BudgetProgress[]>({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets'),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/budgets', { category, limitAmount: parseFloat(limit), period: 'monthly' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowForm(false); setLimit('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          + New Budget
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-semibold mb-4">Create Budget</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="flex gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {TRANSACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Monthly limit (£)" value={limit} onChange={(e) => setLimit(e.target.value)}
              className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm" required min={1} step={0.01} />
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              Save
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium text-gray-900">{b.category}</span>
                  <span className="text-sm text-gray-500 ml-2">{b.period}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {formatCurrency(b.spent)} / {formatCurrency(Number(b.limitAmount))}
                  </span>
                  <button onClick={() => deleteMutation.mutate(b.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${b.percentUsed > 90 ? 'bg-red-500' : b.percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{b.percentUsed}% used · {formatCurrency(b.remaining)} remaining</p>
            </div>
          ))}
          {budgets.length === 0 && <p className="text-gray-500 text-sm">No budgets yet. Create one to start tracking.</p>}
        </div>
      )}
    </div>
  )
}
