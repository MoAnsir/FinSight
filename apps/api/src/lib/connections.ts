import type { WebSocket } from '@fastify/websocket'

// In-memory registry of userId → set of open WebSocket connections.
// Sufficient for a single-process server. For multi-process / clustered
// deployments this would need to be replaced with a Redis pub/sub broadcast.
const registry = new Map<string, Set<WebSocket>>()

export function registerConnection(userId: string, socket: WebSocket) {
  if (!registry.has(userId)) registry.set(userId, new Set())
  registry.get(userId)!.add(socket)
}

export function removeConnection(userId: string, socket: WebSocket) {
  registry.get(userId)?.delete(socket)
  if (registry.get(userId)?.size === 0) registry.delete(userId)
}

export function pushToUser(userId: string, event: object) {
  const sockets = registry.get(userId)
  if (!sockets) return
  const payload = JSON.stringify(event)
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(payload)
  }
}
