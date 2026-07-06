import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { formatCurrency } from '@/lib/utils'
import { Button, Card, PageHeader } from '@/components/ui'
import { TRANSACTION_CATEGORIES } from '@finsight/config'
import type { BudgetProgress } from '@finsight/types'

export const Route = createFileRoute('/_app/budgets')({
  component: BudgetsPage,
})

function BudgetBar({ percentUsed }: { percentUsed: number }) {
  const color = percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
    </div>
  )
}

function BudgetCard({ budget }: { budget: BudgetProgress }) {
  const deleteMutation = useDeleteBudget()
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium text-gray-900">{budget.category}</span>
          <span className="text-sm text-gray-500 ml-2">{budget.period}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {formatCurrency(budget.spent)} / {formatCurrency(Number(budget.limitAmount))}
          </span>
          <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(budget.id)}>
            Remove
          </Button>
        </div>
      </div>
      <BudgetBar percentUsed={budget.percentUsed} />
      <p className="text-xs text-gray-500 mt-1">{budget.percentUsed}% used · {formatCurrency(budget.remaining)} remaining</p>
    </Card>
  )
}

function CreateBudgetForm({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0])
  const [limit, setLimit] = useState('')
  const createMutation = useCreateBudget()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(
      { category: category!, limitAmount: parseFloat(limit), period: 'monthly' },
      { onSuccess: onClose },
    )
  }

  return (
    <Card className="mb-6">
      <h2 className="text-base font-semibold mb-4">Create Budget</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {TRANSACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          placeholder="Monthly limit (£)"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
          min={1}
          step={0.01}
        />
        <Button type="submit" disabled={createMutation.isPending}>Save</Button>
      </form>
    </Card>
  )
}

function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgets()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="p-8">
      <PageHeader title="Budgets">
        <Button onClick={() => setShowForm(!showForm)}>+ New Budget</Button>
      </PageHeader>

      {showForm && <CreateBudgetForm onClose={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {budgets.map((b) => <BudgetCard key={b.id} budget={b} />)}
          {budgets.length === 0 && <p className="text-gray-500 text-sm">No budgets yet. Create one to start tracking.</p>}
        </div>
      )}
    </div>
  )
}
