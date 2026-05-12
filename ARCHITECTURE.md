# Architecture

Assumptions -> should scale to ~1million users.

## 1. Problem Statement

*Describe the fragmented customer identity problem across KIC's systems and why it matters. Why is a shared email or phone number insufficient as a single canonical key? What are the business consequences of unresolved identity — in CRM, in marketing attribution, in the studio experience?*

KIC operates across three systems — the KICApp, Shopify, and Mindbody — each of which captures a fragment of customer identity independently. The same real person can appear with different emails across platforms, no email at all in a guest checkout, and no shared key between any two systems. There is currently no layer that links these records together, which means the business cannot act on the complete relationship it has with a customer.

### Why a single signal is insufficient as a canonical key

No single signal is universal or stable enough to serve as the canonical identifier:

- **Email** is the most commonly available signal, but the same person may register with different emails across platforms (e.g. `jane.doe@example.com` in Shopify, `jane.doe@gmail.com` in Mindbody), and email is entirely absent in guest checkouts.
- **Phone** is high-confidence and normalised to E.164, but it is not always captured — guest checkouts and some app sessions provide no phone at all.
- **Device ID** is present in app and browser events but is probabilistic — a shared device (e.g. a studio iPad) or a reinstall can produce false links between distinct customers.
- **Platform IDs** (Shopify customer ID, Mindbody client ID) are stable within their own system but have no meaning outside it.

Because no signal is both universal and unambiguous, a single canonical key cannot exist. The solution is a typed, multi-value signal model: a canonical profile record acts as the anchor, and each observed signal is stored as a `(profile_id, signal_type, signal_value, confidence, source_event)` row — allowing one profile to accumulate signals from multiple systems over time.

### Business consequences of unresolved identity

**CRM**: The same customer appears as multiple separate contact records across systems. Support staff and account managers cannot see a customer's full history — a Mindbody member who is also a Shopify buyer appears as two unrelated people.

**Marketing attribution**: Cross-system behavior is invisible. If a customer clicks a paid ad, then books a studio class in Mindbody two days later, the conversion is unattributed because the click ID and the Mindbody booking are never linked. Campaigns appear to underperform and budget gets misallocated. Guest checkout revenue ($0 attributed to any known profile) compounds the problem.

**Studio and personalisation experience**: Without a unified view, targeted personalisation is impossible. KIC cannot identify that the member showing up to a Reformer Pilates class also purchased resistance bands on Shopify last week, or that a lapsed studio member is still highly active in the app — signals that would otherwise inform re-engagement strategy.

**Off Boarding Customers**: GDPR requires that all individuals have the right to access, rectify, erase ("right to be forgotten"), restrict processing, and request portability of their personal data. Storing multiple events with no canonical identified makes it difficult to comply with this requirement due to having to delete multiple records without knowing relationships.

---

## 2. Build vs Buy

*Would you build this identity resolution layer, or buy a Customer Data Platform (CDP) — and why? What factors drive that call: cost, control, time-to-value, team capability, data residency, or something else? If you'd buy, which product and why; if you'd build, what does that imply about ongoing maintenance and ownership?*

**Recommendation: build a thin, owned identity resolution layer.**

The primary driver is migration asymmetry — if the approach turns out to be wrong, it is significantly cheaper to fix a build mistake than a vendor lock-in mistake. With a build, the canonical profile IDs, signal store, and merge history all live in your own database. Refactoring is internal engineering time. With a buy, your canonical profile IDs are the CDP's opaque identifiers, referenced across your CRM, marketing tools, and event history. Migrating away means exporting an identity graph (if the vendor allows it), remapping every profile ID in every downstream system, and rebuilding merge provenance — with no guarantee the new system reproduces the same merges.

### Why a full CDP is overkill here

A CDP solves a broader problem: ingestion, enrichment, audience segmentation, and downstream activation. KIC only needs identity resolution at the moment — the logic that links signals to a canonical profile. That is a well-scoped problem: a signal lookup, a merge function, and idempotency. It does not require a third-party system to own the canonical record.

Additional factors that favour building:

- **Data residency**: Australian customer PII (email, phone) stored on a US cloud CDP creates exposure under the Privacy Act / Australian Privacy Principles. Owning the layer means owning where the data lives.
- **Merge opacity**: CDPs do not expose the reasoning behind identity merges. A bad merge is hard to debug and may be impossible to reverse. An owned layer can record full merge provenance — which signals triggered the merge, when, and from which source event.
- **Cost scaling**: CDP pricing is typically per monthly tracked user or event volume, scaling non-linearly with growth. A bespoke resolution layer has no per-event cost.

### What "build" means in practice

The resolution layer is small — a signal store, a lookup function, a merge function, and idempotency guards. The ongoing maintenance cost is real (edge cases in merge logic surface over time) but proportionate to the problem size. The team capability dependency is mitigated by keeping the logic explicit, well-tested, and documented rather than buried in a third-party abstraction.

This does not preclude using external tools for downstream activation (e.g. piping enriched profiles to a marketing tool). It only means the canonical profile and the resolution decisions remain owned infrastructure.

### Considered alternatives

**Self-hosted CDP (e.g. Rudderstack open-source)**: A middle ground that reduces build cost while retaining data residency control — the vendor's resolution logic runs on your own infrastructure. The tradeoff is ops burden: you now own running and maintaining the platform, not just the resolution logic. Worth considering as a growth path if the built layer needs to expand into enrichment and segmentation.

**Managed CDP with data portability guarantees**: If a vendor can commit to full export of the identity graph in a portable schema, the lock-in risk is reduced. However, profile ID remapping across downstream systems and merge logic divergence on migration remain real costs regardless of export quality. Data residency under the Australian Privacy Act is an independent constraint that a managed cloud CDP does not solve.

---

## 3. Proposed Data Model

*Define the unified customer profile and how it relates to identity signals and source events. A diagram or structured description is fine. Consider: what is the canonical record, how are signals stored as typed edges, and how do source events reference the profile rather than the signal?*

The model has three entities: Customer, IdentitySignal, and Event. Merge provenance is tracked inline via `mergedInto` foreign keys on all three models rather than a separate MergeRecord table — keeping the schema simple while preserving the full audit trail needed to review or reverse a merge.

### Customer

The canonical customer record. Intentionally thin — it is an identity anchor, not a contact record. Source system details (name, address, membership status) remain in their origin systems and are accessible via the platform IDs stored as signals.

```
Customer {
  id                 cuid (PK)
  createdAt          DateTime
  updatedAt          DateTime
  mergedInto         String?   (FK to Customer.id — set on the losing customer when merged into a winner)
}
```

When `mergedInto` is set, this customer record is a loser: all its signals and events have also been stamped with the winning customer ID and are excluded from future identity lookups.

### IdentitySignal

A typed identity signal observed for a customer. One customer can have many signals across multiple types. This is the lookup table — incoming events are matched against signals to find the canonical customer. Signals with `mergedInto` set are excluded from lookups so that merged identities do not re-enter resolution as active matches.

```
IdentitySignal {
  id                 cuid (PK)
  type               String    (e.g. "email", "phone", "device_id" — open string, not an enum)
  value              String
  customerId         String    (FK to Customer.id — the owning customer)
  mergedInto         String?   (FK to Customer.id — the winning customer; set when owning customer is a merge loser)
  createdAt          DateTime

  @@unique([type, value])
  @@index([value])
}
```

The `@@unique([type, value])` constraint enforces that each signal value is owned by exactly one customer at any time. `skipDuplicates: true` on inserts makes signal writes idempotent.

### Event

The raw webhook payload, resolved to a canonical customer at ingestion time. The event references the customer — not the signal — so future lookups always go to the canonical record. When a merge occurs, a new event is written directly to the winning customer; existing events on losing customers are stamped with `mergedInto` for audit purposes.

```
Event {
  id                 cuid (PK)
  source             String    ("shopify" | "mindbody")
  type               String    (e.g. "order.created", "booking.created")
  externalId         String    @unique (source system's own ID — idempotency guard)
  payload            String    (raw JSON webhook body)
  customerId         String    (FK to Customer.id — the resolved customer)
  mergedInto         String?   (FK to Customer.id — the winning customer; set when owning customer is a merge loser)
  occurredAt         DateTime
  createdAt          DateTime
}
```

`externalId` is unique globally — this prevents duplicate webhook deliveries from creating duplicate records.

### Entity relationships

```
Customer ──< IdentitySignal  (via customerId)
Customer ──< Event           (via customerId)
Customer ──  Customer        (via mergedInto — self-referential, loser → winner)
IdentitySignal ──  Customer  (via mergedInto — loser signal → winning customer)
Event          ──  Customer  (via mergedInto — loser event → winning customer)
```

---

## 4. Integration Points

*For each of KICApp, Shopify, Mindbody — how does data flow into the central layer? What signals does each system provide, and what are the integration patterns (webhooks, polling, SDK instrumentation, server-side event forwarding)?*

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

*How does the system resolve events to canonical profiles when no single shared key exists?*

Cover:
- The resolution algorithm: given an incoming event with a set of signals, how do you find the right profile? What is the lookup order? What happens when signals match different profiles (collision)?
- Deterministic vs probabilistic signals: how does your model distinguish between a high-confidence match (same phone) and a lower-confidence one (same device, which could be a shared iPad at a studio)?
- Cascading merges: when a new event links two previously separate profiles, how do you unify them? What happens to their existing events?
- Merge provenance: what do you record about why two profiles were merged, so the decision can be reviewed or reversed?
- The real KIC signal landscape includes: `email`, `phone`, `device_id`, `browser_fingerprint`, `shopify_customer_id`, `mindbody_client_id`, `app_user_id`, `fbclid`, `gclid`. How does your model accommodate signals that are short-lived (click IDs) versus stable (platform IDs)?

---

## 6. Failure Modes

*Identify at least four failure scenarios and how the architecture mitigates each. Consider: duplicate webhooks, downstream outages, schema drift in source payloads, identity conflicts (two real people sharing a device), a bad merge that incorrectly unified two separate customers, and what happens when it goes out against a stale identity snapshot.*

---

## 7. Rollout Strategy

*How would you introduce this without breaking existing integrations? Consider shadow mode, feature flags, phased cutover, and how you'd validate identity resolution accuracy before making it load-bearing for CRM or marketing sends.*

---

## 8. "We Miss You" Campaign — Worked Example

*Trace this specific use case end-to-end through your proposed architecture: Marketing wants to send a re-engagement email to members who have lapsed from studio bookings but remain active in the app, with a discount code valid in both Shopify and at the studio.*

*Walk through: how the system knows these are the same person (they may have different emails in Mindbody vs the app), how the lapse signal is detected, how the discount code is issued and made valid across both systems, and what happens if the identity resolution was wrong — the wrong person gets the email or the discount is redeemed by someone else.*
