# Spec: customer-identity-resolution

## Purpose

Defines the behaviour of the `resolveCustomerIdentity` function, which maps a set of incoming customer signal matches to a single canonical customer ID. When no existing customer is found a new profile is created; when one match exists it is returned directly; when multiple matches exist a pick-first merge conflict resolution strategy is applied.

## Requirements

### Requirement: resolveCustomerIdentity creates a new customer when no signals match
When no existing customer owns any of the incoming signals, the system SHALL create a new `Customer` record and return its ID.

#### Scenario: Zero matches returns a new customer ID
- **WHEN** `resolveCustomerIdentity` is called with an empty array
- **THEN** it SHALL create a new `Customer` record in the database and return that customer's ID as a string

---

### Requirement: resolveCustomerIdentity returns the matched customer ID for a single match
When exactly one existing customer matches the incoming signals, the system SHALL return that customer's ID without any database write.

#### Scenario: Single match returns the matched customer ID
- **WHEN** `resolveCustomerIdentity` is called with an array containing exactly one `CustomerSignalMatch`
- **THEN** it SHALL return the `customerId` from that match without creating or modifying any database records

---

### Requirement: resolveCustomerIdentity resolves merge conflicts by returning the first matched customer
When two or more existing customers match the incoming signals, the system SHALL return the `customerId` of the first entry in the matches array as a temporary resolution strategy.

#### Scenario: Multiple matches returns the first customer ID
- **WHEN** `resolveCustomerIdentity` is called with an array containing two or more `CustomerSignalMatch` entries
- **THEN** it SHALL return the `customerId` of `matches[0]` without creating or modifying any database records

#### Scenario: Merge conflict threshold is two or more matches
- **WHEN** `resolveCustomerIdentity` is called with exactly two `CustomerSignalMatch` entries
- **THEN** it SHALL apply the merge resolution strategy and return `matches[0].customerId`
