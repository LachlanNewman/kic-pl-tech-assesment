## 1. Create the Pipeline Function

- [x] 1.1 Create `src/lib/identityResolution.ts` with `resolveIdentity(input: NormalizedInput): Promise<string>` — calls `normalizeSignals`, then `getCustomerIdsFromSignals`, then routes directly to `createCustomerProfile`, `resolveExistingProfile`, or `resolveProfileMergeConflict` based on match count, with logging

## 2. Tests

- [x] 2.1 Test `resolveIdentity`: no signal matches → creates new customer and returns ID
- [x] 2.2 Test `resolveIdentity`: single match → returns matched customer ID
- [x] 2.3 Test `resolveIdentity`: multiple matches → returns first matched customer ID
- [x] 2.4 Test `resolveIdentity`: all-null signals → creates new customer and returns ID

## 3. Remove resolveCustomerIdentity

- [x] 3.1 Delete `src/lib/identity/resolveCustomerIdentity.ts`
- [x] 3.2 Delete `src/lib/identity/resolveCustomerIdentity.test.ts`
- [x] 3.3 Remove `resolveCustomerIdentity` export from `src/lib/identity/index.ts`

## 4. Update Webhook Routes

- [x] 4.1 Replace the three inline identity calls in the Shopify webhook route with a single `resolveIdentity(...)` call
- [x] 4.2 Replace the three inline identity calls in the Mindbody webhook route with a single `resolveIdentity(...)` call

## 5. Verify

- [x] 5.1 Run `npm run test` and `npm run lint` and confirm both pass
