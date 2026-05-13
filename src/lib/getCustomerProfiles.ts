import logger from "./logger";
import { getSignalsByValue } from "./signals/getSignalsByValue";
import { getCustomerProfiles } from "./identity/getCustomerProfiles";
import { CustomerProfile } from "@/types";


export async function getCustomerProfile(identitySignalValue: string): Promise<CustomerProfile[]> {
  logger.info("getCustomerProfile: running");
  logger.debug({ identitySignalValue }, "getCustomerProfile: params");

  const identitySignals = await getSignalsByValue(identitySignalValue);

  if (identitySignals.length === 0) {
    logger.debug({ identitySignalValue }, "getCustomerProfile: no identity signals found, returning empty profile");
    return [];
  }

  return getCustomerProfiles(identitySignals.map((s) => s.customerId));
}