import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'
import { RegisterSchema, LoginSchema } from '@finsight/types'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = RegisterSchema.safeParse(request.body)
    if (!body.success) {
      const first = body.error.errors[0]
      return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: first?.message ?? 'Invalid input' })
    }

    const { email, password, name } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw AppError.conflict('Email already registered')

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash, name: name ?? null } })

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    reply.setCookie('finsight_token', token, COOKIE_OPTS)
    return reply.code(201).send({ user: { id: user.id, email: user.email, name: user.name } })
  })

  app.post('/login', async (request, reply) => {
    const body = LoginSchema.safeParse(request.body)
    if (!body.success) {
      const first = body.error.errors[0]
      return reply.code(400).send({ statusCode: 400, error: 'Bad Request', message: first?.message ?? 'Invalid input' })
    }

    const { email, password } = body.data
    const user = await prisma.user.findUnique({ where: { email } })
    // Always run bcrypt to prevent user-enumeration via timing side-channel
    const hashToCompare = user?.passwordHash ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000'
    const valid = await bcrypt.compare(password, hashToCompare)
    if (!user || !valid) throw AppError.unauthorized('Invalid credentials')

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    reply.setCookie('finsight_token', token, COOKIE_OPTS)
    return { user: { id: user.id, email: user.email, name: user.name } }
  })

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('finsight_token', { path: '/' })
    return reply.code(204).send()
  })

  app.get('/me', { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ message: 'Unauthorized' }) } }] }, async (request) => {
    const payload = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub }, select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } })
    return user
  })
}
