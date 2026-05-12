# Spec: identity-pipeline

## Purpose

Defines the behaviour of the `identityResolution` function, which orchestrates the full identity pipeline: accepting a `NormalizedInput`, running signal normalization and customer ID lookup in sequence, and returning a single canonical customer ID string. This is the top-level entry point that composes signal-normalization, customer-id-lookup, and customer-identity-resolution into one cohesive operation.

## Requirements

### Requirement: identityResolution runs the full identity pipeline from a normalized input
The system SHALL accept a `NormalizedInput` and execute signal normalization, customer ID lookup, and identity resolution in sequence, returning a single canonical customer ID string.

#### Scenario: Valid input with no existing customer returns a new customer ID
- **WHEN** `identityResolution` is called with a `NormalizedInput` whose signals match no existing customer
- **THEN** it SHALL create a new `Customer` record and return its ID

---

#### Scenario: Valid input matching one existing customer returns that customer's ID
- **WHEN** `identityResolution` is called with a `NormalizedInput` whose signals match exactly one existing customer
- **THEN** it SHALL return that customer's ID without creating any new records

---

#### Scenario: Valid input matching multiple customers returns the first matched customer's ID
- **WHEN** `identityResolution` is called with a `NormalizedInput` whose signals match two or more existing customers
- **THEN** it SHALL return the first matched customer's ID

---

#### Scenario: Input with no extractable signals creates a new customer
- **WHEN** `identityResolution` is called with a `NormalizedInput` where all signal fields are null or absent
- **THEN** it SHALL create a new `Customer` record and return its ID
