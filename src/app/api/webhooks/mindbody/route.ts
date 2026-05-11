import { NextRequest, NextResponse } from "next/server";
import { MindbodyBookingSchema } from "@/types";
import z from "zod/v4";

export async function POST(req: NextRequest) {
  console.log("[mindbody] received webhook");
  const body = await req.json();
  const result = MindbodyBookingSchema.safeParse(body);

  if (!result.success) {
    console.error("[mindbody] invalid payload", z.treeifyError(result.error));
    return NextResponse.json(
      { error: "Invalid payload", details: z.treeifyError(result.error) },
      { status: 400 }
    );
  }

  console.log("[mindbody] payload valid, booking id:", result.data.id);
  return NextResponse.json({ received: true });
}
