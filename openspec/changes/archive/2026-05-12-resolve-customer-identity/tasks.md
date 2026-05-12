## 1. Core Implementation

- [x] 1.1 Add `createCustomerProfile(): Promise<string>` to `src/lib/identity.ts` — calls `prisma.customer.create()` and returns the new ID, with logging
- [x] 1.2 Add `resolveExistingProfile(match: CustomerSignalMatch): string` to `src/lib/identity.ts` — returns `match.customerId`, with logging
- [x] 1.3 Add `resolveProfileMergeConflict(matches: CustomerSignalMatch[]): string` to `src/lib/identity.ts` — returns `matches[0].customerId` with a code comment that the pick-first merge strategy needs proper design, with logging
- [x] 1.4 Add `resolveCustomerIdentity(matches: CustomerSignalMatch[]): Promise<string>` to `src/lib/identity.ts` — orchestrator that routes to the correct function based on `matches.length`, with logging

## 2. Tests

- [x] 2.1 Test `createCustomerProfile`: creates a new Customer record and returns its ID
- [x] 2.2 Test `resolveExistingProfile`: returns the matched customer ID
- [x] 2.3 Test `resolveProfileMergeConflict`: returns `matches[0].customerId` for two matches
- [x] 2.4 Test `resolveProfileMergeConflict`: returns `matches[0].customerId` for three or more matches
- [x] 2.5 Test `resolveCustomerIdentity`: routes to `createCustomerProfile` when matches is empty
- [x] 2.6 Test `resolveCustomerIdentity`: routes to `resolveExistingProfile` when matches has one entry
- [x] 2.7 Test `resolveCustomerIdentity`: routes to `resolveProfileMergeConflict` when matches has two or more entries

## 3. Wire Up

- [x] 3.1 Call `resolveCustomerIdentity(customerSignalMatches)` in the Shopify webhook route and log the resolved customer ID
- [x] 3.2 Run `npm run test` and `npm run lint` and confirm both pass
