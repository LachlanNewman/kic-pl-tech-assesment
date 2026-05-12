## Context

Each webhook route currently calls three functions inline: `normalizeSignals`, `getCustomerIdsFromSignals`, and one of the resolution sub-functions (via `resolveCustomerIdentity`). The resolution orchestrator `resolveCustomerIdentity` exists solely to route between the three resolution sub-functions — it adds a layer without adding meaningful abstraction. Extracting the full pipeline into `resolveIdentity` makes the sequence explicit in one place and reduces each endpoint to a single call.

## Goals / Non-Goals

**Goals:**
- Create `src/lib/identityResolution.ts` with `resolveIdentity(input: NormalizedInput): Promise<string>` encapsulating the full pipeline
- Remove `resolveCustomerIdentity` and its test file — the routing logic moves into `resolveIdentity`
- Reduce each webhook route to a single identity call

**Non-Goals:**
- Changing the resolution logic itself — `createCustomerProfile`, `resolveExistingProfile`, and `resolveProfileMergeConflict` are unchanged
- Adding error handling or retry logic to the pipeline
- Supporting sources beyond `shopify` and `mindbody` (no changes needed — `NormalizedInput` already covers both)

## Decisions

### `resolveIdentity` accepts `NormalizedInput`, not `Signal[]`

`NormalizedInput` is the natural entry point — it carries both the source and the raw signal fields, which is what the endpoint already has. Accepting `Signal[]` would require the caller to normalize first, pushing pipeline knowledge back into the route. Accepting `NormalizedInput` keeps the endpoint completely unaware of the pipeline internals.

### `resolveCustomerIdentity` is deleted, not deprecated

The function has no external callers — it is only used by the two webhook routes, which are both being updated in this change. Leaving it as a deprecated re-export adds noise with no benefit. Deletion is clean and immediate.

### Pipeline lives in `src/lib/identityResolution.ts`, not inside `src/lib/identity/`

The identity directory contains the individual resolution primitives. The pipeline function orchestrates across both `src/lib/signals.ts` (normalisation) and `src/lib/identity/` (lookup and resolution) — it is a higher-level concern that spans both modules, so it belongs at the `src/lib/` level rather than inside either one.

## Risks / Trade-offs

- **Reduced granularity in route tests**: Route tests previously verified the three-call sequence; after this change they verify a single call. Individual function tests in `src/lib/identity/` still cover each step — the overall coverage is equivalent.
  → Mitigation: `identityResolution.test.ts` covers the pipeline end-to-end with mocked sub-functions, preserving integration-level confidence.
