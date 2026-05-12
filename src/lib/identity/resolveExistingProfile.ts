import { CustomerSignalMatch } from "@/types";
import logger from "../logger";

export function resolveExistingProfile(match: CustomerSignalMatch): string {
  logger.info("resolveExistingProfile: running");
  logger.debug({ customerId: match.customerId }, "resolveExistingProfile: returning matched customer");
  return match.customerId;
}
