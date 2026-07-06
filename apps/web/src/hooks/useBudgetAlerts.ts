import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'

export interface BudgetAlert {
  type: 'budget:threshold'
  category: string
  percentUsed: number
  spent: number
  limit: number
  severity: 'warning' | 'exceeded'
}

type AlertHandler = (alert: BudgetAlert) => void

export function useBudgetAlerts(onAlert: AlertHandler) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as BudgetAlert
      if (data.type === 'budget:threshold') {
        onAlert(data)
        // Refresh budgets so the UI reflects the new spend immediately
        qc.invalidateQueries({ queryKey: queryKeys.budgets() })
      }
    } catch {
      // ignore malformed messages
    }
  }, [onAlert, qc])

  useEffect(() => {
    if (!user) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.addEventListener('message', handleMessage)
    ws.addEventListener('error', () => {
      // Silent — WS is a progressive enhancement, not critical path
    })

    return () => {
      ws.removeEventListener('message', handleMessage)
      ws.close()
    }
  }, [user, handleMessage])
}
