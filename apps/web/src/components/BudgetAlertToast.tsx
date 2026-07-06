import { useState, useCallback } from 'react'
import { useBudgetAlerts, type BudgetAlert } from '@/hooks/useBudgetAlerts'
import { cn } from '@/lib/utils'

interface Toast extends BudgetAlert {
  id: number
}

let nextId = 0

export function BudgetAlertToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const onAlert = useCallback((alert: BudgetAlert) => {
    const id = nextId++
    setToasts((prev) => [...prev, { ...alert, id }])
    setTimeout(() => dismiss(id), 6000)
  }, [dismiss])

  useBudgetAlerts(onAlert)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm border animate-in slide-in-from-bottom-2',
            toast.severity === 'exceeded'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900',
          )}
        >
          <span className="text-lg leading-none mt-0.5">
            {toast.severity === 'exceeded' ? '🚨' : '⚠️'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {toast.severity === 'exceeded' ? 'Budget exceeded' : 'Budget warning'}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              {toast.category} — {toast.percentUsed}% used
              (£{toast.spent.toFixed(2)} of £{toast.limit.toFixed(2)})
            </p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-current opacity-50 hover:opacity-100 leading-none text-base"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
