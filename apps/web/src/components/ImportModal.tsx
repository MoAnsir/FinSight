import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

interface ImportResult {
  imported: number
  skipped: number
  total: number
}

export function ImportModal({ onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dateCol, setDateCol] = useState('Date')
  const [descCol, setDescCol] = useState('Description')
  const [amtCol, setAmtCol] = useState('Amount')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('finsight_token')
      const params = new URLSearchParams({ date: dateCol, description: descCol, amount: amtCol })
      const res = await fetch(`/api/transactions/import?${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message ?? 'Import failed')
      }
      return res.json() as Promise<ImportResult>
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) setFile(dropped)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Import CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!result ? (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-5',
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
                file && 'border-green-400 bg-green-50',
              )}
            >
              <p className="text-2xl mb-2">{file ? '✅' : '📂'}</p>
              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Drop CSV here or click to browse'}
              </p>
              {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Column names in your CSV</p>
              <div className="grid grid-cols-3 gap-2">
                {([['Date', dateCol, setDateCol], ['Description', descCol, setDescCol], ['Amount', amtCol, setAmtCol]] as const).map(([label, value, setter]) => (
                  <div key={label}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      value={value}
                      onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Match exactly to the header row in your CSV. Case-sensitive.
              </p>
            </div>

            {mutation.error && <p className="text-sm text-red-500 mb-3">{mutation.error.message}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!file || mutation.isPending}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-900">Import complete</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xl font-bold text-green-600">{result.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-xs text-gray-500">Skipped</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xl font-bold text-indigo-600">{result.total}</p>
                <p className="text-xs text-gray-500">Total rows</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Skipped = duplicates already in the database</p>
            <button onClick={onClose} className="mt-5 w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
