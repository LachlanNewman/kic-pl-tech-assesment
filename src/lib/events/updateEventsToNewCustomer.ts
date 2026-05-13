import { TransactionClient } from '../db';
import { errors } from '../errors';
import logger from '../logger';

export async function updateEventsToNewCustomer(
  tx: TransactionClient,
  oldCustomerId: string,
  newCustomerId: string,
) {
  logger.info('updateEventToNewCustomer: running');
  try {
    await tx.event.updateMany({
      where: { customerId: oldCustomerId },
      data: { customerId: newCustomerId },
    });
  } catch (error) {
    logger.error({ error }, 'updateEventToNewCustomer: error updating events');
    throw errors.failedToUpdateEvents(error);
  }
}
