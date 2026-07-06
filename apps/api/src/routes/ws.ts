import type { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { registerConnection, removeConnection } from '../lib/connections.js'

export const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket: WebSocket, request) => {
    // Authenticate via JWT cookie — same mechanism as HTTP routes
    let userId: string | null = null

    try {
      const payload = app.jwt.verify<{ sub: string }>(
        request.cookies['finsight_token'] ?? ''
      )
      userId = payload.sub
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    registerConnection(userId, socket)
    app.log.info({ userId }, 'WebSocket connected')

    socket.on('close', () => {
      if (userId) {
        removeConnection(userId, socket)
        app.log.info({ userId }, 'WebSocket disconnected')
      }
    })

    socket.on('error', (err: Error) => {
      app.log.error({ userId, err }, 'WebSocket error')
    })
  })
}
