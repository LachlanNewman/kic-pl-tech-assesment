import { vi, describe, it, expect, beforeEach } from "vitest";
import { createSignals } from "./createSignals";
import { TransactionClient } from "../db";

const mockUpsert = vi.fn();

const tx = {
  identitySignal: {
    upsert: mockUpsert,
  },
} as unknown as TransactionClient;

describe("createSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts each signal with confidence and customerId, no-op on conflict", async () => {
    mockUpsert.mockResolvedValue({});

    await createSignals(tx, "cust_1", [
      { type: "email", value: "a@b.com" },
      { type: "phone", value: "0400000000" },
    ]);

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { type_value: { type: "email", value: "a@b.com" } },
      create: { type: "email", value: "a@b.com", confidence: 3, customerId: "cust_1" },
      update: {},
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { type_value: { type: "phone", value: "0400000000" } },
      create: { type: "phone", value: "0400000000", confidence: 3, customerId: "cust_1" },
      update: {},
    });
  });

  it("does nothing when signals is empty", async () => {
    await createSignals(tx, "cust_1", []);

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("propagates unexpected errors thrown by upsert", async () => {
    mockUpsert.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      createSignals(tx, "cust_1", [{ type: "email", value: "a@b.com" }])
    ).rejects.toThrow("database unavailable");
  });
});
