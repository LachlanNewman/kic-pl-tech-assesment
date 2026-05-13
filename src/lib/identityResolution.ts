import { WebhookPayload } from "@/types";
import { getNormalizedInput, normalizeSignals, createSignals } from "./signals";
import { createEvent, findEventByExternalId } from "./events";
import { createCustomerProfile } from "./identity/createCustomerProfile";
import { resolveProfileMergeConflict } from "./identity/resolveProfileMergeConflict";
import logger from "./logger";
import { prisma, TransactionClient } from "./db";
import { findSignalsByValues } from "./signals/findSignalsByValues";
import { groupSignalsByCustomers } from "./identity/groupSignalsByCustomer";
import { updateEventsToNewCustomer } from "./events/updateEventsToNewCustomer";
import { setCustomerAsMerged } from "./identity/setCustomerAsMerged";
import { mergeSignal } from "./signals/mergeSignal";
import { findEventsForCustomer } from "./events/findEventsForCustomer";
import { createMergeLog } from "./merge/createMergeLog";

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

  const matches = await findSignalsByValues(signals);
  logger.debug({ matchCount: matches.length }, "identityResolution: matches found");

  const groupedMatches = groupSignalsByCustomers(matches);
  logger.debug({ groupedMatchCount: groupedMatches.length }, "identityResolution: grouped matches");

  if (groupedMatches.length === 0) {
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

  if (groupedMatches.length === 1) {
    const customerId = groupedMatches[0].customerId;
    logger.debug({ customerId }, "identityResolution: single match found");
    return prisma.$transaction(async (tx: TransactionClient) => {
      await createSignals(tx, customerId, signals);
      logger.debug({ customerId }, "identityResolution: new signals written");
      await createEvent(tx, input, payload, customerId);
      logger.debug({ customerId }, "identityResolution: event written");
      return customerId;
    });
  }

  logger.debug("identityResolution: multiple matches, resolving merge conflict");

  const { winner, losers } = resolveProfileMergeConflict(groupedMatches);
  logger.debug({ winner, losers }, "identityResolution: merge resolved");

  return prisma.$transaction(async (tx: TransactionClient) => {
    for (const loser of losers) {
      const loserEvents = await findEventsForCustomer(tx, loser.customerId);
      await mergeSignal(tx, winner.customerId, loser.customerId);
      await updateEventsToNewCustomer(tx, loser.customerId, winner.customerId);
      await createMergeLog(tx, winner, loser, loserEvents);
      await setCustomerAsMerged(tx, winner.customerId, loser.customerId);
    }
    logger.debug({ winner, losers }, "identityResolution: customer profiles merged");
    await createEvent(tx, input, payload, winner.customerId);
    logger.debug({ winner }, "identityResolution: event written for winner profile");
    return winner.customerId;
  });
}
