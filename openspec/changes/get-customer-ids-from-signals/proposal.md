## Why

Normalized signals are now extracted from incoming webhooks but never acted on. The next step in the identity pipeline is looking up which existing customers those signals belong to — a prerequisite for identity resolution, merging, and event attribution.

## What Changes

- Add `src/lib/identity.ts` with a `getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]>` function that queries the `IdentitySignal` table and returns one entry per distinct matched customer, each with the list of signals that matched that customer
- Add `CustomerSignalMatch` type to `src/types/index.ts`: `{ customerId: string; matchedSignals: Signal[] }`

## Capabilities

### New Capabilities

- `customer-id-lookup`: Exact-match lookup of customers from a list of normalized signals, returning each matched customer ID alongside the signals that matched it — enabling conflict resolution when multiple customers are returned

### Modified Capabilities

<!-- None -->

## Impact

- **New file**: `src/lib/identity.ts`
- **New file**: `src/lib/identity.test.ts`
- **Database**: reads from `IdentitySignal` table — no writes
- **No API surface changes**
- **No new dependencies**
