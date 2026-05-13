import { beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

beforeEach(async () => {
  console.log("Clearing database before test");
  await prisma.mergeEvent.deleteMany()
  await prisma.mergeIdentitySignal.deleteMany()
  await prisma.mergeLog.deleteMany()
  await prisma.event.deleteMany()
  await prisma.identitySignal.deleteMany()
  await prisma.customer.updateMany({ data: { mergedInto: null } })
  await prisma.customer.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
