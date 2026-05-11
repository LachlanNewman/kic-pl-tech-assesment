## ADDED Requirements

### Requirement: Shopify webhook payload is validated on ingestion
The system SHALL validate all incoming `POST /api/webhooks/shopify` request bodies against the `ShopifyOrderSchema` Zod schema before any further processing occurs.

#### Scenario: Valid Shopify payload is accepted
- **WHEN** a POST request is received at `/api/webhooks/shopify` with a body matching `ShopifyOrderSchema`
- **THEN** the system SHALL return HTTP 200 with `{ "received": true }`

#### Scenario: Invalid Shopify payload is rejected
- **WHEN** a POST request is received at `/api/webhooks/shopify` with a body that does not match `ShopifyOrderSchema`
- **THEN** the system SHALL return HTTP 400 with a JSON body containing `error` and `details` fields

#### Scenario: Shopify guest checkout payload (null customer signals) is accepted
- **WHEN** a POST request is received with `customer_id`, `email`, `phone`, and `device_id` all set to `null`
- **THEN** the system SHALL return HTTP 200, as nullable fields are valid

### Requirement: Mindbody webhook payload is validated on ingestion
The system SHALL validate all incoming `POST /api/webhooks/mindbody` request bodies against the `MindbodyBookingSchema` Zod schema before any further processing occurs.

#### Scenario: Valid Mindbody payload is accepted
- **WHEN** a POST request is received at `/api/webhooks/mindbody` with a body matching `MindbodyBookingSchema`
- **THEN** the system SHALL return HTTP 200 with `{ "received": true }`

#### Scenario: Invalid Mindbody payload is rejected
- **WHEN** a POST request is received at `/api/webhooks/mindbody` with a body that does not match `MindbodyBookingSchema`
- **THEN** the system SHALL return HTTP 400 with a JSON body containing `error` and `details` fields

#### Scenario: Mindbody payload missing required client_id is rejected
- **WHEN** a POST request is received at `/api/webhooks/mindbody` with `client_id` absent or null
- **THEN** the system SHALL return HTTP 400

### Requirement: Zod schemas export inferred TypeScript types
The system SHALL export `ShopifyOrder` and `MindbodyBooking` TypeScript types inferred from their respective Zod schemas, so downstream code can consume typed values without importing Zod directly.

#### Scenario: Inferred types are available as named exports
- **WHEN** another module imports from `@/types`
- **THEN** it SHALL be able to import `ShopifyOrder` and `MindbodyBooking` as TypeScript types, and `ShopifyOrderSchema` and `MindbodyBookingSchema` as Zod schemas
