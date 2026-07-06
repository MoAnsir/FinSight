import { prisma } from '../lib/prisma.js'
import { chatWithContext } from '../lib/ai.js'
import { AppError } from '../lib/errors.js'

const SYSTEM_PROMPT = `You are FinSight AI, a helpful financial assistant. You have access to the user's transaction data.
Provide clear, actionable insights. When referencing specific transactions, cite them clearly.
Be concise and accurate. Format monetary amounts with currency symbols.
If asked about spending patterns, budgets, or forecasts, use the provided financial data.`

export async function chat(userId: string, message: string, conversationId?: string) {
  let conversation
  if (conversationId) {
    conversation = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
    if (!conversation) throw AppError.notFound('Conversation not found')
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
      recentTransactions.map((t) => ({ date: t.date, description: t.description, amount: Number(t.amount), category: t.category })),
    )
  }

  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: 'user', content: message } })

  const aiResponse = await chatWithContext(SYSTEM_PROMPT, message, contextData)

  const assistantMessage = await prisma.aIMessage.create({
    data: { conversationId: conversation.id, role: 'assistant', content: aiResponse },
  })

  return { conversationId: conversation.id, message: assistantMessage }
}

export async function getConversations(userId: string) {
  return prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}
