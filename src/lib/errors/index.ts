import { HttpError } from './HttpError';

export { HttpError };

export const errors: Record<string, (cause?: unknown) => HttpError> = {
  duplicateEvent: (cause) =>
    new HttpError(409, 'An event with the same external ID already exists', cause),
  invalidPayload: (cause) =>
    new HttpError(400, 'The payload is invalid or missing required fields', cause),
  unknownError: (cause) => new HttpError(500, 'An unknown error occurred', cause),
  failedToCreateCustomerProfile: (cause) =>
    new HttpError(500, 'Failed to create customer profile', cause),
  failedToRetrieveCustomerProfiles: (cause) =>
    new HttpError(500, 'Failed to retrieve customer profiles', cause),
  failedToSetCustomerAsMerged: (cause) =>
    new HttpError(500, 'Failed to set customer as merged', cause),
  failedToCreateMergeLog: (cause) => new HttpError(500, 'Failed to create merge log', cause),
  failedToCreateSignals: (cause) => new HttpError(500, 'Failed to create signals', cause),
  failedToFindSignals: (cause) => new HttpError(500, 'Failed to find signals', cause),
  failedToCreateEvent: (cause) => new HttpError(500, 'Failed to create event', cause),
  failedToFindEvent: (cause) => new HttpError(500, 'Failed to find event', cause),
  failedToFindEvents: (cause) => new HttpError(500, 'Failed to find events', cause),
  failedToUpdateEvents: (cause) => new HttpError(500, 'Failed to update events', cause),
} as const;
