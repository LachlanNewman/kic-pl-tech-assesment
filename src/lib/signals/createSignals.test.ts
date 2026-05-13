import { vi, describe, it, expect, beforeEach } from "vitest";
import { createSignals } from "./createSignals";
import { TransactionClient } from "../db";

const mockCreateMany = vi.fn();

const tx = {
  identitySignal: {
    createMany: mockCreateMany,
  },
} as unknown as TransactionClient;

describe("createSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createMany with mapped signal data and customerId", async () => {
    mockCreateMany.mockResolvedValueOnce({ count: 2 });

    await createSignals(tx, "cust_1", [
      { type: "email", value: "a@b.com" },
      { type: "phone", value: "0400000000" },
    ]);

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { type: "email", value: "a@b.com", confidence: 3, customerId: "cust_1" },
        { type: "phone", value: "0400000000", confidence: 3, customerId: "cust_1" },
      ],
    });
  });

  it("calls createMany with an empty array when signals is empty", async () => {
    mockCreateMany.mockResolvedValueOnce({ count: 0 });

    await createSignals(tx, "cust_1", []);

    expect(mockCreateMany).toHaveBeenCalledWith({ data: [] });
  });

  it("propagates unexpected errors thrown by createMany", async () => {
    mockCreateMany.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      createSignals(tx, "cust_1", [{ type: "email", value: "a@b.com" }])
    ).rejects.toThrow("database unavailable");
  });
});
