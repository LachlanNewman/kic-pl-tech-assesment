import { CustomerSignalMatch } from "@/types";
import logger from "../logger";
import { IdentitySignal } from "@prisma/client";

export function groupSignalsByCustomers(rows: IdentitySignal[]): CustomerSignalMatch[] {
  logger.info("groupSignalsByCustomers: running");
  logger.debug({ rowCount: rows.length }, "groupSignalsByCustomers: params");

  const customerSignalMap = new Map<string, number>();
  const customerSignals: CustomerSignalMatch[] = [];
  for (const row of rows) {
    const index = customerSignalMap.get(row.customerId);
    if (index === undefined) {
      customerSignalMap.set(row.customerId, customerSignals.length);
      customerSignals.push({ customerId: row.customerId, matchedSignals: [row] });
    }
    else{
      customerSignals[index].matchedSignals.push(row);
    }
  }

  return customerSignals;
}
