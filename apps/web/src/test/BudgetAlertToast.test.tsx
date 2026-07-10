import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BudgetAlertToast } from '@/components/BudgetAlertToast'
import type { BudgetAlert } from '@/hooks/useBudgetAlerts'

// useBudgetAlerts manages a WebSocket — replace with a controllable stub
let capturedHandler: ((alert: BudgetAlert) => void) | null = null

vi.mock('@/hooks/useBudgetAlerts', () => ({
  useBudgetAlerts: (onAlert: (alert: BudgetAlert) => void) => {
    capturedHandler = onAlert
  },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function fireAlert(alert: Partial<BudgetAlert> = {}) {
  act(() => {
    capturedHandler?.({
      type: 'budget:threshold',
      category: 'Food',
      percentUsed: 85,
      spent: 425,
      limit: 500,
      severity: 'warning',
      ...alert,
    })
  })
}

beforeEach(() => {
  capturedHandler = null
  vi.useFakeTimers()
})

describe('BudgetAlertToast', () => {
  it('renders nothing when there are no alerts', () => {
    const { container } = render(<BudgetAlertToast />, { wrapper })
    expect(container.firstChild).toBeNull()
  })

  it('shows a warning toast with correct content', () => {
    render(<BudgetAlertToast />, { wrapper })
    fireAlert({ category: 'Food', percentUsed: 85, spent: 425, limit: 500, severity: 'warning' })

    expect(screen.getByText('Budget warning')).toBeInTheDocument()
    expect(screen.getByText(/Food — 85% used/)).toBeInTheDocument()
    expect(screen.getByText(/£425\.00 of £500\.00/)).toBeInTheDocument()
  })

  it('shows an exceeded toast with correct content', () => {
    render(<BudgetAlertToast />, { wrapper })
    fireAlert({ category: 'Transport', percentUsed: 112, spent: 560, limit: 500, severity: 'exceeded' })

    expect(screen.getByText('Budget exceeded')).toBeInTheDocument()
    expect(screen.getByText(/Transport — 112% used/)).toBeInTheDocument()
  })

  it('stacks multiple alerts', () => {
    render(<BudgetAlertToast />, { wrapper })
    fireAlert({ category: 'Food', severity: 'warning' })
    fireAlert({ category: 'Transport', severity: 'exceeded' })

    expect(screen.getByText(/Food/)).toBeInTheDocument()
    expect(screen.getByText(/Transport/)).toBeInTheDocument()
  })

  it('dismisses toast on × click', () => {
    render(<BudgetAlertToast />, { wrapper })
    fireAlert()

    expect(screen.getByText('Budget warning')).toBeInTheDocument()
    act(() => { fireEvent.click(screen.getByRole('button', { name: '×' })) })
    expect(screen.queryByText('Budget warning')).not.toBeInTheDocument()
  })

  it('auto-dismisses after 6 seconds', () => {
    render(<BudgetAlertToast />, { wrapper })
    fireAlert()

    expect(screen.getByText('Budget warning')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(6000) })
    expect(screen.queryByText('Budget warning')).not.toBeInTheDocument()
  })
})
