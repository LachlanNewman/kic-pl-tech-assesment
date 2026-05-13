import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { findSignalsByValues } from './findSignalsByValues';
import type { Signal } from '@/types';

vi.mock('@/lib/db', () => ({
  prisma: {
    identitySignal: {
      findMany: vi.fn(),
    },
  },
}));

const mockFindMany = vi.mocked(prisma.identitySignal.findMany);

describe('findSignalsByValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries by type and value for each signal and returns rows with confidence', async () => {
    const signals: Signal[] = [{ type: 'email', value: 'jane@example.com' }];
    mockFindMany.mockResolvedValueOnce([
      { customerId: 'cust_1', type: 'email', value: 'jane@example.com', confidence: 3 },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await findSignalsByValues(signals);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { OR: [{ type: 'email', value: 'jane@example.com' }] },
    });
    expect(result).toEqual([
      { customerId: 'cust_1', type: 'email', value: 'jane@example.com', confidence: 3 },
    ]);
  });

  it('returns an empty array when no signals match', async () => {
    mockFindMany.mockResolvedValueOnce([] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await findSignalsByValues([{ type: 'email', value: 'unknown@example.com' }]);

    expect(result).toEqual([]);
  });

  it('returns multiple rows when multiple signals match different customers', async () => {
    const signals: Signal[] = [
      { type: 'email', value: 'alice@example.com' },
      { type: 'phone', value: '+61411000000' },
    ];
    mockFindMany.mockResolvedValueOnce([
      { customerId: 'cust_a', type: 'email', value: 'alice@example.com', confidence: 3 },
      { customerId: 'cust_b', type: 'phone', value: '+61411000000', confidence: 3 },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await findSignalsByValues(signals);

    expect(result).toHaveLength(2);
  });
});
