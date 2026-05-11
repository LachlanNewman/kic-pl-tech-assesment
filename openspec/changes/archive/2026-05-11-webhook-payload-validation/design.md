## Context

Both webhook route handlers (`POST /api/webhooks/shopify` and `POST /api/webhooks/mindbody`) are stubs. There is no payload validation, no type safety on the request body, and no structured error response. The `src/types/index.ts` file is empty. Zod is not currently installed.

## Goals / Non-Goals

**Goals:**
- Install Zod and define typed schemas for both webhook payload shapes
- Return structured 400 responses when payloads fail validation
- Export inferred TypeScript types alongside schemas so downstream code can consume typed values without re-importing Zod

**Non-Goals:**
- Identity resolution or database writes (out of scope for this change)
- HMAC signature verification (separate concern)
- Validation of nested line items beyond the top-level order shape

## Decisions

### Schemas live in `src/types/index.ts`, not `src/lib/`

Both schemas are pure type definitions — no side effects, no DB access. They belong in `src/types/` per the project's folder conventions. Business logic (identity resolution, DB writes) will live in `src/lib/` when that work is added.

### Use `safeParse`, not `parse`

`safeParse` returns a result object rather than throwing. This avoids a try/catch in the route handler and keeps the success/failure branch explicit. The 400 response includes `result.error.flatten()` — Zod's structured field-level error format — rather than a raw Zod error object.

### Nullable fields, not optional

Fields that may be absent (`customer_id`, `email`, `phone`, `device_id`, `client_email`) are typed as `.nullable()` rather than `.optional()`. This requires callers to send the field explicitly as `null` for absent values, making the contract unambiguous. If the upstream system omits the field entirely, `.nullish()` can be used — flagged as an open question.

### Shopify payload shape

```
{
  id: string                  // order ID, used for idempotency later
  customer_id: string | null  // null for guest checkouts
  email: string | null
  phone: string | null
  device_id: string | null
  created_at: string (ISO 8601 datetime)
}
```

### Mindbody payload shape

```
{
  id: string                  // booking ID
  client_id: string           // always present
  client_email: string | null // note: different field name from Shopify's email
  phone: string | null
  class_name: string
  scheduled_at: string (ISO 8601 datetime)
}
```

## Risks / Trade-offs

- **Nullable vs nullish**: If Shopify or Mindbody omit optional fields rather than sending `null`, `.nullable()` will reject the payload. → Mitigation: monitor 400 error logs after deployment and switch affected fields to `.nullish()` if needed.
- **Schema drift**: Real webhook payloads from Shopify/Mindbody may differ from the designed shapes. → Mitigation: schemas are easy to update; idempotency and downstream logic are not coupled to this layer yet.

## Open Questions

- Should optional signals (`email`, `phone`, `device_id`) use `.nullish()` (accepts both `null` and `undefined`) rather than `.nullable()`? Depends on whether the upstream systems omit or null out absent fields.
