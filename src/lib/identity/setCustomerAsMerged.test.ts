import { vi, describe, it, expect, beforeEach } from 'vitest';
import { setCustomerAsMerged } from './setCustomerAsMerged';
import { TransactionClient } from '../db';

const mockUpdate = vi.fn();

const tx = {
  customer: { update: mockUpdate },
} as unknown as TransactionClient;

describe('setCustomerAsMerged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the loser customer as merged into the winner', async () => {
    mockUpdate.mockResolvedValue({});

    await setCustomerAsMerged(tx, 'winner_id', 'loser_id');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'loser_id' },
      data: { mergedInto: 'winner_id' },
    });
  });

  it('propagates errors from update', async () => {
    mockUpdate.mockRejectedValue(new Error('db error'));

    await expect(setCustomerAsMerged(tx, 'winner_id', 'loser_id')).rejects.toThrow(
      'Failed to set customer as merged',
    );
  });
});
