import { vi, describe, it, expect, beforeEach } from "vitest";
import { updateEventsToNewCustomer } from "./updateEventsToNewCustomer";
import { TransactionClient } from "../db";

const mockUpdateMany = vi.fn();

const tx = {
  event: { updateMany: mockUpdateMany },
} as unknown as TransactionClient;

describe("updateEventsToNewCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reassigns all loser events to the new customer", async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    await updateEventsToNewCustomer(tx, "old_cust", "new_cust");

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { customerId: "old_cust" },
      data: { customerId: "new_cust" },
    });
  });

  it("propagates errors from updateMany", async () => {
    mockUpdateMany.mockRejectedValue(new Error("db error"));

    await expect(updateEventsToNewCustomer(tx, "old_cust", "new_cust")).rejects.toThrow("db error");
  });
});
