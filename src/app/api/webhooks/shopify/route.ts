import { NextRequest, NextResponse } from "next/server";
import { ShopifyOrderSchema } from "@/types";
import { normalizeSignals } from "@/lib/signals";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  logger.info("POST /api/webhooks/shopify: running");
  const body = await req.json();

  const result = ShopifyOrderSchema.safeParse(body);

  if (!result.success) {
    logger.error({ errors: result.error.flatten() }, "POST /api/webhooks/shopify: invalid payload");
    return NextResponse.json(
      { error: "Invalid payload", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const signals = normalizeSignals({
    source: "shopify",
    signals: {
      email: result.data.email,
      phone: result.data.phone,
      device_id: result.data.device_id,
      shopify_customer_id: result.data.customer_id,
    },
  });

  logger.debug({ orderId: result.data.id, signalCount: signals.length }, "POST /api/webhooks/shopify: processed");
  return NextResponse.json({ received: true });
}
