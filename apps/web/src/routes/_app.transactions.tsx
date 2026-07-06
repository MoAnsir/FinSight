import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { useTransactions, useUpdateTransaction } from '@/hooks/useTransactions'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Button, Badge, PageHeader } from '@/components/ui'
import { ImportModal } from '@/components/ImportModal'
import type { Transaction } from '@finsight/types'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  search: z.string().optional(),
  category: z.string().optional(),
})

export const Route = createFileRoute('/_app/transactions')({
  validateSearch: searchSchema,
  component: TransactionsPage,
})

function CategoryEditor({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const [value, setValue] = useState(transaction.category ?? '')
  const updateMutation = useUpdateTransaction()

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="px-2 py-1 border border-indigo-400 rounded text-xs focus:outline-none"
        autoFocus
      />
      <button
        onClick={() => updateMutation.mutate({ id: transaction.id, category: value }, { onSuccess: onClose })}
        className="text-xs text-indigo-600 font-medium"
      >
        Save
      </button>
      <button onClick={onClose} className="text-xs text-gray-400">Cancel</button>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [editing, setEditing] = useState(false)

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-500">{formatDate(transaction.date)}</td>
      <td className="px-4 py-3 text-gray-900">{transaction.description}</td>
      <td className="px-4 py-3">
        {editing ? (
          <CategoryEditor transaction={transaction} onClose={() => setEditing(false)} />
        ) : (
          <Badge onClick={() => setEditing(true)}>
            {transaction.category ?? 'Uncategorised'}
          </Badge>
        )}
      </td>
      <td className={cn('px-4 py-3 text-right font-medium', Number(transaction.amount) < 0 ? 'text-red-500' : 'text-green-600')}>
        {formatCurrency(Number(transaction.amount))}
      </td>
    </tr>
  )
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          {transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const navigate = useNavigate({ from: '/transactions' })
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4">
      <Button variant="secondary" size="sm" disabled={page <= 1}
        onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page - 1 }) })}>
        Previous
      </Button>
      <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages}
        onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}>
        Next
      </Button>
    </div>
  )
}

function TransactionsPage() {
  const search = useSearch({ from: '/_app/transactions' })
  const navigate = useNavigate({ from: '/transactions' })
  const [showImport, setShowImport] = useState(false)
  const { data, isLoading } = useTransactions({ page: search.page, search: search.search, category: search.category })

  return (
    <div className="p-8">
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <PageHeader title="Transactions">
        <span className="text-sm text-gray-500">{data?.total ?? 0} total</span>
        <Button onClick={() => setShowImport(true)}>Import CSV</Button>
      </PageHeader>

      <div className="flex gap-3 mb-5">
        <input
          type="search"
          placeholder="Search transactions…"
          defaultValue={search.search}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }) })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Loading…</div>
      ) : (
        <TransactionTable transactions={data?.data ?? []} />
      )}

      <Pagination page={search.page} totalPages={data?.totalPages ?? 0} />
    </div>
  )
}
