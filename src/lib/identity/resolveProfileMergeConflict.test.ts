import { describe, it, expect } from "vitest";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import type { CustomerSignalMatch } from "@/types";
import type { IdentitySignal } from "@prisma/client";

const makeSignal = (type: string, value: string, confidence: number): IdentitySignal => ({
  id: `sig_${type}`,
  type,
  value,
  confidence,
  customerId: "cust_1",
  createdAt: new Date(),
});

describe("resolveProfileMergeConflict", () => {
  it("picks the customer with the highest-confidence signal as winner", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [makeSignal("device_id", "dev_abc", 2)], confidence: 2 },
      { customerId: "cust_b", matchedSignals: [makeSignal("email", "b@example.com", 3)], confidence: 3 },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner.customerId).toBe("cust_b");
    expect(losers.map((l) => l.customerId)).toEqual(["cust_a"]);
  });

  it("returns all other customers as losers when three or more match", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [makeSignal("device_id", "dev_1", 2)], confidence: 2 },
      { customerId: "cust_b", matchedSignals: [makeSignal("email", "b@example.com", 3)], confidence: 3 },
      { customerId: "cust_c", matchedSignals: [makeSignal("phone", "+61400000002", 3)], confidence: 3 },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner.customerId).toBe("cust_b");
    expect(losers.map((l) => l.customerId)).toContain("cust_a");
    expect(losers.map((l) => l.customerId)).toContain("cust_c");
    expect(losers).toHaveLength(2);
  });

  it("uses first match as winner when signal confidences are equal", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [makeSignal("email", "a@example.com", 3)], confidence: 3 },
      { customerId: "cust_b", matchedSignals: [makeSignal("phone", "+61400000001", 3)], confidence: 3 },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner.customerId).toBe("cust_a");
    expect(losers.map((l) => l.customerId)).toEqual(["cust_b"]);
  });
});
