import { CustomerSignalMatch } from '@/types';
import { TransactionClient } from '../db';
import { Event } from '@prisma/client';
import logger from '../logger';
import { errors } from '../errors';

export async function createMergeLog(
  tx: TransactionClient,
  winner: CustomerSignalMatch,
  loser: CustomerSignalMatch,
  loserEvents: Event[],
) {
  try {
    return tx.mergeLog.create({
      data: {
        winnerId: winner.customerId,
        loserId: loser.customerId,
        confidenceLevel: winner.confidence,
        mergedSignals: { create: loser.matchedSignals.map((s) => ({ identitySignalId: s.id })) },
        mergedEvents: { create: loserEvents.map((e: { id: string }) => ({ eventId: e.id })) },
      },
    });
  } catch (error) {
    logger.error({ error, winner, loser }, 'createMergeLog: failed to create merge log');
    throw errors.failedToCreateMergeLog(error);
  }
}
