## 1. Types

- [ ] 1.1 Add `CustomerSignalMatch` type `{ customerId: string; matchedSignals: Signal[] }` to `src/types/index.ts`

## 2. Implementation

- [ ] 2.1 Create `src/lib/identity.ts` with `getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]>`
- [ ] 2.2 Short-circuit and return `[]` immediately when `signals` is empty
- [ ] 2.3 Query `IdentitySignal` with a single `OR` filter, selecting `customerId`, `type`, and `value`
- [ ] 2.4 Group results by `customerId` using a `Map`, accumulating matched signals per customer
- [ ] 2.5 Return the map entries as `CustomerSignalMatch[]`

## 3. Tests

- [ ] 3.1 Single signal matching one customer returns one match with that signal in `matchedSignals`
- [ ] 3.2 Multiple signals matching the same customer returns one match with all matched signals
- [ ] 3.3 Signals matching multiple distinct customers returns one match per customer with correct signals
- [ ] 3.4 Signals with no matching records returns empty array
- [ ] 3.5 Empty signal array returns empty array
