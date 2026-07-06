import type { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../lib/errors.js'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    // Attach userId to all subsequent log lines for this request
    const payload = request.user as { sub?: string }
    if (payload?.sub) request.log = request.log.child({ userId: payload.sub })
  } catch {
    return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing token' })
  }
}

export function getRequestUser(request: FastifyRequest): string {
  const payload = request.user as { sub?: string }
  if (!payload?.sub) throw AppError.unauthorized('Missing user context')
  return payload.sub
}
