import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'dev@finsight.local' },
    update: {},
    create: {
      email: 'dev@finsight.local',
      name: 'Dev User',
      passwordHash,
      accounts: {
        create: { name: 'Main Account' },
      },
    },
  })

  console.log(`Seed complete. Dev account: ${user.email} / password123`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
