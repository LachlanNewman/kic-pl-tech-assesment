import { vi, describe, it, expect, beforeEach } from "vitest";
import { mergeSignal } from "./mergeSignal";
import { TransactionClient } from "../db";

const mockUpdateMany = vi.fn();

const tx = {
  identitySignal: { updateMany: mockUpdateMany },
} as unknown as TransactionClient;

describe("mergeSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reassigns all loser signals to the winner", async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });

    await mergeSignal(tx, "winner_id", "loser_id");

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { customerId: "loser_id" },
      data: { customerId: "winner_id" },
    });
  });

  it("propagates errors from updateMany", async () => {
    mockUpdateMany.mockRejectedValue(new Error("db error"));

    await expect(mergeSignal(tx, "winner_id", "loser_id")).rejects.toThrow("db error");
  });
});
