import { NextRequest, NextResponse } from 'next/server';
import { ShopifyOrderSchema } from '@/types';
import { identityResolution } from '@/lib/identityResolution';
import logger from '@/lib/logger';
import { errors, HttpError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  logger.info('POST /api/webhooks/shopify: running');
  const body = await req.json();

  const result = ShopifyOrderSchema.safeParse(body);

  if (!result.success) {
    logger.error({ errors: result.error.flatten() }, 'POST /api/webhooks/shopify: invalid payload');
    return NextResponse.json(
      { error: 'Invalid payload', details: result.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const customerId = await identityResolution({
      source: 'shopify',
      type: 'order.created',
      ...result.data,
    });

    logger.debug({ orderId: result.data.id, customerId }, 'POST /api/webhooks/shopify: processed');
    return NextResponse.json({ received: true });
  } catch (e) {
    const error = HttpError.fromError(e, errors.unknownError);
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
}
