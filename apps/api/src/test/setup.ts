import { prisma } from '../lib/prisma.js'
import { afterAll, beforeEach } from 'vitest'

beforeEach(async () => {
  // Wipe in dependency order so FK constraints don't fail
  await prisma.aIMessage.deleteMany()
  await prisma.aIConversation.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
