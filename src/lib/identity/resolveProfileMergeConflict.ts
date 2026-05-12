import { CustomerSignalMatch } from "@/types";
import logger from "../logger";

export type MergeResolution = {
  winner: string;
  losers: string[];
};

export function resolveProfileMergeConflict(matches: CustomerSignalMatch[]): MergeResolution {
  logger.info("resolveProfileMergeConflict: running");
  logger.debug({ matchCount: matches.length, customerIds: matches.map((m) => m.customerId) }, "resolveProfileMergeConflict: params");
  // TODO: this pick-first merge strategy is a placeholder and needs proper design.
  // A real strategy should consider profile age, signal count, or most recent activity.
  const [first, ...rest] = matches;
  const winner = first.customerId;
  const losers = rest.map((m) => m.customerId);
  logger.debug({ winner, losers }, "resolveProfileMergeConflict: resolved");
  return { winner, losers };
}
