# Spec: Customer ID Lookup

## Purpose

Provides the `getCustomerIdsFromSignals` function, which resolves a list of identity signals (e.g. email, phone, Shopify customer ID) to the matching internal customer records. It queries the `IdentitySignal` table and returns one result per distinct matched customer, along with the specific signals that produced each match.

## Requirements

### Requirement: getCustomerIdsFromSignals returns matched customers with their matched signals
The system SHALL query the `IdentitySignal` table for all records matching any signal in the input and return a `CustomerSignalMatch[]` — one entry per distinct matched customer, each containing the customer ID and the list of signals that matched that customer.

#### Scenario: Single signal matches one customer
- **WHEN** `getCustomerIdsFromSignals` is called with one signal that matches an existing `IdentitySignal` record
- **THEN** it SHALL return an array with one `CustomerSignalMatch` containing that customer's ID and the matched signal

#### Scenario: Multiple signals match the same customer
- **WHEN** `getCustomerIdsFromSignals` is called with multiple signals that all belong to the same customer
- **THEN** it SHALL return an array with one `CustomerSignalMatch` containing that customer ID and all matched signals

#### Scenario: Signals match multiple distinct customers
- **WHEN** `getCustomerIdsFromSignals` is called with signals that match different customers
- **THEN** it SHALL return one `CustomerSignalMatch` per distinct customer, each with only the signals that matched that customer

#### Scenario: No signals match any customer
- **WHEN** `getCustomerIdsFromSignals` is called with signals that have no matching `IdentitySignal` records
- **THEN** it SHALL return an empty array

#### Scenario: Empty signal array returns empty result
- **WHEN** `getCustomerIdsFromSignals` is called with an empty array
- **THEN** it SHALL return an empty array without querying the database
