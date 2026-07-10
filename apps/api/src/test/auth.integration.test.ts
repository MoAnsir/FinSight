import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/auth/register', () => {
  it('creates a user and sets httpOnly cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'alice@test.com', password: 'password123', name: 'Alice' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.email).toBe('alice@test.com')
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(res.headers['set-cookie']).toMatch(/finsight_token=/)
    expect(res.headers['set-cookie']).toMatch(/HttpOnly/)
  })

  it('rejects duplicate email with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dup@test.com', password: 'password123' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dup@test.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('rejects weak passwords with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@test.com', password: '123' },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('returns cookie on valid credentials', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'login@test.com', password: 'password123' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toMatch(/finsight_token=/)
  })

  it('rejects wrong password with 401', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'wrongpw@test.com', password: 'password123' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'wrongpw@test.com', password: 'notthepassword' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns the same 401 response for unknown email vs wrong password (no user enumeration)', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'real@test.com', password: 'password123' },
    })

    const knownUser = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'real@test.com', password: 'wrongpassword' },
    })
    const unknownUser = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'nobody@test.com', password: 'wrongpassword' },
    })

    // Both must return identical status and message — no user enumeration signal
    expect(knownUser.statusCode).toBe(401)
    expect(unknownUser.statusCode).toBe(401)
    expect(knownUser.json().message).toBe(unknownUser.json().message)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' })

    expect(res.statusCode).toBe(204)
    expect(res.headers['set-cookie']).toMatch(/finsight_token=;/)
  })
})
