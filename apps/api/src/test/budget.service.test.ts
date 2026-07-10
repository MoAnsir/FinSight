import { describe, it, expect } from 'vitest'
import { listBudgets, createBudget, updateBudget, deleteBudget } from '../services/budget.service.js'
import { createUser, createAccount, createTransaction, createBudget as factoryCreateBudget } from './factories.js'
import { AppError } from '../lib/errors.js'


describe('createBudget', () => {
  it('creates a budget for a user', async () => {
    const user = await createUser()
    const budget = await createBudget(user.id, { category: 'Food', limitAmount: 300, period: 'monthly' })

    expect(budget.userId).toBe(user.id)
    expect(budget.category).toBe('Food')
    expect(Number(budget.limitAmount)).toBe(300)
  })

  it('enforces unique (userId, category, period) constraint', async () => {
    const user = await createUser()
    await createBudget(user.id, { category: 'Food', limitAmount: 300, period: 'monthly' })

    await expect(
      createBudget(user.id, { category: 'Food', limitAmount: 400, period: 'monthly' })
    ).rejects.toThrow()
  })
})

describe('listBudgets', () => {
  it('returns budgets with correct spend calculation', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await factoryCreateBudget(user.id, { category: 'Food', limitAmount: 500 })

    // Spend £200 on food this month
    const thisMonth = new Date()
    await createTransaction(account.id, { category: 'Food', amount: -100, date: thisMonth })
    await createTransaction(account.id, { category: 'Food', amount: -100, date: thisMonth })

    const budgets = await listBudgets(user.id)
    const foodBudget = budgets.find((b) => b.category === 'Food')

    expect(foodBudget?.spent).toBe(200)
    expect(foodBudget?.remaining).toBe(300)
    expect(foodBudget?.percentUsed).toBe(40)
  })

  it('excludes transactions from previous months', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await factoryCreateBudget(user.id, { category: 'Food', limitAmount: 500 })

    // Spending last month — should NOT count
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    await createTransaction(account.id, { category: 'Food', amount: -200, date: lastMonth })

    const budgets = await listBudgets(user.id)
    const foodBudget = budgets.find((b) => b.category === 'Food')

    expect(foodBudget?.spent).toBe(0)
    expect(foodBudget?.percentUsed).toBe(0)
  })

  it('excludes positive amounts (income) from spend', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await factoryCreateBudget(user.id, { category: 'Food', limitAmount: 500 })

    await createTransaction(account.id, { category: 'Food', amount: 200 }) // refund — positive

    const budgets = await listBudgets(user.id)
    expect(budgets.find((b) => b.category === 'Food')?.spent).toBe(0)
  })
})

describe('updateBudget', () => {
  it('updates limit amount', async () => {
    const user = await createUser()
    const budget = await factoryCreateBudget(user.id, { limitAmount: 300 })

    const updated = await updateBudget(user.id, budget.id, { category: budget.category, limitAmount: 600, period: 'monthly' })
    expect(Number(updated.limitAmount)).toBe(600)
  })

  it('throws 404 for another user\'s budget', async () => {
    const alice = await createUser({ email: 'alice@test.com' })
    const bob = await createUser({ email: 'bob@test.com' })
    const budget = await factoryCreateBudget(alice.id)

    await expect(
      updateBudget(bob.id, budget.id, { category: 'Food', limitAmount: 999, period: 'monthly' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('deleteBudget', () => {
  it('deletes own budget', async () => {
    const user = await createUser()
    const budget = await factoryCreateBudget(user.id)

    await deleteBudget(user.id, budget.id)
    const remaining = await listBudgets(user.id)
    expect(remaining).toHaveLength(0)
  })

  it('throws 404 when budget does not belong to user', async () => {
    const alice = await createUser({ email: 'alice@test.com' })
    const bob = await createUser({ email: 'bob@test.com' })
    const budget = await factoryCreateBudget(alice.id)

    await expect(deleteBudget(bob.id, budget.id)).rejects.toBeInstanceOf(AppError)
  })
})
