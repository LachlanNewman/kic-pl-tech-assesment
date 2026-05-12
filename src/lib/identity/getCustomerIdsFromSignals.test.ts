import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { getCustomerIdsFromSignals } from "./index";
import type { Signal } from "@/types";

vi.mock("@/lib/db", () => ({
  prisma: {
    identitySignal: {
      findMany: vi.fn(),
    },
  },
}));

const mockFindMany = vi.mocked(prisma.identitySignal.findMany);

describe("getCustomerIdsFromSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("single signal matching one customer returns one match with that signal", async () => {
    const signal: Signal = { type: "email", value: "jane@example.com" };
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_1", type: "email", value: "jane@example.com" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await getCustomerIdsFromSignals([signal]);

    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe("cust_1");
    expect(result[0].matchedSignals).toContainEqual(signal);
  });

  it("multiple signals matching the same customer returns one match with all matched signals", async () => {
    const signals: Signal[] = [
      { type: "email", value: "jane@example.com" },
      { type: "phone", value: "+61411000000" },
    ];
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_1", type: "email", value: "jane@example.com" },
      { customerId: "cust_1", type: "phone", value: "+61411000000" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await getCustomerIdsFromSignals(signals);

    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe("cust_1");
    expect(result[0].matchedSignals).toHaveLength(2);
    expect(result[0].matchedSignals).toContainEqual({ type: "email", value: "jane@example.com" });
    expect(result[0].matchedSignals).toContainEqual({ type: "phone", value: "+61411000000" });
  });

  it("signals matching multiple distinct customers returns one match per customer with correct signals", async () => {
    const signals: Signal[] = [
      { type: "email", value: "alice@example.com" },
      { type: "email", value: "bob@example.com" },
    ];
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_a", type: "email", value: "alice@example.com" },
      { customerId: "cust_b", type: "email", value: "bob@example.com" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await getCustomerIdsFromSignals(signals);

    expect(result).toHaveLength(2);
    const alice = result.find((m) => m.customerId === "cust_a");
    const bob = result.find((m) => m.customerId === "cust_b");
    expect(alice?.matchedSignals).toContainEqual({ type: "email", value: "alice@example.com" });
    expect(alice?.matchedSignals).not.toContainEqual({ type: "email", value: "bob@example.com" });
    expect(bob?.matchedSignals).toContainEqual({ type: "email", value: "bob@example.com" });
    expect(bob?.matchedSignals).not.toContainEqual({ type: "email", value: "alice@example.com" });
  });

  it("signals with no matching records returns empty array", async () => {
    mockFindMany.mockResolvedValueOnce([] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await getCustomerIdsFromSignals([{ type: "email", value: "unknown@example.com" }]);

    expect(result).toEqual([]);
  });

  it("empty signal array returns empty array without querying the database", async () => {
    const result = await getCustomerIdsFromSignals([]);

    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
