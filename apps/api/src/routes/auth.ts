import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { RegisterSchema, LoginSchema } from '@finsight/types'

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = RegisterSchema.safeParse(request.body)
    if (!body.success) {
      const first = body.error.errors[0]
      return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: first?.message ?? 'Invalid input' })
    }

    const { email, password, name } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.code(409).send({ statusCode: 409, error: 'Conflict', message: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash, name: name ?? null } })

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    return reply.code(201).send({ token, user: { id: user.id, email: user.email, name: user.name } })
  })

  app.post('/login', async (request, reply) => {
    const body = LoginSchema.safeParse(request.body)
    if (!body.success) {
      const first = body.error.errors[0]
      return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: first?.message ?? 'Invalid input' })
    }

    const { email, password } = body.data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' })

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  })

  app.get('/me', { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ message: 'Unauthorized' }) } }] }, async (request) => {
    const payload = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub }, select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } })
    return user
  })
}
