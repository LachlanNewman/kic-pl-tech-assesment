import { Customer, Event, IdentitySignal } from "@prisma/client";
import { z } from "zod/v4";

export type Signal = {
  type: string;
  value: string;
};

export type CustomerSignalMatch = {
  customerId: string;
  matchedSignals: IdentitySignal[];
};

export type SignalFields = {
  email?: string | null;
  phone?: string | null;
  device_id?: string | null;
  shopify_customer_id?: string | null;
  mindbody_client_id?: string | null;
};

export type NormalizedInput = {
  source: "shopify" | "mindbody";
  signals: SignalFields;
};

export type CustomerProfile = Customer & { events: Event[] };


export const ShopifyOrderSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  device_id: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

export const MindbodyBookingSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_email: z.email().nullable(),
  phone: z.string().nullable(),
  class_name: z.string(),
  scheduled_at: z.string().datetime(),
});

export type MindbodyBooking = z.infer<typeof MindbodyBookingSchema>;

export type ShopifyWebhookPayload = ShopifyOrder & { source: "shopify"; type: "order.created" };
export type MindbodyWebhookPayload = MindbodyBooking & { source: "mindbody"; type: "booking.created" };
export type WebhookPayload = ShopifyWebhookPayload | MindbodyWebhookPayload;
