import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getRequestUser } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { AIChatRequestSchema } from '@finsight/types'
import { chat, getConversations } from '../services/ai.service.js'

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.post('/chat', async (request) => {
    const body = AIChatRequestSchema.safeParse(request.body)
    if (!body.success) throw AppError.badRequest(body.error.errors[0]?.message ?? 'Invalid input')
    return chat(getRequestUser(request), body.data.message, body.data.conversationId)
  })

  app.get('/conversations', async (request) => {
    return getConversations(getRequestUser(request))
  })
}
