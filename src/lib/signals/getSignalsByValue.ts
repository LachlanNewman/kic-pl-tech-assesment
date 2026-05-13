import { IdentitySignal } from '@prisma/client';
import { prisma } from '../db';
import logger from '../logger';
import { errors } from '../errors';

export async function getSignalsByValue(value: string): Promise<IdentitySignal[]> {
  logger.info('getSignalsByValue: running');
  logger.debug({ value }, 'getSignalsByValue: params');

  try {
    return prisma.identitySignal.findMany({
      where: { value },
    });
  } catch (error) {
    logger.error({ error }, 'getSignalsByValue: error finding signals');
    throw errors.failedToFindSignals(error);
  }
}
