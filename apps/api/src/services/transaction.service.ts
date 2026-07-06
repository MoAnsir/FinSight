import crypto from 'node:crypto'
import { parse } from 'csv-parse/sync'
import type { MultipartFile } from '@fastify/multipart'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'
import { pushToUser } from '../lib/connections.js'
import type { z } from 'zod'
import type { TransactionFilterSchema, CsvColumnMapSchema } from '@finsight/types'

type Filter = z.infer<typeof TransactionFilterSchema>
type ColumnMap = z.infer<typeof CsvColumnMapSchema>

async function getOrCreateAccount(userId: string) {
  let account = await prisma.account.findFirst({ where: { userId } })
  if (!account) account = await prisma.account.create({ data: { userId, name: 'Default Account' } })
  return account
}

export async function listTransactions(userId: string, filter: Filter) {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) return { data: [], total: 0, page: filter.page, pageSize: filter.pageSize, totalPages: 0 }

  const where = {
    accountId: account.id,
    ...(filter.search ? { description: { contains: filter.search, mode: 'insensitive' as const } } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.dateFrom || filter.dateTo
      ? { date: { ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}), ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}) } }
      : {}),
    ...(filter.amountMin !== undefined || filter.amountMax !== undefined
      ? { amount: { ...(filter.amountMin !== undefined ? { gte: filter.amountMin } : {}), ...(filter.amountMax !== undefined ? { lte: filter.amountMax } : {}) } }
      : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [filter.sortBy]: filter.sortDir },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  return { data: transactions, total, page: filter.page, pageSize: filter.pageSize, totalPages: Math.ceil(total / filter.pageSize) }
}

export async function importTransactions(userId: string, file: MultipartFile, columnMap: ColumnMap) {
  const account = await getOrCreateAccount(userId)
  const buffer = await file.toBuffer()
  const records = parse(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[]

  let imported = 0
  let skipped = 0

  for (const row of records) {
    const hash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')
    const amount = parseFloat(row[columnMap.amount] ?? '0')
    const dateStr = row[columnMap.date] ?? ''

    try {
      await prisma.transaction.create({
        data: {
          accountId: account.id,
          date: new Date(dateStr),
          description: row[columnMap.description] ?? '',
          amount,
          currency: columnMap.currency ? (row[columnMap.currency] ?? 'GBP') : 'GBP',
          hash,
        },
      })
      imported++
    } catch {
      skipped++
    }
  }

  await checkBudgetThresholds(userId, account.id)
  return { imported, skipped, total: records.length }
}

async function checkBudgetThresholds(userId: string, accountId: string) {
  const budgets = await prisma.budget.findMany({ where: { userId } })
  if (budgets.length === 0) return

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const spending = await prisma.transaction.groupBy({
    by: ['category'],
    where: { accountId, date: { gte: startOfMonth }, amount: { lt: 0 } },
    _sum: { amount: true },
  })

  const spendingMap = Object.fromEntries(
    spending.map((s) => [s.category, Math.abs(Number(s._sum.amount ?? 0))])
  )

  for (const budget of budgets) {
    const spent = spendingMap[budget.category] ?? 0
    const limit = Number(budget.limitAmount)
    const percentUsed = Math.round((spent / limit) * 100)

    // Push an alert at 80% and again at 100%
    if (percentUsed >= 100) {
      pushToUser(userId, {
        type: 'budget:threshold',
        category: budget.category,
        percentUsed,
        spent,
        limit,
        severity: 'exceeded',
      })
    } else if (percentUsed >= 80) {
      pushToUser(userId, {
        type: 'budget:threshold',
        category: budget.category,
        percentUsed,
        spent,
        limit,
        severity: 'warning',
      })
    }
  }
}

export async function updateTransaction(userId: string, id: string, patch: Record<string, unknown>) {
  const transaction = await prisma.transaction.findFirst({ where: { id }, include: { account: true } })
  if (!transaction || transaction.account.userId !== userId) throw AppError.notFound('Transaction not found')

  return prisma.transaction.update({
    where: { id },
    data: {
      ...(typeof patch['category'] === 'string' ? { category: patch['category'] } : {}),
      ...(typeof patch['notes'] === 'string' ? { notes: patch['notes'] } : {}),
      ...(typeof patch['merchant'] === 'string' ? { merchant: patch['merchant'] } : {}),
    },
  })
}
