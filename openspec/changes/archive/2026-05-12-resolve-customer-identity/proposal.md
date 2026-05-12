## Why

The webhook pipeline can now look up which existing customers match incoming signals, but does nothing with the result — `customerSignalMatches` is computed and discarded. The next step is to resolve that array into a single canonical customer ID so events and signals can be attributed to the right profile.

## What Changes

- Add four exported functions to `src/lib/identity.ts`:
  - `resolveCustomerIdentity(matches: CustomerSignalMatch[]): Promise<string>` — orchestrator that routes to the correct handler
  - `createCustomerProfile(): Promise<string>` — creates a new `Customer` record and returns its ID (zero-match case)
  - `resolveExistingProfile(match: CustomerSignalMatch): string` — returns the matched customer's ID (one-match case)
  - `resolveProfileMergeConflict(matches: CustomerSignalMatch[]): string` — pick-first placeholder with a comment flagging the strategy for future design (two-or-more-match case)
- Wire `resolveCustomerIdentity` into the Shopify webhook route, replacing the currently unused `customerSignalMatches` result

## Capabilities

### New Capabilities

- `customer-identity-resolution`: Resolves an array of customer signal matches to a single canonical customer ID, handling new profile creation and merge conflicts

### Modified Capabilities

<!-- None -->

## Impact

- **Modified file**: `src/lib/identity.ts` — new function added
- **Modified file**: `src/app/api/webhooks/shopify/route.ts` — consumes the resolved customer ID
- **New file**: tests in `src/lib/identity.test.ts` (extending existing test file)
- **Database**: writes to `Customer` table for new profiles only
- **No new dependencies**
- **No API surface changes**
