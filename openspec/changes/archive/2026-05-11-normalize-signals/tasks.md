## 1. Types

- [x] 1.1 Add `Signal` type `{ type: string; value: string }` to `src/types/index.ts`
- [x] 1.2 Add `NormalizedInput` type to `src/types/index.ts` with `source`, `email`, `phone`, `device_id`, `shopify_customer_id`, `mindbody_client_id` fields

## 2. Implementation

- [x] 2.1 Create `src/lib/signals.ts` with `normalizeSignals(input: NormalizedInput): Signal[]` — iterate known signal fields, filter nulls/undefined
- [x] 2.2 Update Shopify route handler to map `ShopifyOrder` to `NormalizedInput` and call `normalizeSignals`
- [x] 2.3 Update Mindbody route handler to map `MindbodyBooking` to `NormalizedInput` (mapping `client_email` → `email`, `client_id` → `mindbody_client_id`) and call `normalizeSignals`

## 3. Field Normalization

- [x] 3.1 Add `normalizeEmail` and `normalizePhone` helpers inside `src/lib/signals.ts`
- [x] 3.2 Add `FIELD_NORMALIZERS` map in `signals.ts` keyed by signal type, applying normalizers inside `normalizeSignals`
- [x] 3.3 Test that `email` signal values are lowercased and trimmed
- [x] 3.4 Test that `phone` signal values are E.164 formatted

## 4. Tests

- [x] 3.1 Full input with all signal fields non-null returns all signals
- [x] 3.2 Input with all nullable fields null or undefined returns empty array
- [x] 3.3 Partial input returns only non-null signals
- [x] 3.4 Shopify source maps correctly — `shopify_customer_id` present, no `mindbody_client_id`
- [x] 3.5 Mindbody source maps correctly — `mindbody_client_id` present, no `device_id`
- [x] 3.6 Every returned signal conforms to `{ type: string; value: string }`
