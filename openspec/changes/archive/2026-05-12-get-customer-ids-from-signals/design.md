## Context

Normalized signals are extracted from webhook payloads via `normalizeSignals`. The `IdentitySignal` table stores typed signal values linked to customer IDs with a `@@unique([type, value])` constraint — meaning each `(type, value)` pair maps to at most one customer. The lookup is a set of exact-match queries. When signals match multiple distinct customers, the caller needs to know not just which customers matched but which signals caused each match — this information drives conflict resolution upstream.

## Goals / Non-Goals

**Goals:**
- Implement `getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]>` in `src/lib/identity.ts`
- Return one `CustomerSignalMatch` per distinct matched customer, each containing the customer ID and the signals that matched it
- Add `CustomerSignalMatch` type to `src/types/index.ts`
- Return an empty array when no signals match or the input is empty

**Non-Goals:**
- Merging or resolving conflicts between multiple matched customers (caller's responsibility)
- Writing to the database
- Creating new customers

## Decisions

### Return type: `CustomerSignalMatch[]` not `string[]`

```typescript
type CustomerSignalMatch = {
  customerId: string;
  matchedSignals: Signal[];
};
```

Each entry groups the matched signals under their customer. When multiple customers are returned, the caller can inspect `matchedSignals` to understand the strength and nature of each match — e.g. a customer matched on both `email` and `phone` is a stronger match than one matched only on `device_id`.

### Single query, grouped in memory

A single Prisma query fetches all matching `IdentitySignal` rows in one round trip. Results are grouped by `customerId` in memory using a `Map<string, Signal[]>`:

```
prisma.identitySignal.findMany({
  where: { OR: signals.map(s => ({ type: s.type, value: s.value })) },
  select: { customerId: true, type: true, value: true },
})
→ group by customerId
→ map to CustomerSignalMatch[]
```

**Why not one query per signal**: N queries for N signals adds latency. The `@@index([value])` on `IdentitySignal` makes the single OR filter efficient.

### Empty input short-circuits

If `signals` is empty, return `[]` immediately without querying the database.

### Location: `src/lib/identity.ts`

Identity resolution logic belongs in `src/lib/` per project conventions. Prisma client imported from `src/lib/db.ts`.

## Risks / Trade-offs

- **Large signal arrays**: OR clause with many terms is a single query; not a concern at current max of 5 signal fields.
- **No match is not an error**: Empty result is valid — a new customer with no prior signals. Callers must handle this.
