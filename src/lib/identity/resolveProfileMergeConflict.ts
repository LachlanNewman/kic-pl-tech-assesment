import { CustomerSignalMatch } from "@/types";
import logger from "../logger";

export type MergeResolution = {
  winner: string;
  losers: string[];
};

export function resolveProfileMergeConflict(matches: CustomerSignalMatch[]): MergeResolution {
  logger.info("resolveProfileMergeConflict: running");
  logger.debug({ matchCount: matches.length, customerIds: matches.map((m) => m.customerId) }, "resolveProfileMergeConflict: params");
  const sorted = [...matches].sort((a, b) => b.matchedSignals.length - a.matchedSignals.length);
  const winner = sorted[0].customerId;
  const losers = sorted.slice(1).map((m) => m.customerId);
  logger.debug({ winner, losers }, "resolveProfileMergeConflict: resolved");
  return { winner, losers };
}
