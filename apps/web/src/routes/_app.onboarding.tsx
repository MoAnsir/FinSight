import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'

export const Route = createFileRoute('/_app/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dateCol, setDateCol] = useState('date')
  const [descCol, setDescCol] = useState('description')
  const [amtCol, setAmtCol] = useState('amount')
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const form = new FormData()
      form.append('file', file)
      const params = new URLSearchParams({ date: dateCol, description: descCol, amount: amtCol })
      const res = await fetch(`/api/transactions/import?${params}`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) throw new Error('Import failed')
      return res.json() as Promise<{ imported: number; skipped: number }>
    },
    onSuccess: (data) => setResult(data),
  })

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to FinSight</h1>
      <p className="text-gray-500 mb-8">Upload your bank statement CSV to get started.</p>

      {!result ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <p className="text-sm text-gray-500">{file ? file.name : 'Click to select a CSV file'}</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[['Date column', dateCol, setDateCol], ['Description column', descCol, setDescCol], ['Amount column', amtCol, setAmtCol]].map(([label, value, setter]) => (
              <div key={label as string}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label as string}</label>
                <input value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>

          {mutation.error && <p className="text-sm text-red-500">{mutation.error.message}</p>}

          <button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {mutation.isPending ? 'Importing…' : 'Import Transactions'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-lg font-semibold text-gray-900">Import complete</h2>
          <p className="text-sm text-gray-500 mt-1">{result.imported} imported · {result.skipped} skipped (duplicates)</p>
          <button onClick={() => navigate({ to: '/dashboard' })}
            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
