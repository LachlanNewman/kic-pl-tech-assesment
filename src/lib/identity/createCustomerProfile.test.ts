import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createCustomerProfile } from "./createCustomerProfile";

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      create: vi.fn(),
    },
  },
}));

const mockCustomerCreate = vi.mocked(prisma.customer.create);

describe("createCustomerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new Customer record and returns its ID", async () => {
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_1", createdAt: new Date(), updatedAt: new Date() });

    const result = await createCustomerProfile();

    expect(mockCustomerCreate).toHaveBeenCalledWith({ data: {} });
    expect(result).toBe("new_cust_1");
  });
});
