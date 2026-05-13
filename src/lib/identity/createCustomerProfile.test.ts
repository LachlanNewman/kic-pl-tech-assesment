import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createCustomerProfile } from './createCustomerProfile';
import { TransactionClient } from '../db';

const mockCreate = vi.fn();

const tx = {
  customer: { create: mockCreate },
} as unknown as TransactionClient;

describe('createCustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new Customer record and returns its ID', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'new_cust_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createCustomerProfile(tx);

    expect(mockCreate).toHaveBeenCalledWith({ data: {} });
    expect(result).toBe('new_cust_1');
  });
});
