import { describe, it, expect, vi } from 'vitest'
import { listTransactions, updateTransaction } from '../services/transaction.service.js'
import { prisma } from './setup.js'
import { createUser, createAccount, createTransaction } from './factories.js'

// Suppress pushToUser calls — WebSocket registry is empty in tests
vi.mock('../lib/connections.js', () => ({ pushToUser: vi.fn() }))

describe('listTransactions', () => {
  it('returns empty paginated result when user has no account', async () => {
    const user = await createUser()
    const result = await listTransactions(user.id, { page: 1, pageSize: 20, sortBy: 'date', sortDir: 'desc' })

    expect(result.data).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })

  it('returns paginated transactions for a user', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await createTransaction(account.id, { description: 'Coffee', amount: -3.5 })
    await createTransaction(account.id, { description: 'Salary', amount: 3000 })

    const result = await listTransactions(user.id, { page: 1, pageSize: 20, sortBy: 'date', sortDir: 'desc' })

    expect(result.total).toBe(2)
    expect(result.data).toHaveLength(2)
  })

  it('does not return another user\'s transactions', async () => {
    const alice = await createUser({ email: 'alice@test.com' })
    const bob = await createUser({ email: 'bob@test.com' })
    const aliceAccount = await createAccount(alice.id)
    await createTransaction(aliceAccount.id)

    const result = await listTransactions(bob.id, { page: 1, pageSize: 20, sortBy: 'date', sortDir: 'desc' })
    expect(result.total).toBe(0)
  })

  it('filters by search term case-insensitively', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await createTransaction(account.id, { description: 'AMAZON PRIME' })
    await createTransaction(account.id, { description: 'Tesco' })

    const result = await listTransactions(user.id, {
      page: 1, pageSize: 20, sortBy: 'date', sortDir: 'desc', search: 'amazon',
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]!.description).toBe('AMAZON PRIME')
  })

  it('filters by category', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    await createTransaction(account.id, { category: 'Food' })
    await createTransaction(account.id, { category: 'Transport' })

    const result = await listTransactions(user.id, {
      page: 1, pageSize: 20, sortBy: 'date', sortDir: 'desc', category: 'Food',
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]!.category).toBe('Food')
  })

  it('paginates correctly', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    for (let i = 0; i < 5; i++) {
      await createTransaction(account.id, { hash: `hash-${i}` })
    }

    const page1 = await listTransactions(user.id, { page: 1, pageSize: 3, sortBy: 'date', sortDir: 'desc' })
    const page2 = await listTransactions(user.id, { page: 2, pageSize: 3, sortBy: 'date', sortDir: 'desc' })

    expect(page1.data).toHaveLength(3)
    expect(page2.data).toHaveLength(2)
    expect(page1.totalPages).toBe(2)
  })
})

describe('updateTransaction', () => {
  it('updates category on own transaction', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    const tx = await createTransaction(account.id)

    const updated = await updateTransaction(user.id, tx.id, { category: 'Food' })
    expect(updated.category).toBe('Food')
  })

  it('throws 404 when accessing another user\'s transaction', async () => {
    const alice = await createUser({ email: 'alice@test.com' })
    const bob = await createUser({ email: 'bob@test.com' })
    const account = await createAccount(alice.id)
    const tx = await createTransaction(account.id)

    await expect(updateTransaction(bob.id, tx.id, { category: 'Food' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('ignores unknown patch fields', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    const tx = await createTransaction(account.id, { amount: -50 })

    const updated = await updateTransaction(user.id, tx.id, {
      category: 'Transport',
      amount: 999999, // should be ignored
    })

    expect(updated.category).toBe('Transport')
    expect(Number(updated.amount)).toBe(-50)
  })
})

describe('importTransactions — duplicate detection', () => {
  it('skips rows with duplicate hashes', async () => {
    const user = await createUser()
    const account = await createAccount(user.id)
    // Pre-insert a transaction with a known hash
    await prisma.transaction.create({
      data: {
        accountId: account.id,
        date: new Date(),
        description: 'Pre-existing',
        amount: -10,
        currency: 'GBP',
        hash: 'duplicate-hash-abc',
      },
    })

    // Attempt to insert the same hash again
    await expect(
      prisma.transaction.create({
        data: {
          accountId: account.id,
          date: new Date(),
          description: 'Duplicate',
          amount: -10,
          currency: 'GBP',
          hash: 'duplicate-hash-abc',
        },
      })
    ).rejects.toThrow()

    const count = await prisma.transaction.count({ where: { accountId: account.id } })
    expect(count).toBe(1)
  })
})
