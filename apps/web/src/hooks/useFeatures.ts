import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Health {
  status: string
  version: string
  features: { ai: boolean }
}

export function useFeatures() {
  const { data } = useQuery<Health>({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    staleTime: Infinity,
  })
  return data?.features ?? { ai: false }
}
