import logger from "../logger";
import { createCustomerProfile } from "./createCustomerProfile";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import { resolveExistingProfile } from "./resolveExistingProfile";
import { CustomerSignalMatch } from "@/types";

export async function resolveCustomerIdentity(matches: CustomerSignalMatch[]): Promise<string> {
  logger.info("resolveCustomerIdentity: running");
  logger.debug({ matchCount: matches.length }, "resolveCustomerIdentity: params");
  if (matches.length === 0) {
    logger.debug({}, "resolveCustomerIdentity: no matches, creating new profile");
    return createCustomerProfile();
  }
  if (matches.length === 1) {
    logger.debug({}, "resolveCustomerIdentity: single match, resolving existing profile");
    return resolveExistingProfile(matches[0]);
  }
  logger.debug({}, "resolveCustomerIdentity: multiple matches, resolving merge conflict");
  return resolveProfileMergeConflict(matches);
}
