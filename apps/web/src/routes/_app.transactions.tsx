import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction, Paginated } from '@finsight/types'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  search: z.string().optional(),
  category: z.string().optional(),
})

export const Route = createFileRoute('/_app/transactions')({
  validateSearch: searchSchema,
  component: TransactionsPage,
})

function TransactionsPage() {
  const search = useSearch({ from: '/_app/transactions' })
  const navigate = useNavigate({ from: '/transactions' })
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')

  const { data, isLoading } = useQuery<Paginated<Transaction>>({
    queryKey: ['transactions', search],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(search.page))
      if (search.search) params.set('search', search.search)
      if (search.category) params.set('category', search.category)
      return api.get(`/transactions?${params}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      api.patch(`/transactions/${id}`, { category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setEditingId(null)
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total</span>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          type="search"
          placeholder="Search transactions…"
          defaultValue={search.search}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }) })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.data ?? []).map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-900">{tx.description}</td>
                  <td className="px-4 py-3">
                    {editingId === tx.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-2 py-1 border border-indigo-400 rounded text-xs focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => updateMutation.mutate({ id: tx.id, category: editCategory })}
                          className="text-xs text-indigo-600 font-medium">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(tx.id); setEditCategory(tx.category ?? '') }}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {tx.category ?? 'Uncategorised'}
                      </button>
                    )}
                  </td>
                  <td className={cn('px-4 py-3 text-right font-medium', Number(tx.amount) < 0 ? 'text-red-500' : 'text-green-600')}>
                    {formatCurrency(Number(tx.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={search.page <= 1}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page - 1 }) })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {search.page} of {data.totalPages}</span>
          <button
            disabled={search.page >= data.totalPages}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
