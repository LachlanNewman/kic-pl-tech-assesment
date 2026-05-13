import { CustomerSignalMatch, Signal } from "@/types";
import logger from "../logger";
import { prisma } from "../db";

export async function getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]> {
  logger.info("getCustomerIdsFromSignals: running");
  logger.debug({ signals }, "getCustomerIdsFromSignals: params");

  if (signals.length === 0) {
    logger.debug({}, "getCustomerIdsFromSignals: empty signals, returning early");
    return [];
  }

  const rows = await prisma.identitySignal.findMany({
    where: { OR: signals.map((s) => ({ type: s.type, value: s.value })) },
    select: { customerId: true, type: true, value: true, confidence: true },
  });

  logger.debug({ rowCount: rows.length }, "getCustomerIdsFromSignals: rows fetched");

  const bestByCustomer = new Map<string, { type: string; value: string; confidence: number }>();
  for (const row of rows) {
    const existing = bestByCustomer.get(row.customerId);
    if (!existing || row.confidence > existing.confidence) {
      bestByCustomer.set(row.customerId, { type: row.type, value: row.value, confidence: row.confidence });
    }
  }

  const result: CustomerSignalMatch[] = Array.from(bestByCustomer.entries()).map(
    ([customerId, best]) => ({ customerId, matchedSignals: [{ type: best.type, value: best.value }] })
  );

  logger.debug({ matchCount: result.length }, "getCustomerIdsFromSignals: returning matches");
  return result;
}