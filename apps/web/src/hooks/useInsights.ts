import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

interface CategoryBreakdown {
  category: string | null
  _sum: { amount: string }
  _count: number
}

interface MonthlyTotal {
  month: string
  income: number
  expenses: number
}

export interface InsightsData {
  categoryBreakdown: CategoryBreakdown[]
  monthlyTotals: MonthlyTotal[]
}

export function useInsights() {
  return useQuery<InsightsData>({
    queryKey: queryKeys.insights(),
    queryFn: () => api.get('/insights'),
  })
}
