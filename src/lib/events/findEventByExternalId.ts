import { prisma } from '../db';
import { errors } from '../errors';
import logger from '../logger';

export async function findEventByExternalId(externalId: string): Promise<string | null> {
  logger.info('findEventByExternalId: running');
  logger.debug({ externalId }, 'findEventByExternalId: params');

  try {
    const event = await prisma.event.findUnique({
      where: { externalId },
      select: { customerId: true },
    });

    const customerId = event?.customerId ?? null;
    return customerId;
  } catch (error) {
    logger.error({ error }, 'findEventByExternalId: error finding event');
    throw errors.failedToFindEvent(error);
  }
}
