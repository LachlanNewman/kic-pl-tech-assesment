import { Event } from '@prisma/client';
import { TransactionClient } from '../db';
import logger from '../logger';
import { errors } from '../errors';

export async function findEventsForCustomer(
  tx: TransactionClient,
  customerId: string,
): Promise<Event[]> {
  logger.info('findEventsForCustomer: running');
  logger.debug({ customerId }, 'findEventsForCustomer: params');

  try {
    const events = await tx.event.findMany({
      where: { customerId },
    });
    logger.debug({ eventCount: events.length }, 'findEventsForCustomer: returning events');
    return events;
  } catch (error) {
    logger.error({ error }, 'findEventsForCustomer: error finding events');
    throw errors.failedToFindEvents(error);
  }
}
