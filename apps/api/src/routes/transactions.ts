import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getRequestUser } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { TransactionFilterSchema, CsvColumnMapSchema } from '@finsight/types'
import { listTransactions, importTransactions, updateTransaction } from '../services/transaction.service.js'

export const transactionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request) => {
    const userId = getRequestUser(request)
    const filter = TransactionFilterSchema.parse(request.query)
    return listTransactions(userId, filter)
  })

  app.post('/import', async (request, _reply) => {
    const userId = getRequestUser(request)
    const file = await request.file()
    if (!file) throw AppError.badRequest('No file uploaded')

    const columnMap = CsvColumnMapSchema.safeParse(request.query as Record<string, string>)
    if (!columnMap.success) throw AppError.badRequest('Invalid column mapping')

    return importTransactions(userId, file, columnMap.data)
  })

  app.patch('/:id', async (request) => {
    const userId = getRequestUser(request)
    const { id } = request.params as { id: string }
    return updateTransaction(userId, id, request.body as Record<string, unknown>)
  })
}
