import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

export async function createUser(overrides: { email?: string; password?: string; name?: string } = {}) {
  const passwordHash = await bcrypt.hash(overrides.password ?? 'password123', 1)
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${crypto.randomUUID()}@test.com`,
      passwordHash,
      name: overrides.name ?? 'Test User',
    },
  })
}

export async function createAccount(userId: string) {
  return prisma.account.create({ data: { userId, name: 'Default Account' } })
}

export async function createTransaction(
  accountId: string,
  overrides: {
    amount?: number
    category?: string
    date?: Date
    description?: string
    hash?: string
  } = {}
) {
  const hash = overrides.hash ?? `hash-${Math.random()}`
  return prisma.transaction.create({
    data: {
      accountId,
      date: overrides.date ?? new Date(),
      description: overrides.description ?? 'Test transaction',
      amount: overrides.amount ?? -10,
      currency: 'GBP',
      category: overrides.category ?? null,
      hash,
    },
  })
}

export async function createBudget(userId: string, overrides: { category?: string; limitAmount?: number } = {}) {
  return prisma.budget.create({
    data: {
      userId,
      category: overrides.category ?? 'Food',
      limitAmount: overrides.limitAmount ?? 500,
      period: 'monthly',
    },
  })
}
