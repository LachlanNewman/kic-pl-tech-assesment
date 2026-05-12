## Context

The identity pipeline currently has two steps: `normalizeSignals` extracts typed signals from a webhook payload, and `getCustomerIdsFromSignals` looks up which existing customers own those signals. The result — a `CustomerSignalMatch[]` — is computed but discarded in the webhook route. This change adds the third step: reducing that array to a single authoritative customer ID.

The three possible states after lookup are: no match (new visitor), one match (known customer), and multiple matches (signals belonging to different profiles — a merge conflict). Each requires different handling.

## Goals / Non-Goals

**Goals:**
- Provide an orchestrator function `resolveCustomerIdentity` that accepts `CustomerSignalMatch[]` and always returns a `Promise<string>` (a valid customer ID)
- Implement each resolution case as its own exported function (`createCustomerProfile`, `resolveExistingProfile`, `resolveProfileMergeConflict`) for independent testability
- Create a new `Customer` row for the zero-match case
- Return the matched ID for the one-match case
- Resolve merge conflicts with a deterministic (if naive) pick-first strategy for now
- Wire the resolved ID into the Shopify webhook route

**Non-Goals:**
- Proper merge strategy (deferred — pick-first is a placeholder)
- Storing signals against the resolved profile (separate concern, future change)
- Storing the event against the resolved profile (separate concern, future change)
- Support for sources other than Shopify (no changes needed — function is source-agnostic)

## Decisions

### Split resolution into separate functions per case

Each branch — new profile, existing profile, merge conflict — is implemented as its own exported function rather than inline branches inside the orchestrator. This makes each case independently unit-testable without constructing the full input scenario, and isolates the merge strategy in `resolveProfileMergeConflict` so it is easy to replace without touching the orchestrator or other cases.

The orchestrator `resolveCustomerIdentity` routes to the correct function and owns no logic itself beyond the dispatch.

### Return `Promise<string>` rather than a richer result object

The caller (webhook route) only needs to know the resolved customer ID for now. Adding an `outcome` discriminant (`'new' | 'existing' | 'merged'`) is useful for observability but is left for a future change when event/signal storage is wired up and the outcome actually changes downstream behaviour. Logging within each sub-function provides sufficient traceability in the interim.

### New-profile creation inside `createCustomerProfile`

The DB write for the zero-match case lives in `createCustomerProfile` rather than in the caller. This keeps identity resolution self-contained — the orchestrator does not need to know the difference between "ID that already existed" and "ID just created." The contract is simply: you always get back a valid customer ID.

### Pick-first for merge conflicts isolated in `resolveProfileMergeConflict`

When `matches.length >= 2`, return `matches[0].customerId` without any DB write. This is intentionally naive: the order of results from `getCustomerIdsFromSignals` is not guaranteed beyond what Prisma returns. A real strategy would consider signal count, profile age, or most recent activity. The comment flagging this as a known gap sits directly on `resolveProfileMergeConflict`, making it highly visible when someone comes to replace it.

The threshold is `>= 2` (not `> 2`) — two distinct customers matching on different signals is already a conflict.

## Risks / Trade-offs

- **Non-deterministic merge**: Pick-first depends on Prisma's query result order, which is undefined without an explicit `orderBy`. Events may silently attribute to different profiles across runs if DB ordering changes.
  → Mitigation: the comment in code makes this explicit; a real merge strategy should be prioritised before high event volume.

- **Orphaned profiles**: In the merge case, the non-selected profiles are never marked as merged or deactivated. Over time this leads to profile fragmentation that the pick-first strategy silently ignores.
  → Mitigation: out of scope here; accepted as a known debt with the comment as the reminder.

- **No signal backfill on new profile**: When a new customer is created, the incoming signals are not stored against it. Subsequent webhooks with the same signals will create another new profile rather than matching the one just created.
  → Mitigation: signal storage is the next step in the pipeline; this risk is bounded to the interim period between this change and that one.
