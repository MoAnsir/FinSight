import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFeatures } from '@/hooks/useFeatures'

export const Route = createFileRoute('/_app/forecast')({
  component: ForecastPage,
})

function ForecastPage() {
  const features = useFeatures()
  const { data, isLoading, refetch } = useQuery<{ summary: string }>({
    queryKey: ['forecast'],
    queryFn: () => api.get('/forecast'),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="p-8">
      {!features.ai && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          AI features are disabled — add <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to <code className="font-mono bg-amber-100 px-1 rounded">apps/api/.env</code> to enable them.
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash Flow Forecast</h1>
        <button onClick={() => refetch()} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Refresh
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">AI-Powered 30-Day Forecast</h2>
        {isLoading ? (
          <div className="text-gray-500 text-sm">Generating forecast… this may take a few seconds.</div>
        ) : (
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{data?.summary}</p>
        )}
      </div>
    </div>
  )
}
