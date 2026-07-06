import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { chatWithContext } from '../lib/ai.js'

export const insightRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/insights', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const account = await prisma.account.findFirst({ where: { userId } })
    if (!account) return { categoryBreakdown: [], monthlyTotals: [], topMerchants: [] }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [categoryBreakdown, monthlyTotals] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['category'],
        where: { accountId: account.id, date: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.$queryRaw<{ month: string; income: number; expenses: number }[]>`
        SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
        FROM "Transaction"
        WHERE "accountId" = ${account.id}
          AND date >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `,
    ])

    return { categoryBreakdown, monthlyTotals }
  })

  app.get('/forecast', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const account = await prisma.account.findFirst({ where: { userId } })
    if (!account) return { forecast: [], summary: '' }

    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id, date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: 'asc' },
    })

    const contextData = JSON.stringify(
      transactions.map((t) => ({ date: t.date, amount: Number(t.amount), category: t.category })),
    )

    const summary = await chatWithContext(
      'You are a financial forecasting assistant. Analyse the transaction history and provide a 30-day cash flow forecast with key insights.',
      'Please forecast my cash flow for the next 30 days based on my transaction history.',
      contextData,
    )

    return { summary }
  })
}
