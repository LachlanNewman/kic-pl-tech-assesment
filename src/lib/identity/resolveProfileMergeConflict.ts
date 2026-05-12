import { CustomerSignalMatch } from "@/types";
import logger from "../logger";

export function resolveProfileMergeConflict(matches: CustomerSignalMatch[]): string {
  logger.info("resolveProfileMergeConflict: running");
  logger.debug({ matchCount: matches.length, customerIds: matches.map((m) => m.customerId) }, "resolveProfileMergeConflict: params");
  // TODO: this pick-first merge strategy is a placeholder and needs proper design.
  // A real strategy should consider profile age, signal count, or most recent activity.
  const resolved = matches[0].customerId;
  logger.debug({ resolved }, "resolveProfileMergeConflict: resolved to first match");
  return resolved;
}
