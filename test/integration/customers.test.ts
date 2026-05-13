import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/customers/route'
import { POST as postMindbody } from '@/app/api/webhooks/mindbody/route'
import { POST as postShopify } from '@/app/api/webhooks/shopify/route'

function getRequest(q?: string): NextRequest {
  const url = q
    ? `http://localhost/api/customers?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/customers'
  return new NextRequest(url)
}

describe('GET /api/customers', () => {
  it('returns 400 when q param is missing', async () => {
    const res = await GET(getRequest())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Missing query parameter 'q'" })
  })

  it('returns empty array when no customer matches the signal value', async () => {
    const res = await GET(getRequest('nobody@example.com'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ customers: [] })
  })

  it('returns the matched customer with their events when an email signal exists', async () => {
    await postMindbody(new NextRequest('http://localhost/api/webhooks/mindbody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'booking_lookup_001',
        client_id: 'mb_lookup_001',
        client_email: 'lookup@example.com',
        phone: null,
        class_name: 'Yoga',
        scheduled_at: '2026-05-12T08:00:00Z',
      }),
    }))

    const res = await GET(getRequest('lookup@example.com'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.customers).toHaveLength(1)
    expect(body.customers[0].events).toHaveLength(1)
    expect(body.customers[0].events[0].externalId).toBe('booking_lookup_001')
  })

  it('returns the matched customer when looked up by phone signal', async () => {
    await postShopify(new NextRequest('http://localhost/api/webhooks/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'order_phone_001',
        customer_id: null,
        email: null,
        phone: '+61477777777',
        device_id: null,
        created_at: '2026-05-12T09:00:00Z',
      }),
    }))

    const res = await GET(getRequest('+61477777777'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.customers).toHaveLength(1)
    expect(body.customers[0].events[0].externalId).toBe('order_phone_001')
  })

  it('returns multiple events for a customer with repeated bookings', async () => {
    await postMindbody(new NextRequest('http://localhost/api/webhooks/mindbody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'booking_multi_001',
        client_id: 'mb_multi_001',
        client_email: 'multi@example.com',
        phone: null,
        class_name: 'Pilates',
        scheduled_at: '2026-05-12T09:00:00Z',
      }),
    }))

    await postMindbody(new NextRequest('http://localhost/api/webhooks/mindbody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'booking_multi_002',
        client_id: 'mb_multi_001',
        client_email: 'multi@example.com',
        phone: null,
        class_name: 'Yoga',
        scheduled_at: '2026-05-13T09:00:00Z',
      }),
    }))

    const res = await GET(getRequest('multi@example.com'))
    const body = await res.json()
    expect(body.customers).toHaveLength(1)
    expect(body.customers[0].events).toHaveLength(2)
  })
})
