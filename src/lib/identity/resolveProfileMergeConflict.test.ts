import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resolveProfileMergeConflict } from "./resolveProfileMergeConflict";
import type { CustomerSignalMatch } from "@/types";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const mockTransaction = vi.mocked(prisma.$transaction);
const mockUpdateMany = vi.fn();

describe("resolveProfileMergeConflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation((fn: any) =>
      fn({ identitySignal: { updateMany: mockUpdateMany } })
    );
  });

  it("returns matches[0].customerId and marks loser signals for two matches", async () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
    ];

    const result = await resolveProfileMergeConflict(matches);

    expect(result).toBe("cust_a");
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { customerId: { in: ["cust_b"] } },
      data: { mergedInto: "cust_a" },
    });
  });

  it("returns matches[0].customerId and marks all loser signals for three or more matches", async () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_a", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_b", matchedSignals: [{ type: "phone", value: "+61400000001" }] },
      { customerId: "cust_c", matchedSignals: [{ type: "device_id", value: "dev_xyz" }] },
    ];

    const result = await resolveProfileMergeConflict(matches);

    expect(result).toBe("cust_a");
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { customerId: { in: ["cust_b", "cust_c"] } },
      data: { mergedInto: "cust_a" },
    });
  });
});
