export const SIGNAL_CONFIDENCE = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
} as const;

export type SignalConfidenceValue = (typeof SIGNAL_CONFIDENCE)[keyof typeof SIGNAL_CONFIDENCE];

// Maps each known signal type to its confidence score.
// Deterministic signals (stable platform IDs, phone, email) are high.
// Probabilistic signals (shared devices, reinstalls) are medium.
export const SIGNAL_TYPE_CONFIDENCE: Record<string, SignalConfidenceValue> = {
  email: SIGNAL_CONFIDENCE.HIGH,
  phone: SIGNAL_CONFIDENCE.HIGH,
  shopify_customer_id: SIGNAL_CONFIDENCE.HIGH,
  mindbody_client_id: SIGNAL_CONFIDENCE.HIGH,
  device_id: SIGNAL_CONFIDENCE.MEDIUM,
};

export function getSignalConfidence(type: string): SignalConfidenceValue {
  return SIGNAL_TYPE_CONFIDENCE[type] ?? SIGNAL_CONFIDENCE.LOW;
}
