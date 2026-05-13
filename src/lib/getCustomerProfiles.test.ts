import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./signals/getSignalsByValue', () => ({ getSignalsByValue: vi.fn() }));
vi.mock('./identity/getCustomerProfiles', () => ({ getCustomerProfiles: vi.fn() }));

import { getCustomerProfile } from './getCustomerProfiles';
import { getSignalsByValue } from './signals/getSignalsByValue';
import { getCustomerProfiles } from './identity/getCustomerProfiles';

const mockGetSignalsByValue = vi.mocked(getSignalsByValue);
const mockGetCustomerProfiles = vi.mocked(getCustomerProfiles);

describe('getCustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns customers matching the given signal value with their events', async () => {
    const signals = [{ customerId: 'cust_1' }, { customerId: 'cust_2' }] as any[];
    const customers = [
      { id: 'cust_1', events: [] },
      { id: 'cust_2', events: [] },
    ] as any[];
    mockGetSignalsByValue.mockResolvedValue(signals);
    mockGetCustomerProfiles.mockResolvedValue(customers);

    const result = await getCustomerProfile('jane@example.com');

    expect(mockGetSignalsByValue).toHaveBeenCalledWith('jane@example.com');
    expect(mockGetCustomerProfiles).toHaveBeenCalledWith(['cust_1', 'cust_2']);
    expect(result).toEqual(customers);
  });

  it('returns empty array and skips customer lookup when no signals match', async () => {
    mockGetSignalsByValue.mockResolvedValue([]);

    const result = await getCustomerProfile('unknown@example.com');

    expect(mockGetCustomerProfiles).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
