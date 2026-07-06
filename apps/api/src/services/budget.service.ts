import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'
import type { z } from 'zod'
import type { CreateBudgetSchema } from '@finsight/types'

type BudgetInput = z.infer<typeof CreateBudgetSchema>

export async function listBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { category: 'asc' } })

  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) return budgets.map((b) => ({ ...b, spent: 0, remaining: Number(b.limitAmount), percentUsed: 0 }))

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
    return { ...b, spent, remaining: limit - spent, percentUsed: Math.round((spent / limit) * 100) }
  })
}

export async function createBudget(userId: string, data: BudgetInput) {
  return prisma.budget.create({ data: { ...data, userId } })
}

export async function updateBudget(userId: string, id: string, data: BudgetInput) {
  const existing = await prisma.budget.findFirst({ where: { id, userId } })
  if (!existing) throw AppError.notFound('Budget not found')
  return prisma.budget.update({ where: { id }, data })
}

export async function deleteBudget(userId: string, id: string) {
  const existing = await prisma.budget.findFirst({ where: { id, userId } })
  if (!existing) throw AppError.notFound('Budget not found')
  await prisma.budget.delete({ where: { id } })
}
