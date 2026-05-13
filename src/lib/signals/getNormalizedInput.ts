import { WebhookPayload, NormalizedInput } from '@/types';
import logger from '../logger';

export function getNormalizedInput(payload: WebhookPayload): NormalizedInput {
  logger.info('getNormalizedInput: running');
  logger.debug({ source: payload.source }, 'getNormalizedInput: params');

  switch (payload.source) {
    case 'shopify':
      logger.debug({}, 'getNormalizedInput: shopify payload');
      return {
        source: 'shopify',
        signals: {
          email: payload.email,
          phone: payload.phone,
          device_id: payload.device_id,
          shopify_customer_id: payload.customer_id,
        },
      };
    case 'mindbody':
      logger.debug({}, 'getNormalizedInput: mindbody payload');
      return {
        source: 'mindbody',
        signals: {
          email: payload.client_email,
          phone: payload.phone,
          mindbody_client_id: payload.client_id,
        },
      };
    default: {
      const _exhaustive: never = payload;
      const source = (_exhaustive as { source: string }).source;
      logger.error({ source }, 'getNormalizedInput: unknown source');
      throw new Error(`getNormalizedInput: unknown source: ${source}`);
    }
  }
}
