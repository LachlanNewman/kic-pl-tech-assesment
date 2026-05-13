import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ShopifyWebhookPayload, CustomerSignalMatch } from '@/types';
import type { IdentitySignal } from '@prisma/client';

vi.mock('./signals', () => ({
  getNormalizedInput: vi.fn(() => ({ source: 'shopify', signals: {} })),
  normalizeSignals: vi.fn(),
  createSignals: vi.fn(),
}));
vi.mock('./signals/findSignalsByValues', () => ({ findSignalsByValues: vi.fn() }));
vi.mock('./events', () => ({ findEventByExternalId: vi.fn(), createEvent: vi.fn() }));
vi.mock('./identity/groupSignalsByCustomer', () => ({ groupSignalsByCustomers: vi.fn() }));
vi.mock('./identity/createCustomerProfile', () => ({ createCustomerProfile: vi.fn() }));
vi.mock('./identity/resolveProfileMergeConflict', () => ({ resolveProfileMergeConflict: vi.fn() }));
vi.mock('./events/findEventsForCustomer', () => ({ findEventsForCustomer: vi.fn() }));
vi.mock('./events/updateEventsToNewCustomer', () => ({ updateEventsToNewCustomer: vi.fn() }));
vi.mock('./signals/mergeSignal', () => ({ mergeSignal: vi.fn() }));
vi.mock('./merge/createMergeLog', () => ({ createMergeLog: vi.fn() }));
vi.mock('./identity/setCustomerAsMerged', () => ({ setCustomerAsMerged: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: vi.fn() } }));

import { identityResolution } from './identityResolution';
import { normalizeSignals, createSignals } from './signals';
import { findSignalsByValues } from './signals/findSignalsByValues';
import { findEventByExternalId, createEvent } from './events';
import { groupSignalsByCustomers } from './identity/groupSignalsByCustomer';
import { createCustomerProfile } from './identity/createCustomerProfile';
import { resolveProfileMergeConflict } from './identity/resolveProfileMergeConflict';
import { findEventsForCustomer } from './events/findEventsForCustomer';
import { updateEventsToNewCustomer } from './events/updateEventsToNewCustomer';
import { mergeSignal } from './signals/mergeSignal';
import { createMergeLog } from './merge/createMergeLog';
import { setCustomerAsMerged } from './identity/setCustomerAsMerged';
import { prisma } from '@/lib/db';

const mockNormalizeSignals = vi.mocked(normalizeSignals);
const mockFindSignalsByValues = vi.mocked(findSignalsByValues);
const mockFindEventByExternalId = vi.mocked(findEventByExternalId);
const mockCreateEvent = vi.mocked(createEvent);
const mockGroupSignalsByCustomers = vi.mocked(groupSignalsByCustomers);
const mockCreateCustomerProfile = vi.mocked(createCustomerProfile);
const mockCreateSignals = vi.mocked(createSignals);
const mockResolveProfileMergeConflict = vi.mocked(resolveProfileMergeConflict);
const mockFindEventsForCustomer = vi.mocked(findEventsForCustomer);
const mockUpdateEventsToNewCustomer = vi.mocked(updateEventsToNewCustomer);
const mockMergeSignal = vi.mocked(mergeSignal);
const mockCreateMergeLog = vi.mocked(createMergeLog);
const mockSetCustomerAsMerged = vi.mocked(setCustomerAsMerged);
const mockTransaction = vi.mocked(prisma.$transaction);

const mockTx = {};

const shopifyOrder: ShopifyWebhookPayload = {
  source: 'shopify',
  type: 'order.created',
  id: 'order_1',
  customer_id: 'cust_shopify_1',
  email: 'jane@example.com',
  phone: '+61411000000',
  device_id: 'dev_abc',
  created_at: '2026-05-12T10:00:00Z',
};

const fourSignals = [
  { type: 'email', value: 'jane@example.com' },
  { type: 'phone', value: '+61411000000' },
  { type: 'device_id', value: 'dev_abc' },
  { type: 'shopify_customer_id', value: 'cust_shopify_1' },
];

describe('identityResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindEventByExternalId.mockResolvedValue(null);
    mockNormalizeSignals.mockReturnValue(fourSignals);
    mockFindSignalsByValues.mockResolvedValue([]);
    mockGroupSignalsByCustomers.mockReturnValue([]);
    mockFindEventsForCustomer.mockResolvedValue([]);
    mockTransaction.mockImplementation((fn: any) => fn(mockTx));
  });

  it('2.0 - duplicate externalId returns existing customerId without reprocessing', async () => {
    mockFindEventByExternalId.mockResolvedValueOnce('cust_existing');

    await expect(identityResolution(shopifyOrder)).rejects.toThrow(
      'An event with the same external ID already exists',
    );
    expect(mockFindSignalsByValues).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('2.1 - no signal matches creates a new customer, writes signals, writes event, and returns its ID', async () => {
    mockGroupSignalsByCustomers.mockReturnValueOnce([]);
    mockCreateCustomerProfile.mockResolvedValueOnce('new_cust_1');

    const result = await identityResolution(shopifyOrder);

    expect(mockCreateCustomerProfile).toHaveBeenCalled();
    expect(mockCreateSignals).toHaveBeenCalledWith(mockTx, 'new_cust_1', fourSignals);
    expect(mockCreateEvent).toHaveBeenCalledWith(
      mockTx,
      { source: 'shopify', signals: {} },
      shopifyOrder,
      'new_cust_1',
    );
    expect(result).toBe('new_cust_1');
  });

  it('2.2 - single match writes new signals, writes event, and returns the matched customer ID', async () => {
    mockGroupSignalsByCustomers.mockReturnValueOnce([
      { customerId: 'cust_existing', matchedSignals: [], confidence: 3 },
    ]);

    const result = await identityResolution(shopifyOrder);

    expect(mockCreateCustomerProfile).not.toHaveBeenCalled();
    expect(mockCreateSignals).toHaveBeenCalledWith(mockTx, 'cust_existing', fourSignals);
    expect(mockCreateEvent).toHaveBeenCalledWith(
      mockTx,
      { source: 'shopify', signals: {} },
      shopifyOrder,
      'cust_existing',
    );
    expect(result).toBe('cust_existing');
  });

  it('2.3 - multiple matches calls merge helpers per loser and returns the winner ID', async () => {
    const winnerSignal: IdentitySignal = {
      id: 'sig_a1',
      customerId: 'cust_a',
      type: 'email',
      value: 'jane@example.com',
      confidence: 3,
      createdAt: new Date(),
    };
    const loserSignal: IdentitySignal = {
      id: 'sig_b1',
      customerId: 'cust_b',
      type: 'phone',
      value: '+61411000000',
      confidence: 3,
      createdAt: new Date(),
    };
    const winner: CustomerSignalMatch = {
      customerId: 'cust_a',
      matchedSignals: [winnerSignal],
      confidence: 3,
    };
    const loser: CustomerSignalMatch = {
      customerId: 'cust_b',
      matchedSignals: [loserSignal],
      confidence: 3,
    };
    const loserEvents = [{ id: 'evt_b1' }];

    mockGroupSignalsByCustomers.mockReturnValueOnce([winner, loser]);
    mockResolveProfileMergeConflict.mockReturnValueOnce({ winner, losers: [loser] });
    mockFindEventsForCustomer.mockResolvedValueOnce(loserEvents as any);

    const result = await identityResolution(shopifyOrder);

    expect(mockFindEventsForCustomer).toHaveBeenCalledWith(mockTx, 'cust_b');
    expect(mockMergeSignal).toHaveBeenCalledWith(mockTx, 'cust_a', 'cust_b');
    expect(mockUpdateEventsToNewCustomer).toHaveBeenCalledWith(mockTx, 'cust_b', 'cust_a');
    expect(mockCreateMergeLog).toHaveBeenCalledWith(mockTx, winner, loser, loserEvents);
    expect(mockSetCustomerAsMerged).toHaveBeenCalledWith(mockTx, 'cust_a', 'cust_b');
    expect(mockCreateEvent).toHaveBeenCalledWith(
      mockTx,
      { source: 'shopify', signals: {} },
      shopifyOrder,
      'cust_a',
    );
    expect(result).toBe('cust_a');
  });

  it('2.4 - all-null signals creates a new customer with no signals, writes event, and returns its ID', async () => {
    mockNormalizeSignals.mockReturnValueOnce([]);
    mockGroupSignalsByCustomers.mockReturnValueOnce([]);
    mockCreateCustomerProfile.mockResolvedValueOnce('new_cust_2');

    const nullShopifyOrder: ShopifyWebhookPayload = {
      ...shopifyOrder,
      id: 'order_2',
      customer_id: null,
      email: null,
      phone: null,
      device_id: null,
    };
    const result = await identityResolution(nullShopifyOrder);

    expect(mockCreateSignals).toHaveBeenCalledWith(mockTx, 'new_cust_2', []);
    expect(result).toBe('new_cust_2');
  });
});
