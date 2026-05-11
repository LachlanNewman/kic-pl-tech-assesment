## Why

Both webhook route handlers are stubs that accept any payload without validation. Malformed or unexpected payloads would pass through silently, making downstream bugs hard to trace. Zod validation gives us a typed contract at the boundary and explicit 400 responses for bad input.

## What Changes

- Install `zod` as a production dependency
- Define `ShopifyOrderSchema` and `MindbodyBookingSchema` in `src/types/index.ts`, with inferred TypeScript types exported alongside them
- Update `POST /api/webhooks/shopify` to parse and validate the request body against `ShopifyOrderSchema`, returning 400 on failure
- Update `POST /api/webhooks/mindbody` to parse and validate the request body against `MindbodyBookingSchema`, returning 400 on failure

## Capabilities

### New Capabilities

- `webhook-validation`: Zod schema validation of incoming Shopify and Mindbody webhook payloads at the API boundary, with typed parsed output and structured 400 error responses on failure

### Modified Capabilities

<!-- None — no existing specs are changing -->

## Impact

- **Dependencies**: `zod` added to `package.json`
- **Files modified**: `src/types/index.ts`, `src/app/api/webhooks/shopify/route.ts`, `src/app/api/webhooks/mindbody/route.ts`
- **No DB writes**: this change is validation-only — no Prisma calls
- **No breaking changes to existing callers**: routes previously accepted anything; they now reject malformed payloads with 400
