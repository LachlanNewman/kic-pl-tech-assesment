import { CustomerSignalMatch } from "@/types";
import logger from "../logger";
import { prisma, TransactionClient } from "../db";

export async function resolveProfileMergeConflict(matches: CustomerSignalMatch[]): Promise<string> {
  logger.info("resolveProfileMergeConflict: running");
  logger.debug({ matchCount: matches.length, customerIds: matches.map((m) => m.customerId) }, "resolveProfileMergeConflict: params");
  // TODO: this pick-first merge strategy is a placeholder and needs proper design.
  // A real strategy should consider profile age, signal count, or most recent activity.
  const [winner, ...losers] = matches;
  const resolved = winner.customerId;
  logger.debug({ resolved }, "resolveProfileMergeConflict: resolved to first match");

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.identitySignal.updateMany({
      where: { customerId: { in: losers.map((m) => m.customerId) } },
      data: { mergedInto: resolved },
    });
  });

  return resolved;
}
