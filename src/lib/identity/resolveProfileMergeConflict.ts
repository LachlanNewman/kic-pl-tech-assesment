import { CustomerSignalMatch } from "@/types";
import { getSignalConfidence } from "../signals/signalConfig";
import logger from "../logger";

export type MergeResolution = {
  winner: CustomerSignalMatch;
  losers: CustomerSignalMatch[];
};

export function resolveProfileMergeConflict(matches: CustomerSignalMatch[]): MergeResolution {
  logger.info("resolveProfileMergeConflict: running");
  logger.debug({ matchCount: matches.length, customerIds: matches.map((m) => m.customerId) }, "resolveProfileMergeConflict: params");
  const sorted = matches.sort((a, b) => b.confidence - a.confidence);
  const winner = sorted[0];
  const losers = sorted.slice(1);
  logger.debug({ winner: winner.customerId, losers: losers.map((l) => l.customerId) }, "resolveProfileMergeConflict: resolved");
  return { winner, losers };
}
