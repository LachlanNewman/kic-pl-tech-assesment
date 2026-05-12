import { WebhookPayload } from "@/types";
import { getNormalizedInput, normalizeSignals, createSignals } from "./signals";
import { createEvent, findEventByExternalId } from "./events";
import { getCustomerIdsFromSignals } from "./identity/getCustomerIdsFromSignals";
import { createCustomerProfile } from "./identity/createCustomerProfile";
import { resolveProfileMergeConflict } from "./identity/resolveProfileMergeConflict";
import logger from "./logger";
import { prisma, TransactionClient } from "./db";

export async function identityResolution(payload: WebhookPayload): Promise<string> {
  logger.info("identityResolution: running");

  const existingCustomerId = await findEventByExternalId(payload.id);
  if (existingCustomerId) {
    logger.debug({ externalId: payload.id, existingCustomerId }, "identityResolution: duplicate event, returning existing customer");
    return existingCustomerId;
  }

  const input = getNormalizedInput(payload);
  logger.debug({ source: input.source }, "identityResolution: normalized input");

  const signals = normalizeSignals(input);
  logger.debug({ signalCount: signals.length }, "identityResolution: signals normalized");

  const matches = await getCustomerIdsFromSignals(signals);
  logger.debug({ matchCount: matches.length }, "identityResolution: matches found");

  if (matches.length === 0) {
    logger.debug("identityResolution: no matches, creating new profile");
    return prisma.$transaction(async (tx: TransactionClient) => {
      const customerId = await createCustomerProfile(tx);
      logger.debug({ customerId }, "identityResolution: new customer profile created");
      await createSignals(tx, customerId, signals);
      logger.debug({ customerId }, "identityResolution: signals written");
      await createEvent(tx, input, payload, customerId);
      logger.debug({ customerId }, "identityResolution: event written");
      return customerId;
    });
  }

  if (matches.length === 1) {
    const customerId = matches[0].customerId;
    logger.debug({ customerId }, "identityResolution: single match found");
    return prisma.$transaction(async (tx: TransactionClient) => {
      await createSignals(tx, customerId, signals);
      logger.debug({ customerId }, "identityResolution: new signals written");
      await createEvent(tx, input, payload, customerId);
      logger.debug({ customerId }, "identityResolution: event written");
      return customerId;
    });
  }

  logger.debug({}, "identityResolution: multiple matches, resolving merge conflict");
  const { winner, losers } = resolveProfileMergeConflict(matches);
  logger.debug({ winner, losers }, "identityResolution: merge resolved");
  return prisma.$transaction(async (tx: TransactionClient) => {
    for (const loser of losers) {
      const loserSignals = await tx.identitySignal.findMany({
        where: { customerId: loser },
        select: { id: true },
      });
      logger.debug({ loser, signalCount: loserSignals.length }, "identityResolution: loser signals fetched");

      const loserEvents = await tx.event.findMany({
        where: { customerId: loser },
        select: { id: true },
      });
      logger.debug({ loser, eventCount: loserEvents.length }, "identityResolution: loser events fetched");

      await tx.mergeLog.create({
        data: {
          winnerId: winner,
          loserId: loser,
          mergedSignals: { create: loserSignals.map((s:{ id: string }) => ({ identitySignalId: s.id })) },
          mergedEvents: { create: loserEvents.map((e:{ id: string }) => ({ eventId: e.id })) },
        },
      });
      logger.debug({ winner, loser }, "identityResolution: merge log created");
    }

    await tx.customer.updateMany({
      where: { id: { in: losers } },
      data: { mergedInto: winner },
    });
    logger.debug({ winner, losers }, "identityResolution: customer profiles merged");
    await createEvent(tx, input, payload, winner);
    logger.debug({ winner }, "identityResolution: event written for winner profile");
    return winner;
  });
}
