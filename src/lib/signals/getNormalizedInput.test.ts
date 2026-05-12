import { describe, it, expect } from "vitest";
import { getNormalizedInput } from "./getNormalizedInput";
import type { ShopifyWebhookPayload, MindbodyWebhookPayload } from "@/types";

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

const mindbodyBooking: MindbodyWebhookPayload = {
  source: "mindbody",
  type: "booking.created",
  id: "booking_1",
  client_id: "mb_client_1",
  client_email: "jane@example.com",
  phone: "+61411000000",
  class_name: "Reformer Pilates",
  scheduled_at: "2026-05-12T09:00:00Z",
};

describe("getNormalizedInput", () => {
  it("maps a ShopifyOrder to a shopify NormalizedInput", () => {
    const result = getNormalizedInput(shopifyOrder);

    expect(result.source).toBe("shopify");
    expect(result.signals.email).toBe("jane@example.com");
    expect(result.signals.phone).toBe("+61411000000");
    expect(result.signals.device_id).toBe("dev_abc");
    expect(result.signals.shopify_customer_id).toBe("cust_shopify_1");
  });

  it("maps a MindbodyBooking to a mindbody NormalizedInput", () => {
    const result = getNormalizedInput(mindbodyBooking);

    expect(result.source).toBe("mindbody");
    expect(result.signals.email).toBe("jane@example.com");
    expect(result.signals.phone).toBe("+61411000000");
    expect(result.signals.mindbody_client_id).toBe("mb_client_1");
  });

  it("throws for an unknown source", () => {
    const unknown = { source: "unknown" } as unknown as ShopifyWebhookPayload;

    expect(() => getNormalizedInput(unknown)).toThrow("getNormalizedInput: unknown source: unknown");
  });
});
