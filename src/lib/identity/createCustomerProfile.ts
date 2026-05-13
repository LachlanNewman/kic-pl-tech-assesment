import { TransactionClient } from '../db';
import { errors } from '../errors';
import logger from '../logger';

export async function createCustomerProfile(trx: TransactionClient): Promise<string> {
  try {
    logger.info('createCustomerProfile: running');
    const customer = await trx.customer.create({ data: {} });
    logger.debug({ customerId: customer.id }, 'createCustomerProfile: created new customer');
    return customer.id;
  } catch (error) {
    logger.error({ error }, 'createCustomerProfile: failed to create customer profile');
    throw errors.failedToCreateCustomerProfile(error);
  }
}
