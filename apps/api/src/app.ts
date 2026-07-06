import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { authRoutes } from './routes/auth.js'
import { transactionRoutes } from './routes/transactions.js'
import { budgetRoutes } from './routes/budgets.js'
import { aiRoutes } from './routes/ai.js'
import { insightRoutes } from './routes/insights.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
  })

  await app.register(helmet, { global: true })
  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  })
  await app.register(cookie)
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret',
    cookie: { cookieName: 'finsight_token', signed: false },
  })

  app.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    features: { ai: !!process.env['ANTHROPIC_API_KEY'] },
  }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(transactionRoutes, { prefix: '/api/transactions' })
  await app.register(budgetRoutes, { prefix: '/api/budgets' })
  await app.register(aiRoutes, { prefix: '/api/ai' })
  await app.register(insightRoutes, { prefix: '/api' })

  return app
}
