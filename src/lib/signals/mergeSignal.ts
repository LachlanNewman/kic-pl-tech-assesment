import { TransactionClient } from '../db';
import { errors } from '../errors';
import logger from '../logger';

export async function mergeSignal(tx: TransactionClient, winnerId: string, loserId: string) {
  logger.info('mergeSignal: running');
  logger.debug({ winnerId, loserId }, 'mergeSignal: params');

  try {
    return tx.identitySignal.updateMany({
      where: { customerId: loserId },
      data: { customerId: winnerId },
    });
  } catch (error) {
    logger.error({ error }, 'mergeSignal: error merging signals');
    throw errors.failedToMergeSignals(error);
  }
}
