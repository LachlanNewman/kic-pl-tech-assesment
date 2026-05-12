import { WebhookPayload } from "@/types";
import { getNormalizedInput, normalizeSignals } from "./signals";
import { getCustomerIdsFromSignals } from "./identity/getCustomerIdsFromSignals";
import { createCustomerProfile } from "./identity/createCustomerProfile";
import { resolveExistingProfile } from "./identity/resolveExistingProfile";
import { resolveProfileMergeConflict } from "./identity/resolveProfileMergeConflict";
import logger from "./logger";

export async function identityResolution(payload: WebhookPayload): Promise<string> {
  logger.info("identityResolution: running");

  const input = getNormalizedInput(payload);
  logger.debug({ source: input.source }, "identityResolution: normalized input");

  const signals = normalizeSignals(input);
  logger.debug({ signalCount: signals.length }, "identityResolution: signals normalized");

  const matches = await getCustomerIdsFromSignals(signals);
  logger.debug({ matchCount: matches.length }, "identityResolution: matches found");

  if (matches.length === 0) {
    logger.debug({}, "identityResolution: no matches, creating new profile");
    return createCustomerProfile();
  }

  if (matches.length === 1) {
    logger.debug({}, "identityResolution: single match, resolving existing profile");
    return resolveExistingProfile(matches[0]);
  }

  logger.debug({}, "identityResolution: multiple matches, resolving merge conflict");
  return resolveProfileMergeConflict(matches);
}
