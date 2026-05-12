import { describe, it, expect } from "vitest";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import type { CustomerSignalMatch } from "@/types";

describe("resolveProfileMergeConflict", () => {
  it("picks the customer with the most matched signals as winner", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "email", value: "b@example.com" }, { type: "phone", value: "+61400000001" }] },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner).toBe("cust_b");
    expect(losers).toEqual(["cust_a"]);
  });

  it("returns all other customers as losers when three or more match", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "email", value: "b@example.com" }, { type: "phone", value: "+61400000001" }, { type: "device_id", value: "dev_1" }] },
      { customerId: "cust_c", matchedSignals: [{ type: "phone", value: "+61400000002" }, { type: "device_id", value: "dev_2" }] },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner).toBe("cust_b");
    expect(losers).toContain("cust_a");
    expect(losers).toContain("cust_c");
    expect(losers).toHaveLength(2);
  });

  it("uses first match as winner when signal counts are equal", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner).toBe("cust_a");
    expect(losers).toEqual(["cust_b"]);
  });
});
