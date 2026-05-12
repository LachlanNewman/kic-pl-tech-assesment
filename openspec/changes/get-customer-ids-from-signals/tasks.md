## 1. Types

- [x] 1.1 Add `CustomerSignalMatch` type `{ customerId: string; matchedSignals: Signal[] }` to `src/types/index.ts`

## 2. Implementation

- [x] 2.1 Create `src/lib/identity.ts` with `getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]>`
- [x] 2.2 Short-circuit and return `[]` immediately when `signals` is empty
- [x] 2.3 Query `IdentitySignal` with a single `OR` filter, selecting `customerId`, `type`, and `value`
- [x] 2.4 Group results by `customerId` using a `Map`, accumulating matched signals per customer
- [x] 2.5 Return the map entries as `CustomerSignalMatch[]`

## 3. Tests

- [x] 3.1 Single signal matching one customer returns one match with that signal in `matchedSignals`
- [x] 3.2 Multiple signals matching the same customer returns one match with all matched signals
- [x] 3.3 Signals matching multiple distinct customers returns one match per customer with correct signals
- [x] 3.4 Signals with no matching records returns empty array
- [x] 3.5 Empty signal array returns empty array
