import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: { identitySignal: { findMany: mockFindMany } },
}));

import { getSignalsByValue } from './getSignalsByValue';

describe('getSignalsByValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all signals matching the given value', async () => {
    const signals = [{ id: 'sig_1', value: 'jane@example.com', customerId: 'cust_1' }];
    mockFindMany.mockResolvedValue(signals);

    const result = await getSignalsByValue('jane@example.com');

    expect(mockFindMany).toHaveBeenCalledWith({ where: { value: 'jane@example.com' } });
    expect(result).toEqual(signals);
  });

  it('returns an empty array when no signals match', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getSignalsByValue('unknown@example.com');

    expect(result).toEqual([]);
  });
});
