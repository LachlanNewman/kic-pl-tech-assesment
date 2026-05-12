import { describe, it, expect } from "vitest";
import { resolveExistingProfile } from "./resolveExistingProfile";
import type { CustomerSignalMatch } from "@/types";

describe("resolveExistingProfile", () => {
  it("returns the matched customer ID", () => {
    const match: CustomerSignalMatch = {
      customerId: "cust_existing",
      matchedSignals: [{ type: "email", value: "jane@example.com" }],
    };

    const result = resolveExistingProfile(match);

    expect(result).toBe("cust_existing");
  });
});
