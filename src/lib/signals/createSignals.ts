import { TransactionClient } from "../db";
import { Signal } from "@/types";
import logger from "../logger";
import { getSignalConfidence } from "./signalConfig";

export async function createSignals(
  tx: TransactionClient,
  customerId: string,
  signals: Signal[]
): Promise<void> {
  logger.info("createSignals: running");
  logger.debug({ customerId, signals }, "createSignals: params");

  await tx.identitySignal.createMany({
    data: signals.map((s) => ({ type: s.type, value: s.value, confidence: getSignalConfidence(s.type), customerId })),
  });

  logger.debug({ customerId, count: signals.length }, "createSignals: signals written");
}
