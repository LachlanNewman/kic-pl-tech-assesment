import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getCustomerProfile } from '@/lib/getCustomerProfiles';

vi.mock('@/lib/getCustomerProfiles', () => ({
  getCustomerProfile: vi.fn().mockResolvedValue([{ id: 'cust_test', name: 'John Doe' }]),
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

describe('GET /api/customers', () => {
  it('returns 200 for a valid identity signal', async () => {
    const res = await GET(new NextRequest('http://localhost/api/customers?q=cust_test'));
    expect(getCustomerProfile).toHaveBeenCalledWith('cust_test');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customers: [{ id: 'cust_test', name: 'John Doe' }] });
  });

  it('returns 400 when identity signal is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/customers'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing query parameter 'q'" });
  });

  it('returns 500 when an unknown error occurs', async () => {
    vi.mocked(getCustomerProfile).mockRejectedValue(new Error('Unknown error'));
    const res = await GET(new NextRequest('http://localhost/api/customers?q=cust_test'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An unknown error occurred' });
  });
});
