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

describe('identity merge — confidence threshold behaviour', () => {
  it('merges all matched customers when all signals are above the confidence threshold', async () => {
    // Seed three customers, each with a distinct high-confidence signal (email, phone, shopify_customer_id — all confidence 3)
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
      customer_id: 'shopify_cust_multi',
      email: null,
      phone: null,
      device_id: null,
      created_at: '2026-05-12T09:30:00Z',
    }))

    // Trigger carries all three signals — each matches a different customer and all are above threshold
    await POST(makeRequest({
      id: 'order_trigger',
      customer_id: 'shopify_cust_multi',
      email: 'multi@example.com',
      phone: '+61499000001',
      device_id: null,
      created_at: '2026-05-12T10:00:00Z',
    }))

    const customers = await prisma.customer.findMany()
    const winner = customers.find((c) => c.mergedInto === null)
    expect(customers).toHaveLength(3)
    expect(customers).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ mergedInto: null }),
      expect.objectContaining({ mergedInto: winner?.id }),
      expect.objectContaining({ mergedInto: winner?.id }),
    ]))

    const signals = await prisma.identitySignal.findMany()
    expect(signals).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ type: 'email', value: 'multi@example.com', customerId: winner?.id }),
      expect.objectContaining({ type: 'phone', value: '+61499000001', customerId: winner?.id }),
      expect.objectContaining({ type: 'shopify_customer_id', value: 'shopify_cust_multi', customerId: winner?.id }),
    ]))

    const events = await prisma.event.findMany()
    expect(events).toHaveLength(4)
    expect(events).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ externalId: 'order_seed_1', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_seed_2', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_seed_3', customerId: winner?.id }),
      expect.objectContaining({ externalId: 'order_trigger', customerId: winner?.id }),
    ]))

    const mergeLogs = await prisma.mergeLog.findMany()
    expect(mergeLogs).toHaveLength(2)
    expect(mergeLogs).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ winnerId: winner?.id, loserId: expect.any(String), confidenceLevel: expect.any(Number) }),
      expect.objectContaining({ winnerId: winner?.id, loserId: expect.any(String), confidenceLevel: expect.any(Number) }),
    ]))

    const mergedSignals = await prisma.mergeIdentitySignal.findMany()
    expect(mergedSignals).toHaveLength(2)

    const mergedEvents = await prisma.mergeEvent.findMany()
    expect(mergedEvents).toHaveLength(2)
  })

  it('only merges customers whose signals meet the confidence threshold, leaving sub-threshold matches as separate profiles', async () => {
    // Seed three customers: email (confidence 3), phone (confidence 3), device_id (confidence 2)
    await POST(makeRequest({
      id: 'order_seed_1',
      customer_id: null,
      email: 'partial@example.com',
      phone: null,
      device_id: null,
      created_at: '2026-05-12T08:00:00Z',
    }))

    await POST(makeRequest({
      id: 'order_seed_2',
      customer_id: null,
      email: null,
      phone: '+61499000002',
      device_id: null,
      created_at: '2026-05-12T09:00:00Z',
    }))

    await POST(makeRequest({
      id: 'order_seed_3',
      customer_id: null,
      email: null,
      phone: null,
      device_id: 'dev_partial',
      created_at: '2026-05-12T09:30:00Z',
    }))

    // Trigger matches all three, but device_id customer is below threshold and should not be merged
    await POST(makeRequest({
      id: 'order_trigger',
      customer_id: null,
      email: 'partial@example.com',
      phone: '+61499000002',
      device_id: 'dev_partial',
      created_at: '2026-05-12T10:00:00Z',
    }))

    const customers = await prisma.customer.findMany()
    expect(customers).toHaveLength(3)

    // One loser merged into winner, device_id customer untouched
    const mergedCustomers = customers.filter((c) => c.mergedInto !== null)
    const activeCustomers = customers.filter((c) => c.mergedInto === null)
    expect(mergedCustomers).toHaveLength(1)
    expect(activeCustomers).toHaveLength(2)

    const winner = activeCustomers.find((c) =>
      mergedCustomers[0].mergedInto === c.id
    )
    expect(winner).toBeDefined()

    // The device_id signal stays on the un-merged customer
    const deviceSignal = await prisma.identitySignal.findFirst({ where: { type: 'device_id', value: 'dev_partial' } })
    expect(deviceSignal?.customerId).not.toBe(winner?.id)

    // Trigger event and the two high-confidence seed events land on the winner
    const winnerEvents = await prisma.event.findMany({ where: { customerId: winner?.id } })
    expect(winnerEvents).toMatchObject(expect.arrayContaining([
      expect.objectContaining({ externalId: 'order_trigger' }),
    ]))

    // Only one merge log — the device_id customer was not merged
    const mergeLogs = await prisma.mergeLog.findMany()
    expect(mergeLogs).toHaveLength(1)
    expect(mergeLogs[0]).toMatchObject({
      winnerId: winner?.id,
      loserId: mergedCustomers[0].id,
      confidenceLevel: expect.any(Number),
    })

    // One signal and one event carried across in the merge
    const mergedSignals = await prisma.mergeIdentitySignal.findMany()
    expect(mergedSignals).toHaveLength(1)

    const mergedEvents = await prisma.mergeEvent.findMany()
    expect(mergedEvents).toHaveLength(1)
  })
})
