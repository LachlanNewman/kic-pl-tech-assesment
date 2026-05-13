import { Customer } from '@prisma/client';
import { prisma } from '../db';
import logger from '../logger';
import { CustomerProfile } from '@/types';
import { errors, HttpError } from '../errors';

export async function getCustomerProfiles(customers: string[]): Promise<CustomerProfile[]> {
  try {
    logger.info('getCustomerProfiles: running');
    return prisma.customer.findMany({
      where: { id: { in: customers } },
      include: { events: true },
    });
  } catch (error) {
    logger.error({ error, customers }, 'getCustomerProfiles: failed to retrieve customer profiles');
    throw errors.failedToRetrieveCustomerProfiles(error);
  }
}
