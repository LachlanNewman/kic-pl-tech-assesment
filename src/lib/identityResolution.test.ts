import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { identityResolution } from "./identityResolution";
import type { ShopifyWebhookPayload } from "@/types";

vi.mock("@/lib/db", () => ({
  prisma: {
    identitySignal: { findMany: vi.fn() },
    customer: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockFindMany = vi.mocked(prisma.identitySignal.findMany);
const mockCustomerCreate = vi.mocked(prisma.customer.create);
const mockTransaction = vi.mocked(prisma.$transaction);

const shopifyOrder: ShopifyWebhookPayload = {
  source: "shopify",
  id: "order_1",
  customer_id: "cust_shopify_1",
  email: "jane@example.com",
  phone: "+61411000000",
  device_id: "dev_abc",
  created_at: "2026-05-12T10:00:00Z",
};

const nullShopifyOrder: ShopifyWebhookPayload = {
  source: "shopify",
  id: "order_2",
  customer_id: null,
  email: null,
  phone: null,
  device_id: null,
  created_at: "2026-05-12T10:00:00Z",
};

describe("identityResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({ customer: { create: mockCustomerCreate } })
    );
  });

  it("2.1 - no signal matches creates a new customer and returns its ID", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_1", createdAt: new Date(), updatedAt: new Date() });

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).toHaveBeenCalledWith({ data: {} });
    expect(result).toBe("new_cust_1");
  });

  it("2.2 - single match returns the matched customer ID", async () => {
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_existing", type: "email", value: "jane@example.com" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(result).toBe("cust_existing");
  });

  it("2.3 - multiple matches returns the first matched customer ID", async () => {
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_a", type: "email", value: "jane@example.com" },
      { customerId: "cust_b", type: "phone", value: "+61411000000" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(result).toBe("cust_a");
  });

  it("2.4 - all-null signals creates a new customer and returns its ID", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_2", createdAt: new Date(), updatedAt: new Date() });

    const result = await identityResolution(nullShopifyOrder);

    expect(result).toBe("new_cust_2");
  });
});
