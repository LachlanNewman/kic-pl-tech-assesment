import { z } from "zod/v4";

export const ShopifyOrderSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  device_id: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

export const MindbodyBookingSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_email: z.string().email().nullable(),
  phone: z.string().nullable(),
  class_name: z.string(),
  scheduled_at: z.string().datetime(),
});

export type MindbodyBooking = z.infer<typeof MindbodyBookingSchema>;
