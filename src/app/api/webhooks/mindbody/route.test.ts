import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { identityResolution } from '@/lib/identityResolution';

vi.mock('@/lib/identityResolution', () => ({
  identityResolution: vi.fn().mockResolvedValue('cust_test'),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/mindbody', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  id: 'booking_abc123',
  client_id: 'mb_client_xyz',
  client_email: 'jane@example.com',
  phone: '+61411000000',
  class_name: 'Reformer Pilates',
  scheduled_at: '2026-05-12T09:00:00Z',
};

describe('POST /api/webhooks/mindbody', () => {
  it('returns 200 for a valid payload', async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(identityResolution).toHaveBeenCalledWith({
      source: 'mindbody',
      type: 'booking.created',
      ...validPayload,
    });
  });

  it('returns 400 when client_id is missing', async () => {
    const { client_id: _client_id, ...withoutClientId } = validPayload;
    const res = await POST(makeRequest(withoutClientId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
  });

  it('returns 500 when an unknown error occurs', async () => {
    vi.mocked(identityResolution).mockRejectedValue(new Error('Unknown error'));
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An unknown error occurred' });
  });
});
