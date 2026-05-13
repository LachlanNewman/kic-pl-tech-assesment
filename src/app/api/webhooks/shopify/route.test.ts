import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { identityResolution } from '@/lib/identityResolution';

vi.mock('@/lib/identityResolution', () => ({
  identityResolution: vi.fn().mockResolvedValue('cust_test'),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/shopify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  id: 'order_abc123',
  customer_id: 'cust_xyz',
  email: 'jane@example.com',
  phone: '+61411000000',
  device_id: 'dev_abc',
  created_at: '2026-05-11T10:00:00Z',
};

describe('POST /api/webhooks/shopify', () => {
  it('returns 200 for a valid payload', async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(identityResolution).toHaveBeenCalledWith({
      source: 'shopify',
      type: 'order.created',
      ...validPayload,
    });
  });

  it('returns 400 when a required field is missing', async () => {
    const { id: _id, ...withoutId } = validPayload;
    const res = await POST(makeRequest(withoutId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
  });

  it('returns 200 for a guest checkout payload with all nullable signals null', async () => {
    const guestPayload = {
      id: 'order_guest',
      customer_id: null,
      email: null,
      phone: null,
      device_id: null,
      created_at: '2026-05-11T10:00:00Z',
    };
    const res = await POST(makeRequest(guestPayload));
    expect(res.status).toBe(200);
  });

  it('returns 500 when an unknown error occurs', async () => {
    vi.mocked(identityResolution).mockRejectedValue(new Error('Unknown error'));
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An unknown error occurred' });
  });
});
