import { TransactionClient } from "../db";
import logger from "../logger";

export async function createCustomerProfile(trx: TransactionClient): Promise<string> {
  logger.info("createCustomerProfile: running");
  const customer = await trx.customer.create({ data: {} });
  logger.debug({ customerId: customer.id }, "createCustomerProfile: created new customer");
  return customer.id;
}
