import { Signal } from "@/types";
import { prisma } from "../db";
import logger from "../logger";
import { IdentitySignal } from "@prisma/client";

export async function findSignalsByValues(signals: Signal[]): Promise<IdentitySignal[]> {
  logger.info("findSignalsByValues: running");
  logger.debug({ signals }, "findSignalsByValues: params");

  const rows = await prisma.identitySignal.findMany({
    where: { OR: signals.map((s) => ({ type: s.type, value: s.value })) },
  });

  logger.debug({ rowCount: rows.length }, "findSignalsByValues: returning rows");
  return rows;
}
