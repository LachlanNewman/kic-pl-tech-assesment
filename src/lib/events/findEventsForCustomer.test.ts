import { vi, describe, it, expect, beforeEach } from "vitest";
import { findEventsForCustomer } from "./findEventsForCustomer";
import { TransactionClient } from "../db";

const mockFindMany = vi.fn();

const tx = {
  event: { findMany: mockFindMany },
} as unknown as TransactionClient;

describe("findEventsForCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all events for the given customer", async () => {
    const events = [{ id: "evt_1" }, { id: "evt_2" }];
    mockFindMany.mockResolvedValue(events);

    const result = await findEventsForCustomer(tx, "cust_1");

    expect(mockFindMany).toHaveBeenCalledWith({ where: { customerId: "cust_1" } });
    expect(result).toEqual(events);
  });

  it("returns an empty array when customer has no events", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await findEventsForCustomer(tx, "cust_empty");

    expect(result).toEqual([]);
  });

  it("propagates errors from findMany", async () => {
    mockFindMany.mockRejectedValue(new Error("db error"));

    await expect(findEventsForCustomer(tx, "cust_1")).rejects.toThrow("db error");
  });
});
