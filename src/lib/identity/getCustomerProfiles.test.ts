import { vi, describe, it, expect, beforeEach } from "vitest";

const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: { customer: { findMany: mockFindMany } },
}));

import { getCustomerProfiles } from "./getCustomerProfiles";

describe("getCustomerProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns customers with their events for the given IDs", async () => {
    const customers = [{ id: "cust_1", events: [] }, { id: "cust_2", events: [] }];
    mockFindMany.mockResolvedValue(customers);

    const result = await getCustomerProfiles(["cust_1", "cust_2"]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["cust_1", "cust_2"] } },
      include: { events: true },
    });
    expect(result).toEqual(customers);
  });

  it("returns an empty array when given an empty ID list", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getCustomerProfiles([]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { id: { in: [] } },
      include: { events: true },
    });
    expect(result).toEqual([]);
  });
});
