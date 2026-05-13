import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/mindbody/route';
import { prisma } from '@/lib/db';

const validPayload = {
  id: 'booking_001',
  client_id: 'mb_client_001',
  client_email: 'alice@example.com',
  phone: '+61411111111',
  class_name: 'Reformer Pilates',
  scheduled_at: '2026-05-12T09:00:00Z',
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/mindbody', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/mindbody', () => {
  it('returns 200 and creates a customer + event for a valid payload', async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const customer = await prisma.customer.findFirst();
    expect(customer).not.toBeNull();

    const event = await prisma.event.findUnique({ where: { externalId: 'booking_001' } });
    expect(event).not.toBeNull();
    expect(event?.source).toBe('mindbody');
    expect(event?.type).toBe('booking.created');
    expect(event?.customerId).toBe(customer?.id);
  });

  it('creates identity signals for all non-null fields', async () => {
    await POST(makeRequest(validPayload));

    const signals = await prisma.identitySignal.findMany();
    const types = signals.map((s) => s.type).sort();
    expect(types).toEqual(['email', 'mindbody_client_id', 'phone'].sort());

    const emailSignal = signals.find((s) => s.type === 'email');
    expect(emailSignal?.value).toBe('alice@example.com');
  });

  it('returns 400 for a payload missing required fields', async () => {
    const res = await POST(makeRequest({ id: 'booking_bad' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid payload');
  });

  it('is idempotent — duplicate externalId returns 200 without creating a second event', async () => {
    await POST(makeRequest(validPayload));
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);

    const events = await prisma.event.findMany({ where: { externalId: 'booking_001' } });
    expect(events).toHaveLength(1);

    const customers = await prisma.customer.findMany();
    expect(customers).toHaveLength(1);
  });

  it('merges two customers when a new booking matches signals from both', async () => {
    // First booking: creates customer A with email
    await POST(
      makeRequest({
        id: 'booking_002',
        client_id: 'mb_client_002',
        client_email: 'merge@example.com',
        phone: null,
        class_name: 'Yoga',
        scheduled_at: '2026-05-12T10:00:00Z',
      }),
    );

    // Second booking: creates customer B with phone
    await POST(
      makeRequest({
        id: 'booking_003',
        client_id: 'mb_client_003',
        client_email: null,
        phone: '+61499999999',
        class_name: 'Yoga',
        scheduled_at: '2026-05-12T11:00:00Z',
      }),
    );

    expect(await prisma.customer.count()).toBe(2);

    // Third booking: matches both email (→ customer A) and phone (→ customer B)
    await POST(
      makeRequest({
        id: 'booking_004',
        client_id: 'mb_client_004',
        client_email: 'merge@example.com',
        phone: '+61499999999',
        class_name: 'Yoga',
        scheduled_at: '2026-05-12T12:00:00Z',
      }),
    );

    const customers = await prisma.customer.findMany();
    const loser = customers.find((c) => c.mergedInto !== null);
    expect(loser).not.toBeUndefined();

    const mergeLog = await prisma.mergeLog.findFirst();
    expect(mergeLog).not.toBeNull();
    expect(mergeLog?.loserId).toBe(loser?.id);
  });
});
