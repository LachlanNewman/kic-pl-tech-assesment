import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resolveCustomerIdentity } from "./index";
import type { CustomerSignalMatch } from "@/types";

vi.mock("@/lib/db", () => ({
  prisma: {
    identitySignal: {
      findMany: vi.fn(),
    },
    customer: {
      create: vi.fn(),
    },
  },
}));

const mockCustomerCreate = vi.mocked(prisma.customer.create);

describe("resolveCustomerIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes to createCustomerProfile when matches is empty", async () => {
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_2", createdAt: new Date(), updatedAt: new Date() });

    const result = await resolveCustomerIdentity([]);

    expect(mockCustomerCreate).toHaveBeenCalledWith({ data: {} });
    expect(result).toBe("new_cust_2");
  });

  it("routes to resolveExistingProfile when matches has one entry", async () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_single", matchedSignals: [{ type: "email", value: "x@example.com" }] },
    ];

    const result = await resolveCustomerIdentity(matches);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(result).toBe("cust_single");
  });

  it("routes to resolveProfileMergeConflict when matches has two or more entries", async () => {
    const matches: CustomerSignalMatch[] = [
      { customerId: "cust_first", matchedSignals: [{ type: "email", value: "a@example.com" }] },
      { customerId: "cust_second", matchedSignals: [{ type: "phone", value: "+61400000002" }] },
    ];

    const result = await resolveCustomerIdentity(matches);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(result).toBe("cust_first");
  });
});
