# Architecture

Assumptions -> should scale to ~1million users.

## 1. Problem Statement

_Describe the fragmented customer identity problem across KIC's systems and why it matters. Why is a shared email or phone number insufficient as a single canonical key? What are the business consequences of unresolved identity — in CRM, in marketing attribution, in the studio experience?_

KIC operates across three systems — the KICApp, Shopify, and Mindbody — each of which captures a fragment of customer identity independently. The same real person can appear with different emails across platforms, no email at all in a guest checkout, and no shared key between any two systems. There is currently no layer that links these records together, which means the business cannot act on the complete relationship it has with a customer.

### Why a single signal is insufficient as a canonical key

No single signal is universal or stable enough to serve as the canonical identifier:

- **Email** is the most commonly available signal, but the same person may register with different emails across platforms (e.g. `jane.doe@example.com` in Shopify, `jane.doe@gmail.com` in Mindbody), and email is entirely absent in guest checkouts.
- **Phone** is high-confidence and normalised to E.164, but it is not always captured — guest checkouts and some app sessions provide no phone at all.
- **Device ID** is present in app and browser events but is probabilistic — a shared device (e.g. a studio iPad) or a reinstall can produce false links between distinct customers.
- **Platform IDs** (Shopify customer ID, Mindbody client ID) are stable within their own system but have no meaning outside it.

Because no signal is both universal and unambiguous, a single canonical key cannot exist. The solution is a typed, multi-value signal model: a canonical profile record acts as the anchor, and each observed signal is stored as a row — allowing one profile to accumulate signals from multiple systems over time.

### Business consequences of unresolved identity

**CRM**: The same customer appears as multiple separate contact records across systems. Support staff and account managers cannot see a customer's full history — a Mindbody member who is also a Shopify buyer appears as two unrelated people.

**Marketing attribution**: Cross-system behavior is invisible. If a customer clicks a paid ad, then books a studio class in Mindbody two days later, the conversion is unattributed because the click ID and the Mindbody booking are never linked. Campaigns appear to underperform and budget gets misallocated. Guest checkout revenue ($0 attributed to any known profile) compounds the problem.

**Studio and personalisation experience**: Without a unified view, targeted personalisation is impossible. KIC cannot identify that the member showing up to a Reformer Pilates class also purchased resistance bands on Shopify last week, or that a lapsed studio member is still highly active in the app — signals that would otherwise inform re-engagement strategy.

**Off Boarding Customers**: GDPR requires that all individuals have the right to access, rectify, erase ("right to be forgotten"), restrict processing, and request portability of their personal data. Storing multiple events with no canonical identified makes it difficult to comply with this requirement due to having to delete multiple records without knowing relationships.

---

## 2. Build vs Buy

_Would you build this identity resolution layer, or buy a Customer Data Platform (CDP) — and why? What factors drive that call: cost, control, time-to-value, team capability, data residency, or something else? If you'd buy, which product and why; if you'd build, what does that imply about ongoing maintenance and ownership?_

**Recommendation: do not build identity resolution from scratch — lean on a third-party service.**

Identity resolution algorithms are deceptively complex. A production-grade implementation requires either **probabilistic record linkage** (Fellegi-Sunter or similar Bayesian matching models) or **machine learning approaches** (entity embedding, blocking strategies, classifier training on labelled match/non-match pairs). Beyond choosing an algorithm, significant ongoing effort goes into tuning match thresholds, handling edge cases (shared devices, name variations, email aliases), and validating that resolution quality is actually improving as data grows. This is a specialised domain with a long tail of failure modes — building it in-house trades a vendor risk for a sustained engineering cost with no product differentiation upside.

### Preferred option: self-hosted open-source service

Self-hosting an open-source identity resolution or CDP platform (e.g. Rudderstack open-source, Splink, or a comparable tool) strikes the best balance of cost, control, and speed to value:

- **Data ownership**: All PII — email, phone, platform IDs — remains in infrastructure you control. This directly satisfies Australian Privacy Act / Australian Privacy Principles obligations around data residency, without relying on contractual commitments from a foreign cloud vendor.
- **Algorithm transparency**: Because the resolution logic is open source, engineers can read exactly how merge decisions are made, reproduce individual resolutions, and identify systematic errors. A bad merge can be traced to a specific rule or weight — not to a black-box SaaS decision you cannot inspect.
- **No per-event pricing**: Self-hosted tooling has infrastructure costs, not usage costs. At 1 million users with high event volume, that economics is preferable to per-MTU or per-event SaaS pricing that scales non-linearly.

The tradeoff is operational ownership: the team must run, patch, and scale the platform. This is a real cost, but it is bounded and predictable.

### Alternative: managed (bought) CDP

Purchasing a managed CDP (e.g. Segment, mParticle, Lytics) offers faster time-to-value and removes operational burden, but introduces risks that need explicit mitigation:

- **Vendor lock-in**: Canonical profile IDs become the vendor's opaque identifiers, referenced across your CRM, marketing tools, and event history. Migrating away requires exporting the full identity graph (if the vendor permits it) and remapping every profile reference in every downstream system — a migration that grows more expensive the longer you remain on the platform.
- **Merge opacity**: Managed CDPs typically do not expose the reasoning behind individual identity merge decisions. A bad merge is hard to investigate and may be irreversible without vendor support.
- **Data residency risk**: Most managed CDPs store data on US cloud infrastructure. This creates exposure under the Privacy Act that cannot be resolved by contract alone.

Most managed services do provide data export or replay capabilities, which reduces — but does not eliminate — the exit risk. The key concern is that export policies can change after a pricing negotiation or acquisition, and the cost of discovering that at migration time is high.

### Summary

The self-hosted open-source path is the recommended starting point. It removes the algorithmic build burden, preserves data ownership and algorithm observability, and keeps exit costs low. The managed CDP path is viable if operational simplicity is the overriding constraint, provided the team explicitly negotiates and validates data portability guarantees before committing.

---

## 3. Proposed Data Model

_Define the unified customer profile and how it relates to identity signals and source events. A diagram or structured description is fine. Consider: what is the canonical record, how are signals stored as typed edges, and how do source events reference the profile rather than the signal?_

The model has five entities: `Customer`, `IdentitySignal`, `Event`, `MergeLog`, and two junction tables (`MergeIdentitySignal`, `MergeEvent`). Merge provenance is tracked in a dedicated `MergeLog` record — rather than stamping `mergedInto` inline on signals and events — giving a complete, queryable audit trail of every merge decision without mutating the original signal or event rows.

### Customer

The canonical customer record. Intentionally thin — it is an identity anchor, not a contact record. Source system details (name, address, membership status) remain in their origin systems and are accessible via the platform IDs stored as signals.

```
Customer {
  id         cuid (PK)
  createdAt  DateTime
  updatedAt  DateTime
  mergedInto String?  (FK to Customer.id — self-referential; set on the losing customer when merged)
}
```

When `mergedInto` is set, this customer is a merge loser. All subsequent lookups resolve through the winner. The self-referential relation allows chains to be traversed to find the ultimate canonical record.

### IdentitySignal

A typed identity signal observed for a customer. One customer can have many signals across multiple types. This is the primary lookup table — incoming events are matched against signals to find or create the canonical customer.

```
IdentitySignal {
  id         cuid (PK)
  type       String  (e.g. "email", "phone", "device_id", "shopify_customer_id" — open string)
  value      String
  confidence Int     (3 = high, 2 = medium, 1 = low — drives merge threshold decisions)
  customerId String  (FK to Customer.id)
  createdAt  DateTime

  @@unique([type, value])
  @@index([value])
}
```

The `@@unique([type, value])` constraint enforces that each signal value is owned by exactly one customer at any time. `confidence` allows the resolution layer to weight high-fidelity signals (phone, platform ID) differently from probabilistic ones (device ID, browser fingerprint) when deciding whether to merge.

### Event

The raw webhook payload, resolved to a canonical customer at ingestion time. The event references the customer — not the signal — so future lookups always resolve to the canonical record.

```
Event {
  id         cuid (PK)
  source     String    ("shopify" | "mindbody")
  type       String    (e.g. "order.created", "booking.created")
  externalId String    @unique (source system's own event ID — idempotency guard)
  payload    String    (raw JSON webhook body)
  customerId String    (FK to Customer.id — the resolved customer at ingestion time)
  occurredAt DateTime
  createdAt  DateTime
}
```

`externalId` is globally unique — this prevents duplicate webhook deliveries from creating duplicate records.

### MergeLog

A structured record of every merge decision. Created whenever two `Customer` records are unified. Captures the winner, the loser, the signal that triggered the merge, and the confidence level at the time of the decision — providing the provenance needed to review or reverse a merge.

```
MergeLog {
  id                 cuid (PK)
  winnerId           String  (FK to Customer.id)
  loserId            String  (FK to Customer.id)
  confidenceLevel    Int     (the confidence of the triggering signal at merge time)
  createdAt          DateTime
}
```

### MergeIdentitySignal / MergeEvent (junction tables)

These join tables record which signals and events were associated with the losing customer at the time of a merge, linking them to the `MergeLog` that caused the change. This preserves full lineage without mutating the original `IdentitySignal` or `Event` rows.

```
MergeIdentitySignal {
  id               cuid (PK)
  mergeLogId       String  (FK to MergeLog.id)
  identitySignalId String  (FK to IdentitySignal.id)
  createdAt        DateTime
}

MergeEvent {
  id         cuid (PK)
  mergeLogId String  (FK to MergeLog.id)
  eventId    String  (FK to Event.id)
  createdAt  DateTime
}
```

### Entity relationships

```
Customer        ──< IdentitySignal       (via customerId)
Customer        ──< Event                (via customerId)
Customer        ──  Customer             (via mergedInto — self-referential, loser → winner)
Customer        ──< MergeLog             (as winner, via winnerId)
Customer        ──< MergeLog             (as loser, via loserId)
IdentitySignal  ──< MergeLog             (as triggering signal, via triggeringSignalId)
MergeLog        ──< MergeIdentitySignal  (junction — signals affected by the merge)
MergeLog        ──< MergeEvent           (junction — events affected by the merge)
```

---

## 4. Integration Points

_For each of KICApp, Shopify, Mindbody — how does data flow into the central layer? What signals does each system provide, and what are the integration patterns (webhooks, polling, SDK instrumentation, server-side event forwarding)?_

Both Shopify and Mindbody push events to KIC via webhooks. KIC has no control over the retry behaviour or delivery guarantees of either system — if the receiving endpoint is slow or unavailable, events may be retried, delivered out of order, or dropped entirely. This makes the ingestion layer a critical failure point.

### Production pattern

At 1 million users, webhook ingestion must be isolated from the user-facing application. A flash sale or high-traffic event can generate thousands of simultaneous Shopify webhooks — if ingestion shares resources with the app, both degrade together. The architecture separates ingestion, queuing, and processing into three independent layers:

```
Shopify / Mindbody
       │
       ▼
Lambda (webhook receiver)
  - Enqueues raw payload to SQS
  - Returns 200 immediately
  - No payload validation — keeps ack latency minimal
       │
       ▼
SQS queue + Dead-letter queue (DLQ)
  - Durable storage of raw events
  - Retryability if consumer is down
  - Poison messages (repeatedly failing payloads) routed to DLQ for manual inspection
       │
       ▼
Always-on consumer service (continuously polling SQS)
  - Validates payload
  - Runs identity resolution
  - Idempotency check on external_id + source
  - Persistent database connection pool (efficient at scale)
```

**Why Lambda for ingestion**: The receiver is stateless and invoked frequently enough at 1 million users that cold starts (200-500ms) are rare in practice. Shopify's 5-second timeout leaves ample headroom. Lambda scales automatically under burst load with no provisioning required.

**Why an always-on consumer**: A long-running process maintains a persistent database connection pool — critical at scale. Lambda per-invocation connection overhead would hammer the database. An always-on consumer also has more predictable throughput and lower per-message cost at high volume.

**Why payload validation belongs in the consumer, not the receiver**: Keeping the Lambda receiver minimal (enqueue + ack only) means it never fails due to business logic errors. A malformed payload lands in the consumer, fails validation, and routes to the DLQ — inspectable and replayable without data loss.

### Assessment simplification

For the purpose of this assessment, the queue layer is omitted. The API route handlers at `POST /api/webhooks/shopify` and `POST /api/webhooks/mindbody` act as the consumer directly — receiving, validating, and processing events synchronously. The idempotency guard on `external_id` + `source` remains in place.

### Shopify

- **Pattern**: Webhook push (`order.created`)
- **Signals provided**: `shopify_customer_id`, `email`, `phone`, `device_id`
- **Notes**: Any signal can be null — guest checkouts provide only `device_id`. `shopify_customer_id` is null for guest orders.

### Mindbody

- **Pattern**: Webhook push (`booking.created`)
- **Signals provided**: `mindbody_client_id`, `client_email`, `phone`
- **Notes**: No device signal. Email field is named `client_email` rather than `email` — requires normalisation on ingestion.

### KICApp

- **Pattern**: Not in scope for this assessment. In production, the app would instrument events server-side (session start, workout completion, content engagement) and forward them via an internal event pipeline, providing `app_user_id` and `device_id` signals.

---

## 5. Identity Resolution

_How does the system resolve events to canonical profiles when no single shared key exists?_

### Resolution algorithm

When an event arrives, resolution runs in five sequential steps:

**1. Idempotency check** — the event's `externalId` is looked up first. If a record already exists for that ID, the existing `customerId` is returned immediately and no further processing occurs. This makes webhook re-delivery a no-op.

**2. Signal extraction and normalisation** — the payload is normalised into a typed signal list (e.g. `[{ type: "email", value: "jane@example.com" }, { type: "phone", value: "+61400000000" }]`). Mindbody's `client_email` field is remapped to `email`; phone numbers are passed through as-is (E.164 normalisation is applied upstream by the source system). Null signals are dropped — a missing field produces no signal entry.

**3. Database lookup** — all non-null signal values are queried against `IdentitySignal` in a single `WHERE (type, value) IN (...)` statement. Each matching row carries the `customerId` it belongs to and its stored `confidence` score. This is the only database read in the hot path.

**4. Grouping and confidence aggregation** — matches are grouped by `customerId`. Each customer's score is the **sum** of the confidence scores of every signal that matched. A customer matched on both `phone` (confidence 3) and `email` (confidence 3) accumulates a score of 6; one matched only on `device_id` (confidence 2) scores 2. Customers whose total score is below the threshold of **3** are excluded.

**5. Branch on match count** (see below).

### Match outcomes

| Outcome          | Condition                             | Action                                                       |
| ---------------- | ------------------------------------- | ------------------------------------------------------------ |
| No profile found | Zero customers above threshold        | Create a new `Customer`, write all signals, write the event  |
| Single match     | Exactly one customer above threshold  | Attach any new signals to that customer, write the event     |
| Collision        | Two or more customers above threshold | Merge losers into winner, then write the event to the winner |

### Deterministic vs probabilistic signals

Signal confidence is declared in `signalConfig.ts` and stored on each `IdentitySignal` row at write time:

| Signal type           | Confidence | Rationale                                               |
| --------------------- | ---------- | ------------------------------------------------------- |
| `email`               | 3 — HIGH   | Stable, explicit identifier; almost always intentional  |
| `phone`               | 3 — HIGH   | E.164-normalised; one person, one number in practice    |
| `shopify_customer_id` | 3 — HIGH   | Opaque platform ID; one account, one value              |
| `mindbody_client_id`  | 3 — HIGH   | Same — stable within Mindbody's system                  |
| `device_id`           | 2 — MEDIUM | Probabilistic; a studio iPad or a reinstall can collide |
| Unknown types         | 1 — LOW    | Safe fallback for signals not yet classified            |

The merge threshold is set at **3**, which means a single HIGH signal is sufficient to claim a profile. In a production system this threshold should be configurable and not hard coded. A single MEDIUM or LOW signal is not — a customer matched only on `device_id` (score 2) is treated as insufficient evidence and a new profile is created. Two MEDIUM signals from the same customer (score 4) would exceed the threshold, but that combination does not currently arise for a single-source event.

This asymmetry is intentional: false negatives (failing to merge two records that belong together) are far cheaper to correct than false positives (merging two genuinely separate people). A studio iPad shared across multiple members would match many profiles on `device_id` alone — the threshold prevents that from triggering a cascade of incorrect merges.

### Cascading merges

When a new event's signals match **two or more** existing profiles above threshold, those profiles must be unified. The resolution picks a winner — the customer with the highest accumulated confidence score across their matched signals — and all others become losers.

For each loser, inside a single database transaction:

1. **Signal reassignment** — all `IdentitySignal` rows belonging to the loser have their `customerId` updated to the winner. The `@@unique([type, value])` constraint means each signal value can only ever belong to one profile; reassignment is safe because the winner did not already hold those values (if it had, they would have been the same profile).
2. **Event reassignment** — all `Event` rows belonging to the loser have their `customerId` updated to the winner. After this point, any query against the winner's profile returns the full event history of both the original winner and every loser.
3. **MergeLog creation** — a `MergeLog` record is written capturing the winner, the loser, the loser's signals, and the loser's events at the moment of the merge (see provenance below).
4. **Loser tombstoning** — the loser `Customer` row has its `mergedInto` field set to the winner's ID. The loser record is never deleted; it acts as a permanent pointer so any external reference to the old ID can be resolved to the canonical winner.

The transaction wraps all losers together, so a three-way collision either fully resolves or fully rolls back — no partial merge state is possible.

### Merge provenance

Every merge decision is recorded in `MergeLog`:

```
MergeLog {
  id               — unique ID for this merge event
  winnerId         — the customer that survives
  loserId          — the customer that was absorbed
  confidenceLevel  — the winner's accumulated confidence score at decision time
  createdAt        — wall-clock timestamp of the merge

  mergedSignals[]  — via MergeIdentitySignal: the loser's signals at time of merge
  mergedEvents[]   — via MergeEvent: the loser's events at time of merge
}
```

This record answers the key audit questions without mutating any original row:

- **What caused the merge?** — `confidenceLevel` and the signals listed in `mergedSignals` show which signal values overlapped and what weight they carried.
- **When did it happen?** — `createdAt` timestamps the decision.
- **What moved?** — `mergedSignals` and `mergedEvents` are a point-in-time snapshot of the loser's state, so the lineage of every reassigned signal and event is recoverable even after the `customerId` columns have been updated.
- **Can it be reversed?** — yes. A reversal re-creates the loser profile, re-points the listed signals and events back, and clears `mergedInto` on the loser row. The `MergeLog` provides exactly the data needed to execute that reversal without guessing.

The `triggeringSignalId` column is present in the schema but currently populated as the first matched signal on the loser — a future refinement would set this to the specific signal that caused the threshold to be crossed.

### Accommodating the full KIC signal landscape

The `SIGNAL_TYPE_CONFIDENCE` map is an open string registry — any signal type can be added without a schema migration. The current implementation handles the signals present in Shopify and Mindbody webhooks. The broader KIC landscape requires the following classification:

| Signal                | Stability     | Recommended confidence | Notes                                                                          |
| --------------------- | ------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `email`               | Stable        | 3 — HIGH               | Already implemented                                                            |
| `phone`               | Stable        | 3 — HIGH               | Already implemented                                                            |
| `shopify_customer_id` | Stable        | 3 — HIGH               | Already implemented                                                            |
| `mindbody_client_id`  | Stable        | 3 — HIGH               | Already implemented                                                            |
| `app_user_id`         | Stable        | 3 — HIGH               | Add when KICApp pipeline is in scope                                           |
| `device_id`           | Probabilistic | 2 — MEDIUM             | Already implemented; studio iPad risk noted                                    |
| `browser_fingerprint` | Probabilistic | 2 — MEDIUM             | Add to `signalConfig.ts`; same shared-device caveat                            |
| `fbclid`              | Short-lived   | 1 — LOW                | Facebook click IDs expire and are not stable across sessions                   |
| `gclid`               | Short-lived   | 1 — LOW                | Google click IDs same; useful for attribution lookups but not identity anchors |

Short-lived signals (`fbclid`, `gclid`) are stored as signals for attribution purposes — they can link a paid click to a subsequent purchase — but their LOW confidence means they never independently trigger a merge. They contribute to a cumulative score only when another signal already has the profile above threshold. This prevents a recycled or shared click ID from incorrectly linking two separate customers.

---

## 6. Failure Modes

_Identify at least four failure scenarios and how the architecture mitigates each. Consider: duplicate webhooks, downstream outages, schema drift in source payloads, identity conflicts (two real people sharing a device), a bad merge that incorrectly unified two separate customers, and what happens when it goes out against a stale identity snapshot._

### 1. Duplicate webhook delivery

**Scenario**: Shopify or Mindbody retries a webhook after a slow response or a network timeout, delivering the same event payload more than once.

**Mitigation**: The first step of `identityResolution` is a lookup against the `Event` table by `externalId` — the source system's own event identifier, stored with a `@unique` constraint. If a record already exists for that `externalId`, the existing `customerId` is returned immediately and no further processing occurs. The duplicate webhook is acknowledged with a 200 and silently discarded. No signal is written twice, no customer is created twice, and the merge path is never re-entered for an already-processed event.

This guard is in place in the current implementation (`findEventByExternalId` is the first call in `identityResolution`).

### 2. Application downtime during webhook delivery

**Scenario**: The processing service is unavailable — deploying, crashed, or experiencing a database outage — while Shopify or Mindbody is sending events. Both systems have short retry windows and will eventually stop retrying, causing events to be permanently lost.

**Mitigation**: In the production architecture described in section 4, the webhook receiver is a minimal Lambda function whose only job is to enqueue the raw payload into SQS and return a 200 immediately. The Lambda itself has no database dependency and is nearly impossible to take down during a normal deployment. The SQS queue holds events durably for up to 14 days. The consumer service — which runs identity resolution and writes to the database — can be restarted, redeployed, or scaled independently without any events being dropped. When it comes back up it simply continues draining the queue from where it left off.

For the assessment, the queue layer is omitted and routes process events synchronously. In that context, downtime during delivery does risk event loss — this is a known and accepted simplification.

### 3. Schema drift in source payloads

**Scenario**: Shopify or Mindbody changes their webhook payload structure — renames a field, removes a required field, or adds a new required field — without coordinating with KIC. Events that no longer match the expected schema arrive at the consumer.

**Mitigation**: Incoming payloads are validated against strict Zod schemas (`ShopifyOrderSchema`, `MindbodyBookingSchema`) at the boundary of the consumer before any business logic runs. A payload that fails validation is rejected with a structured error log rather than silently ignored or partially processed.

In the production queue-based architecture, a validation failure routes the raw message to the **Dead Letter Queue (DLQ)** rather than dropping it. This achieves two things:

- **Alerting**: DLQ depth is monitored; a sudden spike triggers an alert, notifying the team that a schema change has occurred upstream.
- **Replayability**: The original raw payloads sit in the DLQ untouched. Once the Zod schema is updated to match the new structure and the consumer is redeployed, the DLQ can be replayed — every event that failed validation is reprocessed in order, with no data loss.

This means a schema change from Shopify is a recoverable event, not a data loss event, provided the DLQ is not purged before the schema is updated.

### 4. Identity conflict — two real people sharing a signal

**Scenario**: Two distinct customers share a `device_id` — for example, a studio iPad used for check-ins, or a family member using the same phone. A new event arrives with that `device_id`, and the system finds two profiles that both match the same signal. Merging them would incorrectly unify two separate people.

**Mitigation**: The confidence threshold is the primary guard. `device_id` carries a MEDIUM confidence score of 2, and the merge threshold is 3. A match on `device_id` alone produces a cumulative score of 2 — below threshold — so no merge is triggered and a new profile is created instead. Two separate customers matched only on a shared `device_id` will never be automatically unified.

A secondary mitigation is a **manual merge review interface**. For cases where the algorithm cannot be certain — for instance, two profiles that share a `device_id` and an `email` but where the email could plausibly belong to two people at the same address — an internal tool can surface these as candidate matches for a human to accept or reject. Automated merges are only performed when cumulative confidence is unambiguous; borderline cases are held for review rather than resolved speculatively.

### 5. Bad merge — two separate customers incorrectly unified

**Scenario**: Two distinct customers happen to share a high-confidence signal — for example, one person changes their phone number and the new owner of that number later registers. The system merges the two profiles because the phone signal matches, incorrectly combining their event histories, signals, and membership records.

**Mitigation**: Every merge is recorded in `MergeLog` with a full point-in-time snapshot:

- `winnerId` and `loserId` — which profiles were involved
- `confidenceLevel` — the evidence strength at decision time
- `mergedSignals` — every signal the loser held at the time of the merge, via `MergeIdentitySignal`
- `mergedEvents` — every event the loser held at the time of the merge, via `MergeEvent`

A reversal procedure reads this log and executes the inverse operations in a transaction:

1. Re-point each signal listed in `mergedSignals` back to the loser's `customerId`.
2. Re-point each event listed in `mergedEvents` back to the loser's `customerId`.
3. Clear `mergedInto` on the loser customer.

Because the original signal and event rows were never deleted — only their `customerId` was updated — the reversal is lossless. No data needs to be reconstructed from backups.

---

## 7. Rollout Strategy

_How would you introduce this without breaking existing integrations? Consider shadow mode, feature flags, phased cutover, and how you'd validate identity resolution accuracy before making it load-bearing for CRM or marketing sends._

The rollout runs in four phases: shadow capture, internal validation, limited external rollout, and full cutover. No existing integrations are touched until phase 4.

### Phase 1 — Shadow capture (no processing)

Configure Shopify and Mindbody webhooks to fan out to two destinations simultaneously: the existing (current) handler, and a new Lambda that does nothing except write the raw payload to an S3 bucket. The current system continues operating entirely unchanged — no identity resolution runs, no new database is written to.

The S3 bucket accumulates a corpus of real production payloads. This corpus is the foundation for everything that follows: it captures genuine signal diversity (guest checkouts, phone-only bookings, duplicate emails across systems), which synthetic test data cannot reproduce. It also establishes an immutable replay source — the same payloads can be run through the algorithm repeatedly as thresholds are tuned.

This phase can run for days to weeks. The only cost is S3 storage and the fanout Lambda.

### Phase 2 — Internal validation

Replay the S3 corpus through the identity resolution pipeline in a staging environment and measure the output. At this stage, the audience is KIC staff — people whose Shopify and Mindbody records are known.

**The gap this phase addresses: how do you know whether the resolution is correct?**

Without a ground truth, accuracy cannot be measured — only inspected. Three complementary approaches establish that ground truth:

**Seeded test accounts**: Before replay begins, create controlled test identities: a staff member registers in Shopify with `alice@kic.com` and in Mindbody with the same mobile number but a different email. The expected resolution output is known — one merged profile. If the algorithm produces two profiles or merges Alice with someone else, a specific bug is identified. These seeded cases give binary pass/fail signal.

**Signal-per-profile distribution**: After replay, inspect the distribution of how many signals each resolved profile holds. A healthy resolution produces a spread — many single-signal profiles (guests, one-time buyers) and a meaningful tail of profiles with 3–5 signals (cross-platform members). A distribution where almost everything is single-signal means the algorithm is under-merging (thresholds too high). A distribution where a small number of profiles hold hundreds of signals means a shared-device signal is acting as a super-connector and incorrectly collapsing many real customers into one — over-merging.

**Manual sampling of merges**: For each `MergeLog` entry produced during replay, inspect a random sample of 50–100. The reviewer checks: does the winner and loser appear to be the same real person, based on their signals and event history? Merge logs that look wrong — different names, different cities, conflicting booking patterns — indicate a threshold or confidence score that needs adjustment. This is the primary tool for catching false positives before they affect real customers.

**Cross-source match rate**: Track what percentage of Mindbody profiles were linked to at least one Shopify profile after replay. For KIC's customer base, this rate should be non-trivial but well below 100%. A rate of 0% means resolution is not working at all. A rate of 99% means the algorithm is over-eager. The business can set an expectation — "we believe roughly 40% of studio members are also Shopify buyers" — and use that as a sanity bound.

Iterate on `SIGNAL_TYPE_CONFIDENCE` values and `CONFIDENCE_THRESHOLD` using the S3 corpus as the stable input. Each iteration is fully repeatable: wipe the staging database, replay the corpus, measure the four indicators above, adjust, repeat.

### Phase 3 — Limited external rollout (read-only identity layer)

Once the validation metrics from phase 2 are stable, enable live identity resolution for a small slice of real incoming traffic — for example, 5–10% of Shopify webhooks, or a single geographic region if Mindbody has regional segmentation. The identity layer runs in **read-only mode**: it resolves and records profiles, but no downstream system (CRM, marketing, personalisation) reads from it yet.

Continue monitoring the four indicators from phase 2 on live traffic. Pay particular attention to:

- **Merge rate spikes**: A sudden increase in merges per hour suggests a signal collision — a shared device ID or a batch import that loaded many customers with the same placeholder email.
- **DLQ depth**: Schema drift from either source system will appear here before it affects data quality.
- **Conflict rate**: How often does a single event match two or more profiles above threshold? A rising conflict rate may indicate thresholds need tightening before the layer becomes load-bearing.

No customer-facing behaviour changes in this phase. Any bad merges are caught and corrected using the MergeLog reversal procedure.

### Phase 4 — Full cutover

Once the conflict rate and manual sampling results are within acceptable bounds across a representative traffic sample, the identity layer becomes load-bearing:

1. All webhook traffic is routed through identity resolution.
2. CRM tooling is pointed at the unified `Customer` table as its source of truth for profile lookups.
3. Marketing sends begin using resolved profile IDs for segmentation and attribution.

At this point, the identity layer is the system of record. The S3 corpus from phase 1 is retained indefinitely — it can be used to re-validate after any future threshold change or algorithm update without needing to wait for live traffic to accumulate.

---

## 8. "We Miss You" Campaign — Worked Example

_Trace this specific use case end-to-end through your proposed architecture: Marketing wants to send a re-engagement email to members who have lapsed from studio bookings but remain active in the app, with a discount code valid in both Shopify and at the studio._

_Walk through: how the system knows these are the same person (they may have different emails in Mindbody vs the app), how the lapse signal is detected, how the discount code is issued and made valid across both systems, and what happens if the identity resolution was wrong — the wrong person gets the email or the discount is redeemed by someone else._

### How the system knows they are the same person

Consider a customer — call her Maya — who books studio classes via Mindbody and uses the KICApp daily. In Mindbody she registered with `maya.smith@gmail.com`; in the app she signed up with `maya@icloud.com`. The emails do not match. However, both systems captured the same mobile number: `+61412000000`.

When Maya's first Mindbody booking arrived, identity resolution extracted `mindbody_client_id`, `phone`, and `client_email` as signals and created a new `Customer` record. When her first KICApp session event arrived, resolution extracted `app_user_id`, `device_id`, and `phone`. The `phone` signal matched the existing `IdentitySignal` row with confidence 3 — above the threshold — so her app profile was merged into her Mindbody profile rather than creating a second record.

After the merge, the single `Customer` record holds four signals:

```
{ type: "mindbody_client_id", value: "mb-9921",          confidence: 3 }
{ type: "phone",              value: "+61412000000",      confidence: 3 }
{ type: "email",              value: "maya.smith@gmail.com", confidence: 3 }
{ type: "app_user_id",        value: "app-4471",          confidence: 3 }
{ type: "email",              value: "maya@icloud.com",   confidence: 3 }
{ type: "device_id",          value: "dev-ab12",          confidence: 2 }
```

Both emails are owned by the same `customerId`. The `Event` table holds both her Mindbody bookings and her KICApp sessions under the same record.

### Detecting the lapse

The campaign query runs against the `Event` table, grouped by `customerId` and looks for differences in time between events from KIC app and events from the studio app above a threshold and returns a list of customer ids.

### Retrieving the addresses and issuing the discount

For each qualifying `customerId`, the campaign service queries `IdentitySignal` for all signals of type `email`.

For Maya this returns two rows: `maya.smith@gmail.com` and `maya@icloud.com`. The discount code is sent to **both addresses**. Because the identity layer has resolved both emails to the same person, there is no risk of the same person receiving two different codes — one code is issued, and both sends reference it.

The discount code must be valid in both Shopify and at the studio. This requires issuing it in both systems:

- **Shopify**: Create a discount code via the Shopify Admin API, scoped to the resolved `shopify_customer_id` signal if one exists, or as a one-time use code if the customer has no Shopify account.
- **Mindbody**: Create a corresponding promotional pricing option or credit via the Mindbody API, associated with the resolved `mindbody_client_id`.

Both the Shopify discount ID and the Mindbody promotion ID are stored against the campaign send record alongside the `customerId`, so either can be revoked if needed.

### What happens if the identity resolution was wrong

Suppose Maya's `phone` signal was entered incorrectly and actually belongs to a different person — call her Sophie. Maya and Sophie's profiles were merged because they share the same phone number in the database, but they are two genuinely separate people. The campaign runs and sends the "We Miss You" code to all emails on the merged profile: `maya.smith@gmail.com`, `maya@icloud.com`, and `sophie.jones@example.com`. Sophie receives an email not intended for her and redeems the discount at the studio.

**Detection**: Sophie contacts support confused about the email. Support looks up Sophie's `customerId`, sees a `MergeLog` entry, and identifies the bad merge — the linking signal was `phone`, but the phone number in Mindbody was a data-entry error.

**Reversal**: Support triggers the merge reversal procedure (described in section 6, failure mode 5), which re-splits Maya and Sophie into separate `Customer` records and re-points their signals and events accordingly.

**Discount invalidation**: As part of the reversal transaction, any discount codes issued against the merged profile are revoked:

- The Shopify discount code is deactivated via the Admin API.
- The Mindbody promotion is cancelled via the Mindbody API.

A new, correctly scoped discount is re-issued to Maya's verified email addresses only. Sophie's redemption, if it has already occurred, is flagged for manual review — the studio can choose to honour it as a goodwill gesture or recover the value, but the system no longer treats it as a valid campaign redemption against Maya's profile.
