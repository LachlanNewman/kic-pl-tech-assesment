import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/shopify/route'
import { prisma } from '@/lib/db'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/shopify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('identity merge — multiple signal matches across multiple customers', () => {
  it('merges all matched customers into one winner when an incoming event matches three separate profiles', async () => {
    // Seed three customers, each known by a single distinct signal
    await POST(makeRequest({
      id: 'order_seed_1',
      customer_id: null,
      email: 'multi@example.com',
      phone: null,
      device_id: null,
      created_at: '2026-05-12T08:00:00Z',
    }))

    await POST(makeRequest({
      id: 'order_seed_2',
      customer_id: null,
      email: null,
      phone: '+61499000001',
      device_id: null,
      created_at: '2026-05-12T09:00:00Z',
    }))

    await POST(makeRequest({
      id: 'order_seed_3',
      customer_id: null,
      email: null,
      phone: null,
      device_id: 'dev_multi',
      created_at: '2026-05-12T09:30:00Z',
    }))

    // Incoming event carries all three signals — each matches a different customer
    await POST(makeRequest({
      id: 'order_trigger',
      customer_id: null,
      email: 'multi@example.com',
      phone: '+61499000001',
      device_id: 'dev_multi',
      created_at: '2026-05-12T10:00:00Z',
    }))

    // All three customer records still exist, but two are losers
    const customers = await prisma.customer.findMany()
    const winner = customers.find((c) => c.mergedInto === null)
    expect(customers).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ id: expect.any(String), mergedInto: null }), // winner
      expect.objectContaining({ id: expect.any(String), mergedInto: winner?.id }), // loser 1
      expect.objectContaining({ id: expect.any(String), mergedInto: winner?.id }), // loser 2
    ]))

    const signals = await prisma.identitySignal.findMany()
    expect(signals).toHaveLength(3) // email, phone, device_id
    expect(signals).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ type: 'email', value: 'multi@example.com', customerId: winner?.id }),
      expect.objectContaining({ type: 'phone', value: '+61499000001', customerId: winner?.id }),
      expect.objectContaining({ type: 'device_id', value: 'dev_multi', customerId: winner?.id }),
    ]))

    const events = await prisma.event.findMany()
    expect(events).toHaveLength(4) // 3 seeds + 1 trigger
    expect(events).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ externalId: 'order_seed_1', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_seed_2', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_seed_3', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_trigger', customerId: winner?.id }),
    ]))

    // One merge log per loser, each recording the triggering signal and the loser's seed event
    const mergeLogs = await prisma.mergeLog.findMany()
    expect(mergeLogs).toHaveLength(2)
    expect(mergeLogs).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ winnerId: winner?.id, loserId: expect.any(String) }),
      expect.objectContaining({ winnerId: winner?.id, loserId: expect.any(String) }),
    ]))
    
    const mergedSigals = await prisma.mergeIdentitySignal.findMany()
    expect(mergedSigals).toHaveLength(2) // the two losing signals
    expect(mergedSigals).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ id: expect.any(String), mergeLogId: expect.any(String), identitySignalId: expect.any(String) }),
      expect.objectContaining({ id: expect.any(String), mergeLogId: expect.any(String), identitySignalId: expect.any(String) }),
    ]))

    const mergedEvents = await prisma.mergeEvent.findMany()
    expect(mergedEvents).toHaveLength(2) // the two losing seed events
    expect(mergedEvents).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ id: expect.any(String), mergeLogId: expect.any(String), eventId: expect.any(String) }),
      expect.objectContaining({ id: expect.any(String), mergeLogId: expect.any(String), eventId: expect.any(String) }),
    ]))
  })
})
