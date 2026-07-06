import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

const MERCHANTS: Record<string, { category: string; amounts: [number, number] }> = {
  'Tesco Stores': { category: 'Food & Drink', amounts: [15, 85] },
  'Sainsburys': { category: 'Food & Drink', amounts: [20, 120] },
  'Deliveroo': { category: 'Food & Drink', amounts: [18, 45] },
  'Pret A Manger': { category: 'Food & Drink', amounts: [5, 12] },
  'Costa Coffee': { category: 'Food & Drink', amounts: [3, 8] },
  'TfL Travel': { category: 'Transport', amounts: [3, 15] },
  'Uber': { category: 'Transport', amounts: [8, 35] },
  'Shell Petrol': { category: 'Transport', amounts: [40, 90] },
  'Amazon': { category: 'Shopping', amounts: [12, 200] },
  'ASOS': { category: 'Shopping', amounts: [25, 120] },
  'Netflix': { category: 'Entertainment', amounts: [17, 17] },
  'Spotify': { category: 'Entertainment', amounts: [11, 11] },
  'Vue Cinema': { category: 'Entertainment', amounts: [12, 24] },
  'Pure Gym': { category: 'Health', amounts: [25, 25] },
  'Boots Pharmacy': { category: 'Health', amounts: [5, 40] },
  'British Gas': { category: 'Utilities', amounts: [60, 120] },
  'Thames Water': { category: 'Utilities', amounts: [35, 35] },
  'EE Mobile': { category: 'Utilities', amounts: [30, 30] },
  'Airbnb': { category: 'Travel', amounts: [80, 400] },
  'Ryanair': { category: 'Travel', amounts: [30, 200] },
  'Rent Payment': { category: 'Housing', amounts: [1200, 1200] },
}

function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'dev@finsight.local' } })
  if (!user) throw new Error('Run pnpm db:seed first to create the dev user')

  let account = await prisma.account.findFirst({ where: { userId: user.id } })
  if (!account) {
    account = await prisma.account.create({ data: { userId: user.id, name: 'Main Account' } })
  }

  // clear existing transactions for clean re-seeding
  await prisma.transaction.deleteMany({ where: { accountId: account.id } })

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  const transactions: Parameters<typeof prisma.transaction.create>[0]['data'][] = []

  // Monthly salary
  for (let m = 0; m < 6; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 28)
    transactions.push({
      accountId: account.id,
      date: d,
      description: 'SALARY PAYMENT - EMPLOYER LTD',
      amount: 3800,
      currency: 'GBP',
      category: 'Income',
      merchant: 'Employer Ltd',
      hash: crypto.randomUUID(),
    })
  }

  // Monthly rent — 1st of each month
  for (let m = 0; m < 6; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    transactions.push({
      accountId: account.id,
      date: d,
      description: 'RENT PAYMENT',
      amount: -1200,
      currency: 'GBP',
      category: 'Housing',
      hash: crypto.randomUUID(),
    })
  }

  // Recurring subscriptions
  const subscriptions = [
    { name: 'Netflix', amount: -17.99, category: 'Entertainment', day: 5 },
    { name: 'Spotify', amount: -11.99, category: 'Entertainment', day: 12 },
    { name: 'Pure Gym', amount: -25, category: 'Health', day: 3 },
    { name: 'EE Mobile', amount: -30, category: 'Utilities', day: 15 },
    { name: 'Thames Water', amount: -35, category: 'Utilities', day: 20 },
  ]
  for (const sub of subscriptions) {
    for (let m = 0; m < 6; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, sub.day)
      transactions.push({
        accountId: account.id,
        date: d,
        description: sub.name.toUpperCase(),
        amount: sub.amount,
        currency: 'GBP',
        category: sub.category,
        merchant: sub.name,
        hash: crypto.randomUUID(),
      })
    }
  }

  // Random day-to-day spending
  const merchants = Object.entries(MERCHANTS).filter(([name]) =>
    !['Rent Payment', 'Netflix', 'Spotify', 'Pure Gym', 'EE Mobile', 'Thames Water'].includes(name)
  )

  for (let i = 0; i < 180; i++) {
    const [name, meta] = merchants[Math.floor(Math.random() * merchants.length)]!
    const date = randomDate(sixMonthsAgo, now)
    const amount = -randomBetween(meta.amounts[0], meta.amounts[1])
    transactions.push({
      accountId: account.id,
      date,
      description: name.toUpperCase(),
      amount,
      currency: 'GBP',
      category: meta.category,
      merchant: name,
      hash: crypto.randomUUID(),
    })
  }

  await prisma.transaction.createMany({ data: transactions })
  console.log(`Seeded ${transactions.length} transactions for ${user.email}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
