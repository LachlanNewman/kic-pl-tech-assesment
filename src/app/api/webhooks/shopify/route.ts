import { NextRequest, NextResponse } from "next/server";
import { ShopifyOrderSchema } from "@/types";

export async function POST(req: NextRequest) {
  console.log("[shopify] received webhook");
  const body = await req.json();
  const result = ShopifyOrderSchema.safeParse(body);

  if (!result.success) {
    console.error("[shopify] invalid payload", result.error.flatten());
    return NextResponse.json(
      { error: "Invalid payload", details: result.error.flatten() },
      { status: 400 }
    );
  }

  console.log("[shopify] payload valid, order id:", result.data.id);
  return NextResponse.json({ received: true });
}
