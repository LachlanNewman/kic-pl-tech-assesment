import { getCustomerProfile } from "@/lib/getCustomerProfiles";
import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  logger.info("GET /api/customers: running");
  const searchParams = _req.nextUrl.searchParams;

  const identitySignalValue = searchParams.get("q");

  if(!identitySignalValue) {
    logger.warn("GET /api/customers: Missing query parameter 'q'");
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const customers = await getCustomerProfile(identitySignalValue);

  return NextResponse.json({ customers });
}
