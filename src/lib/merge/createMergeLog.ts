import { CustomerSignalMatch } from "@/types";
import { TransactionClient } from "../db";
import { Event } from "@prisma/client";

export async function createMergeLog(
  tx: TransactionClient,
  winner: CustomerSignalMatch,
  loser: CustomerSignalMatch,
  loserEvents: Event[],
) {
  const triggeringSignal = winner.matchedSignals[0];
  return tx.mergeLog.create({
    data: {
      winnerId: winner.customerId,
      loserId: loser.customerId,
      confidenceLevel: triggeringSignal.confidence,
      triggeringSignalId: triggeringSignal.id,
      mergedSignals: { create: loser.matchedSignals.map((s) => ({ identitySignalId: s.id })) },
      mergedEvents: { create: loserEvents.map((e: { id: string }) => ({ eventId: e.id })) },
    },
  });
}
