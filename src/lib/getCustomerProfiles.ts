import logger from './logger';
import { getSignalsByValue } from './signals/getSignalsByValue';
import { getCustomerProfiles } from './identity/getCustomerProfiles';
import { CustomerProfile } from '@/types';
import { errors, HttpError } from './errors';

export async function getCustomerProfile(identitySignalValue: string): Promise<CustomerProfile[]> {
  logger.info('getCustomerProfile: running');
  logger.debug({ identitySignalValue }, 'getCustomerProfile: params');

  try {
    const identitySignals = await getSignalsByValue(identitySignalValue);

    if (identitySignals.length === 0) {
      logger.debug(
        { identitySignalValue },
        'getCustomerProfile: no identity signals found, returning empty profile',
      );
      return [];
    }

    return getCustomerProfiles(identitySignals.map((s) => s.customerId));
  } catch (error) {
    logger.error({ error }, 'getCustomerProfile: error getting customer profiles');
    throw HttpError.fromError(error, errors.failedToGetCustomerProfiles);
  }
}
