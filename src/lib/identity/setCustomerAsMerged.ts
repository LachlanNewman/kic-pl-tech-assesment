import { TransactionClient } from '../db';
import { errors } from '../errors';
import logger from '../logger';

export async function setCustomerAsMerged(tx: TransactionClient, mergeInto: string, loser: string) {
  try {
    logger.info('setCustomerAsMerged: running');
    await tx.customer.update({
      where: { id: loser },
      data: { mergedInto: mergeInto },
    });
  } catch (error) {
    logger.error(
      { error, mergeInto, loser },
      'setCustomerAsMerged: failed to mark customer as merged',
    );
    throw errors.failedToSetCustomerAsMerged(error);
  }
}
