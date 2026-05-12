import { NextRequest, NextResponse } from "next/server";
import { MindbodyBookingSchema } from "@/types";
import z from "zod/v4";
import { identityResolution } from "@/lib/identityResolution";
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

  const customerId = await identityResolution({ source: "mindbody", ...result.data });

  logger.debug({ bookingId: result.data.id, customerId }, "POST /api/webhooks/mindbody: processed");
  return NextResponse.json({ received: true });
}
