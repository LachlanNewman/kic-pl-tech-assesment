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
const mockCreateMany = vi.fn();
const mockSignalUpdateMany = vi.fn();
const mockEventUpdateMany = vi.fn();
const mockCustomerUpdateMany = vi.fn();
const mockEventCreate = vi.fn();

const shopifyOrder: ShopifyWebhookPayload = {
  source: "shopify",
  type: "order.created",
  id: "order_1",
  customer_id: "cust_shopify_1",
  email: "jane@example.com",
  phone: "+61411000000",
  device_id: "dev_abc",
  created_at: "2026-05-12T10:00:00Z",
};

const nullShopifyOrder: ShopifyWebhookPayload = {
  source: "shopify",
  type: "order.created",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation((fn: any) =>
      fn({
        customer: { create: mockCustomerCreate, updateMany: mockCustomerUpdateMany },
        identitySignal: { createMany: mockCreateMany, updateMany: mockSignalUpdateMany },
        event: { create: mockEventCreate, updateMany: mockEventUpdateMany },
      })
    );
  });

  it("2.1 - no signal matches creates a new customer, writes signals, writes event, and returns its ID", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_1", createdAt: new Date(), updatedAt: new Date() });
    mockCreateMany.mockResolvedValueOnce({ count: 4 });
    mockEventCreate.mockResolvedValueOnce({ id: "evt_1" });

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).toHaveBeenCalledWith({ data: {} });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { type: "email", value: "jane@example.com", customerId: "new_cust_1" },
        { type: "phone", value: "+61411000000", customerId: "new_cust_1" },
        { type: "device_id", value: "dev_abc", customerId: "new_cust_1" },
        { type: "shopify_customer_id", value: "cust_shopify_1", customerId: "new_cust_1" },
      ],
      skipDuplicates: true,
    });
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: {
        source: "shopify",
        type: "order.created",
        externalId: "order_1",
        payload: JSON.stringify(shopifyOrder),
        customerId: "new_cust_1",
        occurredAt: new Date("2026-05-12T10:00:00Z"),
      },
    });
    expect(result).toBe("new_cust_1");
  });

  it("2.2 - single match writes new signals, writes event, and returns the matched customer ID", async () => {
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_existing", type: "email", value: "jane@example.com" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);
    mockCreateMany.mockResolvedValueOnce({ count: 3 });
    mockEventCreate.mockResolvedValueOnce({ id: "evt_existing" });

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { type: "email", value: "jane@example.com", customerId: "cust_existing" },
        { type: "phone", value: "+61411000000", customerId: "cust_existing" },
        { type: "device_id", value: "dev_abc", customerId: "cust_existing" },
        { type: "shopify_customer_id", value: "cust_shopify_1", customerId: "cust_existing" },
      ],
      skipDuplicates: true,
    });
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: {
        source: "shopify",
        type: "order.created",
        externalId: "order_1",
        payload: JSON.stringify(shopifyOrder),
        customerId: "cust_existing",
        occurredAt: new Date("2026-05-12T10:00:00Z"),
      },
    });
    expect(result).toBe("cust_existing");
  });

  it("2.3 - multiple matches marks all loser records with mergedInto, and returns the winner ID", async () => {
    mockFindMany.mockResolvedValueOnce([
      { customerId: "cust_a", type: "email", value: "jane@example.com" },
      { customerId: "cust_b", type: "phone", value: "+61411000000" },
    ] as Awaited<ReturnType<typeof mockFindMany>>);

    const result = await identityResolution(shopifyOrder);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockEventCreate).not.toHaveBeenCalled();
    expect(mockSignalUpdateMany).toHaveBeenCalledWith({
      where: { customerId: { in: ["cust_b"] } },
      data: { mergedInto: "cust_a" },
    });
    expect(mockEventUpdateMany).toHaveBeenCalledWith({
      where: { customerId: { in: ["cust_b"] } },
      data: { mergedInto: "cust_a" },
    });
    expect(mockCustomerUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["cust_b"] } },
      data: { mergedInto: "cust_a" },
    });
    expect(result).toBe("cust_a");
  });

  it("2.4 - all-null signals creates a new customer with no signals, writes event, and returns its ID", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCustomerCreate.mockResolvedValueOnce({ id: "new_cust_2", createdAt: new Date(), updatedAt: new Date() });
    mockCreateMany.mockResolvedValueOnce({ count: 0 });
    mockEventCreate.mockResolvedValueOnce({ id: "evt_2" });

    const result = await identityResolution(nullShopifyOrder);

    expect(mockCreateMany).toHaveBeenCalledWith({ data: [], skipDuplicates: true });
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: {
        source: "shopify",
        type: "order.created",
        externalId: "order_2",
        payload: JSON.stringify(nullShopifyOrder),
        customerId: "new_cust_2",
        occurredAt: new Date("2026-05-12T10:00:00Z"),
      },
    });
    expect(result).toBe("new_cust_2");
  });
});
