import type { FastifyPluginAsync } from 'fastify'
import { parse } from 'csv-parse/sync'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { TransactionFilterSchema, CsvColumnMapSchema } from '@finsight/types'

export const transactionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const query = TransactionFilterSchema.parse(request.query)

    const account = await prisma.account.findFirst({ where: { userId } })
    if (!account) return { data: [], total: 0, page: query.page, pageSize: query.pageSize, totalPages: 0 }

    const where = {
      accountId: account.id,
      ...(query.search ? { description: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.dateFrom || query.dateTo
        ? { date: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } }
        : {}),
      ...(query.amountMin !== undefined || query.amountMax !== undefined
        ? { amount: { ...(query.amountMin !== undefined ? { gte: query.amountMin } : {}), ...(query.amountMax !== undefined ? { lte: query.amountMax } : {}) } }
        : {}),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.transaction.count({ where }),
    ])

    return { data: transactions, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) }
  })

  app.post('/import', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const data = await request.file()
    if (!data) return reply.code(400).send({ message: 'No file uploaded' })

    const rawColumnMap = (request.query as Record<string, string>)
    const columnMap = CsvColumnMapSchema.safeParse(rawColumnMap)
    if (!columnMap.success) return reply.code(400).send({ message: 'Invalid column mapping' })

    const buffer = await data.toBuffer()
    const records = parse(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[]

    let account = await prisma.account.findFirst({ where: { userId } })
    if (!account) account = await prisma.account.create({ data: { userId, name: 'Default Account' } })

    let imported = 0
    let skipped = 0
    for (const row of records) {
      const hash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')
      const amount = parseFloat(row[columnMap.data.amount] ?? '0')
      const dateStr = row[columnMap.data.date] ?? ''

      try {
        await prisma.transaction.create({
          data: {
            accountId: account.id,
            date: new Date(dateStr),
            description: row[columnMap.data.description] ?? '',
            amount,
            currency: columnMap.data.currency ? (row[columnMap.data.currency] ?? 'GBP') : 'GBP',
            hash,
          },
        })
        imported++
      } catch {
        skipped++
      }
    }

    return { imported, skipped, total: records.length }
  })

  app.patch('/:id', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown>

    const transaction = await prisma.transaction.findFirst({
      where: { id },
      include: { account: true },
    })

    if (!transaction || transaction.account.userId !== userId) {
      return reply.code(404).send({ message: 'Transaction not found' })
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(typeof body['category'] === 'string' ? { category: body['category'] } : {}),
        ...(typeof body['notes'] === 'string' ? { notes: body['notes'] } : {}),
        ...(typeof body['merchant'] === 'string' ? { merchant: body['merchant'] } : {}),
      },
    })

    return updated
  })
}
