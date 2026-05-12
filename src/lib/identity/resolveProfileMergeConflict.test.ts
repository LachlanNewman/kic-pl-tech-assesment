import { describe, it, expect } from "vitest";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import type { CustomerSignalMatch } from "@/types";

describe("resolveProfileMergeConflict", () => {
  it("returns matches[0].customerId for two matches", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
    ];

    expect(resolveProfileMergeConflict(matches)).toBe("cust_a");
  });

  it("returns matches[0].customerId for three or more matches", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
      { customerId: "cust_c", matchedSignals: [{ type: "device_id", value: "dev_xyz" }] },
    ];

    expect(resolveProfileMergeConflict(matches)).toBe("cust_a");
  });
});
