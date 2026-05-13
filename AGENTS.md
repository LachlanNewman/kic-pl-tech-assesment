# Agents & Data Contracts

This file defines the mock data contracts the candidate should build against.

---

## Section 1 — Webhook Payloads

Each payload carries multiple identity signals. The same real customer may appear across payloads with different emails, or no email at all — the system must use overlapping signals to link them.

### Shopify `order.created`

Authenticated checkout. Customer has a Shopify account, provided email and phone, and was browsing on a known device.

```json
{
  "id": "shopify_order_001",
  "shopify_customer_id": "cust_shopify_001",
  "email": "jane.doe@example.com",
  "phone": "+61412345678",
  "device_id": "device_abc123",
  "created_at": "2024-11-01T10:00:00Z",
  "total_price": "89.00",
  "line_items": [{ "title": "KIC Resistance Band", "quantity": 1 }]
}
```

### Mindbody `booking.created`

Studio booking. Same real customer as above, but registered in Mindbody under a different email. The phone number overlaps — that is the linking signal.

```json
{
  "id": "mb_booking_001",
  "mindbody_client_id": "mb_client_001",
  "client_email": "jane.doe@gmail.com",
  "phone": "+61412345678",
  "class_name": "Reformer Pilates",
  "scheduled_at": "2024-11-05T08:00:00Z",
  "studio": "KIC South Yarra"
}
```

### Shopify `order.created` — guest checkout, no account

A second Shopify order from the same device as the first order, but placed as a guest with no email. The `device_id` is the only available linking signal.

```json
{
  "id": "shopify_order_002",
  "shopify_customer_id": null,
  "email": null,
  "phone": null,
  "device_id": "device_abc123",
  "created_at": "2024-11-10T14:30:00Z",
  "total_price": "34.00",
  "line_items": [{ "title": "KIC Water Bottle", "quantity": 1 }]
}
```

---

## Section 2 — API Contracts

### `POST /api/webhooks/shopify`

- **Request body**: Shopify order payload (see above)
- **Success**: `200 { "received": true }`
- **Error**: `400` for missing/invalid body, `500` for unexpected errors

### `POST /api/webhooks/mindbody`

- **Request body**: Mindbody booking payload (see above)
- **Success**: `200 { "received": true }`
- **Error**: `400` for missing/invalid body, `500` for unexpected errors

### `GET /api/customers?q=<value>`

- Accepts any identity signal value: an email address, phone number, device ID, Shopify customer ID, or Mindbody client ID
- Returns the unified customer profile and their full event timeline sorted by date descending
- `404` if no customer found matching that signal

---

## Section 3 — Identity Signal Inventory

These are the signals available across the two systems in this exercise. Each signal has a type and a resolution confidence level.

| Signal                | Field in payload         | Type          | Confidence                                                  |
| --------------------- | ------------------------ | ------------- | ----------------------------------------------------------- |
| `email`               | `email` / `client_email` | Deterministic | High — but one person may have multiple emails              |
| `phone`               | `phone`                  | Deterministic | High — normalise to E.164                                   |
| `device_id`           | `device_id`              | Probabilistic | Medium — shared devices or reinstalls can cause false links |
| `shopify_customer_id` | `shopify_customer_id`    | Deterministic | High — stable platform ID                                   |
| `mindbody_client_id`  | `mindbody_client_id`     | Deterministic | High — stable platform ID                                   |

Resolution rules:

- Any two events that share a deterministic signal value resolve to the same canonical customer.
- A probabilistic signal (e.g. `device_id`) alone is sufficient for resolution in this exercise, but your data model should make the confidence level and triggering signal queryable.
- When a new event resolves to an existing profile, all signals from the new event are added to that profile's signal set — which may trigger further cascading merges.

---

## Section 4 — Edge Cases the Build Must Handle

- The same webhook may be delivered more than once — duplicate events must not create duplicate records
- The same real customer appears with different emails across Shopify and Mindbody — phone is the linking signal
- A guest checkout carries no email or phone — device ID is the only available signal
- A customer may have events from only one source and no overlapping signals with any other profile — they exist as an unlinked profile until a future event connects them
- A single incoming event may carry signals that each match a _different_ existing profile — for example, the email resolves to profile A but the phone resolves to profile B. How do you handle the conflict? Do you merge the two profiles? Which signal takes precedence? What do you record about why the merge happened so it can be reviewed or reversed?
