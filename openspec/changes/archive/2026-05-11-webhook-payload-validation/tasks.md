## 1. Dependencies

- [x] 1.1 Install `zod` as a production dependency

## 2. Schemas and Types

- [x] 2.1 Define `ShopifyOrderSchema` in `src/types/index.ts` using Zod with all fields from the design (nullable signals)
- [x] 2.2 Export `ShopifyOrder` type inferred from `ShopifyOrderSchema`
- [x] 2.3 Define `MindbodyBookingSchema` in `src/types/index.ts` using Zod (`client_email` not `email`)
- [x] 2.4 Export `MindbodyBooking` type inferred from `MindbodyBookingSchema`

## 3. Route Handlers

- [x] 3.1 Update `src/app/api/webhooks/shopify/route.ts` to parse body with `ShopifyOrderSchema.safeParse`, returning 400 with flattened errors on failure
- [x] 3.2 Update `src/app/api/webhooks/mindbody/route.ts` to parse body with `MindbodyBookingSchema.safeParse`, returning 400 with flattened errors on failure

## 4. Tests

- [x] 4.1 Create `src/app/api/webhooks/shopify/route.test.ts` — valid payload returns 200
- [x] 4.2 Create `src/app/api/webhooks/shopify/route.test.ts` — invalid payload (missing required field) returns 400 with `error` and `details` in body
- [x] 4.3 Create `src/app/api/webhooks/shopify/route.test.ts` — guest checkout payload (all nullable signals null) returns 200
- [x] 4.4 Create `src/app/api/webhooks/mindbody/route.test.ts` — valid payload returns 200
- [x] 4.5 Create `src/app/api/webhooks/mindbody/route.test.ts` — invalid payload (missing `client_id`) returns 400 with `error` and `details` in body
