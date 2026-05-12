import { describe, it, expect } from "vitest";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import type { CustomerSignalMatch } from "@/types";

describe("resolveProfileMergeConflict", () => {
  it("returns winner and single loser for two matches", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner).toBe("cust_a");
    expect(losers).toEqual(["cust_b"]);
  });

  it("returns winner and all losers for three or more matches", () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
      { customerId: "cust_c", matchedSignals: [{ type: "device_id", value: "dev_xyz" }] },
    ];

    const { winner, losers } = resolveProfileMergeConflict(matches);

    expect(winner).toBe("cust_a");
    expect(losers).toEqual(["cust_b", "cust_c"]);
  });
});
