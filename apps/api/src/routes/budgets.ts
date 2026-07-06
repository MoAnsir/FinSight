import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getRequestUser } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { CreateBudgetSchema } from '@finsight/types'
import { listBudgets, createBudget, updateBudget, deleteBudget } from '../services/budget.service.js'

export const budgetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request) => {
    return listBudgets(getRequestUser(request))
  })

  app.post('/', async (request, reply) => {
    const body = CreateBudgetSchema.safeParse(request.body)
    if (!body.success) throw AppError.badRequest(body.error.errors[0]?.message ?? 'Invalid input')
    const budget = await createBudget(getRequestUser(request), body.data)
    return reply.code(201).send(budget)
  })

  app.put('/:id', async (request) => {
    const body = CreateBudgetSchema.safeParse(request.body)
    if (!body.success) throw AppError.badRequest(body.error.errors[0]?.message ?? 'Invalid input')
    return updateBudget(getRequestUser(request), (request.params as { id: string }).id, body.data)
  })

  app.delete('/:id', async (request, reply) => {
    await deleteBudget(getRequestUser(request), (request.params as { id: string }).id)
    return reply.code(204).send()
  })
}
