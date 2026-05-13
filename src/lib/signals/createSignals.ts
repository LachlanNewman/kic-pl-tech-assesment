import { TransactionClient } from '../db';
import { Signal } from '@/types';
import logger from '../logger';
import { getSignalConfidence } from './signalConfig';
import { errors } from '../errors';

export async function createSignals(
  tx: TransactionClient,
  customerId: string,
  signals: Signal[],
): Promise<void> {
  logger.info('createSignals: running');
  logger.debug({ customerId, signals }, 'createSignals: params');

  try {
    await Promise.all(
      signals.map((s) =>
        tx.identitySignal.upsert({
          where: { type_value: { type: s.type, value: s.value } },
          create: {
            type: s.type,
            value: s.value,
            confidence: getSignalConfidence(s.type),
            customerId,
          },
          update: {},
        }),
      ),
    );
  } catch (error) {
    logger.error({ error }, 'createSignals: error writing signals');
    throw errors.failedToCreateSignals(error);
  }

  logger.debug({ customerId, count: signals.length }, 'createSignals: signals written');
}
