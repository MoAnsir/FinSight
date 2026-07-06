import { prisma } from '../lib/prisma.js'
import { runAgenticLoop } from '../lib/ai.js'

export async function getInsights(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) return { categoryBreakdown: [], monthlyTotals: [] }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

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
}

export async function getForecast(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) return { summary: '' }

  const chunks: string[] = []
  await runAgenticLoop(
    'You are a financial forecasting assistant. Use the query_transactions and compute_category_totals tools to analyse the user\'s spending, then provide a concise 30-day cash flow forecast.',
    'Please forecast my cash flow for the next 30 days.',
    async (name, input) => {
      const { category, dateFrom, dateTo, limit = 90 } = input as Record<string, unknown>
      if (name === 'query_transactions') {
        return prisma.transaction.findMany({
          where: {
            accountId: account.id,
            ...(category ? { category: String(category) } : {}),
            ...(dateFrom ? { date: { gte: new Date(String(dateFrom)) } } : {}),
          },
          orderBy: { date: 'asc' },
          take: Math.min(Number(limit), 200),
          select: { date: true, amount: true, category: true },
        })
      }
      if (name === 'compute_category_totals') {
        const rows = await prisma.transaction.groupBy({
          by: ['category'],
          where: {
            accountId: account.id,
            amount: { lt: 0 },
            ...(dateFrom ? { date: { gte: new Date(String(dateFrom)) } } : {}),
            ...(dateTo ? { date: { lte: new Date(String(dateTo)) } } : {}),
          },
          _sum: { amount: true },
        })
        return rows.map((r) => ({ category: r.category, total: Math.abs(Number(r._sum.amount ?? 0)) }))
      }
      return []
    },
    (chunk) => { if (chunk.type === 'text') chunks.push(chunk.delta) },
  )

  return { summary: chunks.join('') }
}
