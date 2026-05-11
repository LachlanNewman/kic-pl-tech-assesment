import { NextRequest, NextResponse } from "next/server";
import { MindbodyBookingSchema } from "@/types";
import z from "zod/v4";
import { normalizeSignals } from "@/lib/signals";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  logger.info("POST /api/webhooks/mindbody: running");
  const body = await req.json();

  const result = MindbodyBookingSchema.safeParse(body);

  if (!result.success) {
    logger.error({ errors: z.treeifyError(result.error) }, "POST /api/webhooks/mindbody: invalid payload");
    return NextResponse.json(
      { error: "Invalid payload", details: z.treeifyError(result.error) },
      { status: 400 }
    );
  }

  const signals = normalizeSignals({
    source: "mindbody",
    signals: {
      email: result.data.client_email,
      phone: result.data.phone,
      mindbody_client_id: result.data.client_id,
    },
  });

  logger.debug({ bookingId: result.data.id, signalCount: signals.length }, "POST /api/webhooks/mindbody: processed");
  return NextResponse.json({ received: true });
}
