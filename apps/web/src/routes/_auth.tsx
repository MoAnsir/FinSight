import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (user) throw redirect({ to: '/dashboard' })
  },
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">FinSight</h1>
          <p className="text-gray-500 mt-1">AI-Powered Financial Analytics</p>
        </div>
        <Outlet />
      </div>
    </div>
  ),
})
