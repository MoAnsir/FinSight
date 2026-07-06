import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Transaction, Paginated } from '@finsight/types'

interface TransactionFilter {
  page?: number
  search?: string
  category?: string
}

export function useTransactions(filter: TransactionFilter = {}) {
  return useQuery<Paginated<Transaction>>({
    queryKey: queryKeys.transactions(filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter.page) params.set('page', String(filter.page))
      if (filter.search) params.set('search', filter.search)
      if (filter.category) params.set('category', filter.category)
      return api.get(`/transactions?${params}`)
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; category?: string; notes?: string }) =>
      api.patch(`/transactions/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.transactions() }),
  })
}
