import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getRequestUser } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { AIChatRequestSchema } from '@finsight/types'
import { chatStream, getConversations } from '../services/ai.service.js'

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // SSE streaming chat endpoint
  app.post('/chat', async (request, reply) => {
    const body = AIChatRequestSchema.safeParse(request.body)
    if (!body.success) throw AppError.badRequest(body.error.errors[0]?.message ?? 'Invalid input')

    const userId = getRequestUser(request)

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      const { conversationId } = await chatStream(
        userId,
        body.data.message,
        body.data.conversationId,
        send,
      )
      // Ensure the done event includes conversationId
      send({ type: 'done', conversationId })
    } catch (err) {
      send({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      reply.raw.end()
    }
  })

  app.get('/conversations', async (request) => {
    return getConversations(getRequestUser(request))
  })
}
