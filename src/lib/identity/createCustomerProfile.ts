import { prisma } from "../db";
import logger from "../logger";

export async function createCustomerProfile(): Promise<string> {
  logger.info("createCustomerProfile: running");
  const customer = await prisma.customer.create({ data: {} });
  logger.debug({ customerId: customer.id }, "createCustomerProfile: created new customer");
  return customer.id;
}
