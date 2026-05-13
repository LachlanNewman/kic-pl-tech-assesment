import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/shopify/route';
import { prisma } from '@/lib/db';

const validPayload = {
  id: 'order_001',
  customer_id: 'shopify_cust_001',
  email: 'bob@example.com',
  phone: '+61422222222',
  device_id: 'dev_001',
  created_at: '2026-05-12T10:00:00Z',
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/shopify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/shopify', () => {
  it('returns 200 and creates a customer + event for a valid payload', async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const customer = await prisma.customer.findFirst();
    expect(customer).not.toBeNull();

    const event = await prisma.event.findUnique({ where: { externalId: 'order_001' } });
    expect(event).not.toBeNull();
    expect(event?.source).toBe('shopify');
    expect(event?.type).toBe('order.created');
    expect(event?.customerId).toBe(customer?.id);
  });

  it('creates identity signals for all non-null fields', async () => {
    await POST(makeRequest(validPayload));

    const signals = await prisma.identitySignal.findMany();
    const types = signals.map((s) => s.type).sort();
    expect(types).toEqual(['device_id', 'email', 'phone', 'shopify_customer_id'].sort());
  });

  it('returns 400 for a payload missing required fields', async () => {
    const res = await POST(makeRequest({ bad: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid payload');
  });

  it('is idempotent — duplicate externalId returns 200 without creating a second event', async () => {
    await POST(makeRequest(validPayload));
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);

    const events = await prisma.event.findMany({ where: { externalId: 'order_001' } });
    expect(events).toHaveLength(1);

    const customers = await prisma.customer.findMany();
    expect(customers).toHaveLength(1);
  });

  it('merges two customers when a new order matches signals from both', async () => {
    // First order: creates customer A with email only
    await POST(
      makeRequest({
        id: 'order_s1',
        customer_id: null,
        email: 'merge@example.com',
        phone: null,
        device_id: null,
        created_at: '2026-05-12T10:00:00Z',
      }),
    );

    // Second order: creates customer B with phone only
    await POST(
      makeRequest({
        id: 'order_s2',
        customer_id: null,
        email: null,
        phone: '+61433000000',
        device_id: null,
        created_at: '2026-05-12T11:00:00Z',
      }),
    );

    expect(await prisma.customer.count()).toBe(2);

    // Third order: matches both email (→ customer A) and phone (→ customer B)
    await POST(
      makeRequest({
        id: 'order_s3',
        customer_id: null,
        email: 'merge@example.com',
        phone: '+61433000000',
        device_id: null,
        created_at: '2026-05-12T12:00:00Z',
      }),
    );

    const customers = await prisma.customer.findMany();
    const loser = customers.find((c) => c.mergedInto !== null);
    expect(loser).not.toBeUndefined();

    const mergeLog = await prisma.mergeLog.findFirst();
    expect(mergeLog).not.toBeNull();
    expect(mergeLog?.loserId).toBe(loser?.id);
  });

  it('stores null-signal events under a new anonymous customer', async () => {
    const res = await POST(
      makeRequest({
        id: 'order_anon',
        customer_id: null,
        email: null,
        phone: null,
        device_id: null,
        created_at: '2026-05-12T10:00:00Z',
      }),
    );
    expect(res.status).toBe(200);

    expect(await prisma.customer.count()).toBe(1);
    expect(await prisma.identitySignal.count()).toBe(0);
    expect(await prisma.event.count()).toBe(1);
  });
});
