import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { BudgetProgress } from '@finsight/types'

export function useBudgets() {
  return useQuery<BudgetProgress[]>({
    queryKey: queryKeys.budgets(),
    queryFn: () => api.get('/budgets'),
  })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { category: string; limitAmount: number; period: string }) =>
      api.post('/budgets', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets() }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets() }),
  })
}
