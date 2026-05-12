import { vi, describe, it, expect, beforeEach } from "vitest";
import { createEvent } from "./createEvent";
import { TransactionClient } from "../db";
import type { NormalizedInput, ShopifyWebhookPayload, MindbodyWebhookPayload } from "@/types";

const mockCreate = vi.fn();

const tx = {
  event: { create: mockCreate },
} as unknown as TransactionClient;

const shopifyInput: NormalizedInput = {
  source: "shopify",
  signals: { email: "jane@example.com", phone: "+61411000000" },
};

const shopifyPayload: ShopifyWebhookPayload = {
  source: "shopify",
  type: "order.created",
  id: "order_1",
  customer_id: "cust_shopify_1",
  email: "jane@example.com",
  phone: "+61411000000",
  device_id: "dev_abc",
  created_at: "2026-05-12T10:00:00Z",
};

const mindbodyInput: NormalizedInput = {
  source: "mindbody",
  signals: { mindbody_client_id: "mb_client_1" },
};

const mindbodyPayload: MindbodyWebhookPayload = {
  source: "mindbody",
  type: "booking.created",
  id: "booking_1",
  client_id: "mb_client_1",
  client_email: "jane@example.com",
  phone: "+61411000000",
  class_name: "Reformer Pilates",
  scheduled_at: "2026-05-12T09:00:00Z",
};

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "evt_1" });
  });

  it("creates a shopify event with occurredAt from created_at", async () => {
    await createEvent(tx, shopifyInput, shopifyPayload, "cust_1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        source: "shopify",
        type: "order.created",
        externalId: "order_1",
        payload: JSON.stringify(shopifyPayload),
        customerId: "cust_1",
        occurredAt: new Date("2026-05-12T10:00:00Z"),
      },
    });
  });

  it("creates a mindbody event with occurredAt from scheduled_at", async () => {
    await createEvent(tx, mindbodyInput, mindbodyPayload, "cust_2");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        source: "mindbody",
        type: "booking.created",
        externalId: "booking_1",
        payload: JSON.stringify(mindbodyPayload),
        customerId: "cust_2",
        occurredAt: new Date("2026-05-12T09:00:00Z"),
      },
    });
  });

  it("propagates errors thrown by event.create", async () => {
    mockCreate.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      createEvent(tx, shopifyInput, shopifyPayload, "cust_1")
    ).rejects.toThrow("database unavailable");
  });
});
