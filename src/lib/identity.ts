import { Signal, CustomerSignalMatch } from "@/types";
import { prisma } from "./db";
import logger from "./logger";

export async function getCustomerIdsFromSignals(signals: Signal[]): Promise<CustomerSignalMatch[]> {
  logger.info("getCustomerIdsFromSignals: running");
  logger.debug({ signals }, "getCustomerIdsFromSignals: params");

  if (signals.length === 0) {
    logger.debug({}, "getCustomerIdsFromSignals: empty signals, returning early");
    return [];
  }

  const rows = await prisma.identitySignal.findMany({
    where: { OR: signals.map((s) => ({ type: s.type, value: s.value })) },
    select: { customerId: true, type: true, value: true },
  });

  logger.debug({ rowCount: rows.length }, "getCustomerIdsFromSignals: rows fetched");

  const grouped = new Map<string, Signal[]>();
  for (const row of rows) {
    const existing = grouped.get(row.customerId);
    if (existing) {
      existing.push({ type: row.type, value: row.value });
    } else {
      grouped.set(row.customerId, [{ type: row.type, value: row.value }]);
    }
  }

  const result: CustomerSignalMatch[] = Array.from(grouped.entries()).map(
    ([customerId, matchedSignals]) => ({ customerId, matchedSignals })
  );

  logger.debug({ matchCount: result.length }, "getCustomerIdsFromSignals: returning matches");
  return result;
}
