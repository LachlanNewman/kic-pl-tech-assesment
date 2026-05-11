## Context

Webhook payloads are now validated and typed via Zod schemas (`ShopifyOrder`, `MindbodyBooking`). The next step in the pipeline is extracting identity signals — the typed key-value pairs used for identity resolution — into a source-agnostic format. Currently no such extraction exists; each route handler holds a fully typed payload with no shared downstream representation.

## Goals / Non-Goals

**Goals:**
- Define a `Signal` type representing a single identity signal (`type`, `value`)
- Define a `SignalFields` type with optional nullable signal fields, and a `NormalizedInput` type with `source` and `signals: SignalFields` as top-level properties
- Implement `normalizeSignals(input: NormalizedInput): Signal[]` in `src/lib/signals.ts` — no branching on source, just null filtering
- Route handlers map their validated Zod payload to `NormalizedInput` before calling `normalizeSignals`, absorbing source-specific field name quirks (e.g. `client_email` → `email`)
- Exclude null signals from output — callers receive only signals that are actually present

**Non-Goals:**
- Writing signals to the database (next change)
- Identity resolution or profile matching
- Deduplication of signals across events

## Decisions

### Single flat input type over discriminated union

The input is a single `NormalizedInput` type rather than `ShopifyOrder | MindbodyBooking`. Source-specific field name differences (e.g. Mindbody's `client_email` vs Shopify's `email`) are resolved in the route handler before `normalizeSignals` is called. This means `normalizeSignals` has no branching logic — it operates on a uniform shape regardless of source.

```typescript
type SignalFields = {
  email?:               string | null
  phone?:               string | null
  device_id?:           string | null
  shopify_customer_id?: string | null
  mindbody_client_id?:  string | null
}

type NormalizedInput = {
  source: "shopify" | "mindbody"
  signals: SignalFields
}
```

`source` and `signals` are top-level properties — metadata and data are explicitly separated. `normalizeSignals` iterates `Object.entries(input.signals)` without needing to exclude `source`, since it lives outside the signals object.

**Why not discriminated union**: The discriminated union approach would push field-name normalization into `normalizeSignals` itself, mixing ingestion concerns with extraction logic. The structured type keeps `normalizeSignals` simple and makes adding a third source a matter of extending `SignalFields` and updating the relevant route handler only.

### Mapping responsibility belongs in route handlers

Each route handler maps its Zod-validated payload to `NormalizedInput`:

```
Shopify handler:
  { source: "shopify", signals: { email: order.email, phone: order.phone,
    device_id: order.device_id, shopify_customer_id: order.customer_id } }

Mindbody handler:
  { source: "mindbody", signals: { email: booking.client_email, phone: booking.phone,
    mindbody_client_id: booking.client_id } }
```

### Field normalization rules

Each signal field has a defined normalization applied before it enters `SignalFields`. Normalization happens in the route handler at mapping time, before `normalizeSignals` is called.

| Field | Normalization |
|---|---|
| `email` | Lowercase, trim whitespace. Zod's `.email()` validator has already confirmed format. |
| `phone` | E.164 format — strip all non-digit characters except leading `+`, ensure `+` prefix. Per ARCHITECTURE.md, phone is the highest-confidence signal when present; consistent formatting is critical for lookup correctness. |
| `device_id` | Pass through as-is. Opaque identifier set by the client; no canonical format to enforce. |
| `shopify_customer_id` | Pass through as-is. Opaque Shopify-assigned integer ID cast to string. |
| `mindbody_client_id` | Pass through as-is. Opaque Mindbody-assigned ID. |

**Why normalize inside `normalizeSignals`**: Normalization is applied via a `FIELD_NORMALIZERS` map keyed by signal type. This keeps normalization co-located with extraction — route handlers map field names but don't need to know normalization rules. Adding a new normalization rule is a one-line change to the map in `signals.ts`.

**All normalizers must be idempotent**: Applying a normalizer to an already-normalized value must produce the same result. This is a hard requirement — upstream systems may pre-normalize values, and the pipeline may process the same event more than once. Current normalizers satisfy this: `toLowerCase().trim()` on a clean string is a no-op; `normalizePhone` on a well-formed E.164 number returns it unchanged.

### Signal type is `{ type: string; value: string }`

Signal types are open strings (matching the Prisma schema's `IdentitySignal.type` field) rather than a TypeScript enum. This avoids a schema migration every time a new signal type is introduced. The values are always `string` — nulls are filtered before constructing a `Signal`.

### Null filtering at construction time

Null or undefined fields in `NormalizedInput` are excluded from the returned array. Downstream consumers (identity resolution, DB writes) only need to act on signals that are present — a null signal carries no information.

### Location: `src/lib/signals.ts`

Business logic belongs in `src/lib/` per project conventions. Route handlers call `normalizeSignals` after validation and mapping.

## Risks / Trade-offs

- **Open string signal types**: A typo in `"shopify_customer_id"` is not caught at compile time. → Mitigation: signal type constants can be added later if drift becomes a problem.
- **Mapping in route handlers**: Field-name normalization is spread across two files rather than centralised. → Acceptable given there are only two sources; revisit if sources grow.
