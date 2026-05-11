## ADDED Requirements

### Requirement: normalizeSignals accepts a uniform NormalizedInput type
The system SHALL define a `NormalizedInput` type with a `source` field and optional nullable signal fields (`email`, `phone`, `device_id`, `shopify_customer_id`, `mindbody_client_id`). Route handlers SHALL map their source-specific Zod payloads to this type before calling `normalizeSignals`.

#### Scenario: Shopify payload is mapped to NormalizedInput
- **WHEN** the Shopify route handler receives a valid `ShopifyOrder`
- **THEN** it SHALL construct a `NormalizedInput` with `source: "shopify"`, mapping `customer_id` to `shopify_customer_id` and passing `email`, `phone`, `device_id` directly

#### Scenario: Mindbody payload is mapped to NormalizedInput
- **WHEN** the Mindbody route handler receives a valid `MindbodyBooking`
- **THEN** it SHALL construct a `NormalizedInput` with `source: "mindbody"`, mapping `client_email` to `email` and `client_id` to `mindbody_client_id`

### Requirement: normalizeSignals extracts non-null signals without branching on source
The system SHALL implement `normalizeSignals(input: NormalizedInput): Signal[]` that filters null and undefined fields from the input and returns a `Signal[]` with no source-specific branching logic.

#### Scenario: All signal fields present returns full Signal array
- **WHEN** `normalizeSignals` is called with a `NormalizedInput` where all signal fields are non-null
- **THEN** it SHALL return a `Signal[]` with one entry per non-null field

#### Scenario: All nullable fields null returns empty array
- **WHEN** `normalizeSignals` is called with a `NormalizedInput` where all nullable signal fields are null or undefined
- **THEN** it SHALL return an empty `Signal[]`

#### Scenario: Partial input returns only present signals
- **WHEN** `normalizeSignals` is called with a `NormalizedInput` where only some signal fields are non-null
- **THEN** it SHALL return a `Signal[]` containing only the non-null entries

### Requirement: Returned signals conform to Signal type
Every element in the returned `Signal[]` SHALL have a `type` field (string) and a `value` field (string). No null values SHALL appear in the returned array.

#### Scenario: Returned signals have correct shape
- **WHEN** `normalizeSignals` returns a non-empty array
- **THEN** every element SHALL conform to `{ type: string; value: string }`
