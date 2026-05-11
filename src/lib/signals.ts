import { NormalizedInput, Signal } from "@/types";
import logger from "./logger";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

const DEFAULT_COUNTRY_CODE = "61";

function normalizePhone(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0")) return `+${DEFAULT_COUNTRY_CODE}${stripped.slice(1)}`;
  return `+${DEFAULT_COUNTRY_CODE}${stripped}`;
}

const FIELD_NORMALIZERS: Partial<Record<string, (value: string) => string>> = {
  email: normalizeEmail,
  phone: normalizePhone,
};

export function normalizeSignals(input: NormalizedInput): Signal[] {
  logger.info("normalizeSignals: running");
  logger.debug({ input }, "normalizeSignals: params");
  const signals: Signal[] = [];
  const normalizedFields: string[] = [];

  for (const [type, value] of Object.entries(input.signals)) {
    if (value == null) continue;
    const normalize = FIELD_NORMALIZERS[type];
    const normalized = normalize ? normalize(value) : value;
    if (normalize) normalizedFields.push(type);
    signals.push({ type, value: normalized });
  }

  logger.debug({ signalCount: signals.length, normalizedFields, signals }, "normalizeSignals: signals extracted");
  return signals;
}
