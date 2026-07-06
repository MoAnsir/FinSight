import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { CreateBudgetSchema } from '@finsight/types'

export const budgetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { category: 'asc' } })

    const account = await prisma.account.findFirst({ where: { userId } })
    if (!account) return budgets.map((b) => ({ ...b, spent: 0, remaining: Number(b.limitAmount), percentUsed: 0 }))

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const spending = await prisma.transaction.groupBy({
      by: ['category'],
      where: { accountId: account.id, date: { gte: startOfMonth }, amount: { lt: 0 } },
      _sum: { amount: true },
    })

    const spendingMap = Object.fromEntries(spending.map((s) => [s.category, Math.abs(Number(s._sum.amount ?? 0))]))

    return budgets.map((b) => {
      const spent = spendingMap[b.category] ?? 0
      const limit = Number(b.limitAmount)
      return { ...b, spent, remaining: limit - spent, percentUsed: Math.round((spent / limit) * 100) }
    })
  })

  app.post('/', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const body = CreateBudgetSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ message: body.error.message })

    const budget = await prisma.budget.create({ data: { ...body.data, userId } })
    return reply.code(201).send(budget)
  })

  app.put('/:id', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { id } = request.params as { id: string }
    const body = CreateBudgetSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ message: body.error.message })

    const existing = await prisma.budget.findFirst({ where: { id, userId } })
    if (!existing) return reply.code(404).send({ message: 'Budget not found' })

    return prisma.budget.update({ where: { id }, data: body.data })
  })

  app.delete('/:id', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { id } = request.params as { id: string }

    const existing = await prisma.budget.findFirst({ where: { id, userId } })
    if (!existing) return reply.code(404).send({ message: 'Budget not found' })

    await prisma.budget.delete({ where: { id } })
    return reply.code(204).send()
  })
}
