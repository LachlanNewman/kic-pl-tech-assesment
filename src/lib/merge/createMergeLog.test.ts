import { vi, describe, it, expect, beforeEach } from "vitest";
import { createMergeLog } from "./createMergeLog";
import { TransactionClient } from "../db";
import type { CustomerSignalMatch } from "@/types";
import type { Event, IdentitySignal } from "@prisma/client";

const mockCreate = vi.fn();

const tx = {
  mergeLog: { create: mockCreate },
} as unknown as TransactionClient;

const makeSignal = (id: string, customerId: string): IdentitySignal => ({
  id,
  customerId,
  type: "email",
  value: "a@b.com",
  confidence: 3,
  createdAt: new Date(),
});

const makeEvent = (id: string): Event => ({
  id,
  source: "shopify",
  type: "order.created",
  externalId: `ext_${id}`,
  payload: "{}",
  customerId: "cust_loser",
  occurredAt: new Date(),
  createdAt: new Date(),
});

describe("createMergeLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a merge log with the winner, loser, their signals, and their events", async () => {
    const winner: CustomerSignalMatch = { customerId: "cust_a", matchedSignals: [makeSignal("sig_a1", "cust_a")] };
    const loser: CustomerSignalMatch = { customerId: "cust_b", matchedSignals: [makeSignal("sig_b1", "cust_b"), makeSignal("sig_b2", "cust_b")] };
    const loserEvents = [makeEvent("evt_b1"), makeEvent("evt_b2")];

    mockCreate.mockResolvedValue({ id: "merge_1" });

    await createMergeLog(tx, winner, loser, loserEvents);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        winnerId: "cust_a",
        loserId: "cust_b",
        mergedSignals: { create: [{ identitySignalId: "sig_b1" }, { identitySignalId: "sig_b2" }] },
        mergedEvents: { create: [{ eventId: "evt_b1" }, { eventId: "evt_b2" }] },
      },
    });
  });

  it("creates a merge log with empty signals and events when loser had none", async () => {
    const winner: CustomerSignalMatch = { customerId: "cust_a", matchedSignals: [] };
    const loser: CustomerSignalMatch = { customerId: "cust_b", matchedSignals: [] };

    mockCreate.mockResolvedValue({ id: "merge_2" });

    await createMergeLog(tx, winner, loser, []);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        winnerId: "cust_a",
        loserId: "cust_b",
        mergedSignals: { create: [] },
        mergedEvents: { create: [] },
      },
    });
  });

  it("propagates errors from create", async () => {
    mockCreate.mockRejectedValue(new Error("db error"));

    await expect(
      createMergeLog(tx, { customerId: "a", matchedSignals: [] }, { customerId: "b", matchedSignals: [] }, [])
    ).rejects.toThrow("db error");
  });
});
