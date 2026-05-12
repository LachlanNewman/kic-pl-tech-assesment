import { TransactionClient } from "../db";
import { NormalizedInput, WebhookPayload } from "@/types";
import logger from "../logger";

function getEventOccurredAt(payload: WebhookPayload): Date {
  switch (payload.source) {
    case "shopify":
      return new Date(payload.created_at);
    case "mindbody":
      return new Date(payload.scheduled_at);
    default:
      throw new Error("unreachable: unknown payload source");
  }
}

export async function createEvent(
  tx: TransactionClient,
  input: NormalizedInput,
  payload: WebhookPayload,
  customerId: string
): Promise<void> {
  logger.info("createEvent: running");
  logger.debug({ source: input.source, type: payload.type, customerId }, "createEvent: params");

  const externalId = payload.id;
  const occurredAt = getEventOccurredAt(payload);

  await tx.event.create({
    data: {
      source: input.source,
      type: payload.type,
      externalId,
      payload: JSON.stringify(payload),
      customerId,
      occurredAt,
    },
  });

  logger.debug({ customerId, externalId }, "createEvent: event written");
}
