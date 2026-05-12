## Why

Each webhook endpoint currently makes three sequential identity calls inline — `normalizeSignals`, `getCustomerIdsFromSignals`, and one of the resolution functions — which duplicates the pipeline logic across routes. Extracting this into a single function makes the pipeline a first-class concept, keeps endpoints thin, and removes the intermediate `resolveCustomerIdentity` orchestrator which is no longer needed.

## What Changes

- Add `src/lib/identityResolution.ts` with a `resolveIdentity(input: NormalizedInput): Promise<string>` function that runs the full pipeline: normalize signals → look up customer IDs → resolve to a single customer ID
- **BREAKING (internal)**: Remove `resolveCustomerIdentity` from `src/lib/identity/index.ts` and `src/lib/identity/resolveCustomerIdentity.ts` — callers should use `resolveIdentity` instead
- Update the Shopify webhook route to replace the three inline calls with a single `resolveIdentity(...)` call
- Update the Mindbody webhook route to replace the three inline calls with a single `resolveIdentity(...)` call
- Remove `src/lib/identity/resolveCustomerIdentity.test.ts` — pipeline-level tests move to `src/lib/identityResolution.test.ts`

## Capabilities

### New Capabilities

<!-- None — this is a refactor; the observable behavior of each resolution case is unchanged -->

### Modified Capabilities

<!-- None — no spec-level behavior changes; signal normalization, customer ID lookup, and identity resolution all behave identically -->

## Impact

- **New file**: `src/lib/identityResolution.ts`
- **New file**: `src/lib/identityResolution.test.ts`
- **Deleted**: `src/lib/identity/resolveCustomerIdentity.ts`
- **Deleted**: `src/lib/identity/resolveCustomerIdentity.test.ts`
- **Modified**: `src/lib/identity/index.ts` — remove `resolveCustomerIdentity` export
- **Modified**: `src/app/api/webhooks/shopify/route.ts` — single `resolveIdentity` call
- **Modified**: `src/app/api/webhooks/mindbody/route.ts` — single `resolveIdentity` call
- **No API surface changes**
- **No database schema changes**
- **No new dependencies**
