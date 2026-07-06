import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { chatWithContext } from '../lib/ai.js'
import { AIChatRequestSchema } from '@finsight/types'

const SYSTEM_PROMPT = `You are FinSight AI, a helpful financial assistant. You have access to the user's transaction data.
Provide clear, actionable insights. When referencing specific transactions, cite them clearly.
Be concise and accurate. Format monetary amounts with currency symbols.
If asked about spending patterns, budgets, or forecasts, use the provided financial data.`

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.post('/chat', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const body = AIChatRequestSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ message: body.error.message })

    const { message, conversationId } = body.data

    let conversation
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
      if (!conversation) return reply.code(404).send({ message: 'Conversation not found' })
    } else {
      conversation = await prisma.aIConversation.create({ data: { userId, title: message.slice(0, 50) } })
    }

    const account = await prisma.account.findFirst({ where: { userId } })
    let contextData: string | undefined

    if (account) {
      const recentTransactions = await prisma.transaction.findMany({
        where: { accountId: account.id },
        orderBy: { date: 'desc' },
        take: 100,
      })

      contextData = JSON.stringify(
        recentTransactions.map((t) => ({
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          category: t.category,
        })),
      )
    }

    await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'user', content: message } })

    const aiResponse = await chatWithContext(SYSTEM_PROMPT, message, contextData)

    const assistantMessage = await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: 'assistant', content: aiResponse },
    })

    return { conversationId: conversation.id, message: assistantMessage }
  })

  app.get('/conversations', async (request) => {
    const userId = (request.user as { sub: string }).sub
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
  })
}
