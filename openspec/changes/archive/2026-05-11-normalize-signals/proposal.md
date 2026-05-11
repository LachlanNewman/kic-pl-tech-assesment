## Why

Validated webhook payloads are typed but still source-specific — there is no shared representation of identity signals across Shopify and Mindbody. A `normalizeSignals` function in `src/lib/` creates that shared representation, which is the prerequisite for identity resolution and database writes.

## What Changes

- Add `src/lib/signals.ts` with a `normalizeSignals` function that accepts a discriminated union of validated webhook payloads and returns a normalized `Signal[]`
- Add a `Signal` type to `src/types/index.ts` representing a typed key-value identity signal
- Add `src/lib/signals.test.ts` with unit tests covering signal extraction for both sources and null-exclusion behaviour

## Capabilities

### New Capabilities

- `signal-normalization`: Extraction and normalization of typed identity signals from validated webhook payloads into a source-agnostic `Signal[]` format

### Modified Capabilities

<!-- None — webhook-validation spec requirements are unchanged -->

## Impact

- **New file**: `src/lib/signals.ts`
- **New file**: `src/lib/signals.test.ts`
- **Modified**: `src/types/index.ts` — adds `Signal` type and `WebhookPayload` discriminated union
- No API surface changes, no new dependencies
