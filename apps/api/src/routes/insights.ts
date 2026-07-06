import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getRequestUser } from '../middleware/auth.js'
import { getInsights, getForecast } from '../services/insight.service.js'

export const insightRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/insights', async (request) => {
    return getInsights(getRequestUser(request))
  })

  app.get('/forecast', async (request) => {
    return getForecast(getRequestUser(request))
  })
}
