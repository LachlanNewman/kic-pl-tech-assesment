import { prisma } from "./db";
import logger from "./logger";

export async function getCustomerProfile(identitySignalValue: string) {
  logger.info("getCustomerProfile: running");
  logger.debug({ identitySignalValue }, "getCustomerProfile: params");

  const identitySignals = await prisma.identitySignal.findMany({
    where: { value: identitySignalValue },
    select: { customerId: true }
  });

  return prisma.customer.findMany({
    where: { id: { in: identitySignals.map(is => is.customerId) } },
    include: { events: true }
  });
}