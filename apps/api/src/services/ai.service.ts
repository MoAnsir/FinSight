import { prisma } from '../lib/prisma.js'
import { runAgenticLoop } from '../lib/ai.js'
import { AppError } from '../lib/errors.js'
import type { SseChunk } from '../lib/ai.js'

const SYSTEM_PROMPT = `You are FinSight AI, a precise financial assistant. You have access to the user's real transaction data via tools.

ALWAYS use the provided tools to look up real data before answering — never guess or estimate.
When presenting numbers, format them as currency (£ prefix, 2 decimal places).
Be concise and actionable. If the user asks about spending, call query_transactions or compute_category_totals first.`

async function buildToolExecutor(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId } })

  return async (name: string, input: Record<string, unknown>) => {
    if (!account) return []

    switch (name) {
      case 'query_transactions': {
        const { category, dateFrom, dateTo, search, limit = 50 } = input as {
          category?: string; dateFrom?: string; dateTo?: string; search?: string; limit?: number
        }
        return prisma.transaction.findMany({
          where: {
            accountId: account.id,
            ...(category ? { category } : {}),
            ...(search ? { description: { contains: search, mode: 'insensitive' as const } } : {}),
            ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
          },
          orderBy: { date: 'desc' },
          take: Math.min(Number(limit), 200),
          select: { date: true, description: true, amount: true, category: true, merchant: true },
        })
      }

      case 'compute_category_totals': {
        const { dateFrom, dateTo } = input as { dateFrom?: string; dateTo?: string }
        const rows = await prisma.transaction.groupBy({
          by: ['category'],
          where: {
            accountId: account.id,
            amount: { lt: 0 },
            ...(dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
          },
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'asc' } },
        })
        return rows.map((r) => ({ category: r.category, total: Math.abs(Number(r._sum.amount ?? 0)), count: r._count }))
      }

      case 'find_recurring_payments': {
        const rows = await prisma.transaction.groupBy({
          by: ['description', 'amount'],
          where: { accountId: account.id, amount: { lt: 0 } },
          _count: true,
          having: { amount: { _count: { gt: 1 } } },
          orderBy: { _count: { amount: 'desc' } },
          take: 20,
        })
        return rows.map((r) => ({ description: r.description, amount: Math.abs(Number(r.amount)), occurrences: r._count }))
      }

      case 'get_budget_status': {
        const budgets = await prisma.budget.findMany({ where: { userId } })
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const spending = await prisma.transaction.groupBy({
          by: ['category'],
          where: { accountId: account.id, date: { gte: startOfMonth }, amount: { lt: 0 } },
          _sum: { amount: true },
        })
        const spendingMap = Object.fromEntries(spending.map((s) => [s.category, Math.abs(Number(s._sum.amount ?? 0))]))
        return budgets.map((b) => {
          const spent = spendingMap[b.category] ?? 0
          const limit = Number(b.limitAmount)
          return { category: b.category, limit, spent, remaining: limit - spent, percentUsed: Math.round((spent / limit) * 100) }
        })
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }
}

export async function chatStream(
  userId: string,
  message: string,
  conversationId: string | undefined,
  onChunk: (chunk: SseChunk) => void,
): Promise<{ conversationId: string }> {
  let conversation
  if (conversationId) {
    conversation = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
    if (!conversation) throw AppError.notFound('Conversation not found')
  } else {
    conversation = await prisma.aIConversation.create({ data: { userId, title: message.slice(0, 50) } })
  }

  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'user', content: message } })

  const executeToolCall = await buildToolExecutor(userId)
  const fullText = await runAgenticLoop(SYSTEM_PROMPT, message, executeToolCall, onChunk)

  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'assistant', content: fullText } })

  return { conversationId: conversation.id }
}

export async function getConversations(userId: string) {
  return prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}
