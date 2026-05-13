import { describe, it, expect } from "vitest";
import { getSignalConfidence, SIGNAL_CONFIDENCE } from "./signalConfig";

describe("getSignalConfidence", () => {
  it("returns HIGH (3) for email", () => {
    expect(getSignalConfidence("email")).toBe(SIGNAL_CONFIDENCE.HIGH);
  });

  it("returns HIGH (3) for phone", () => {
    expect(getSignalConfidence("phone")).toBe(SIGNAL_CONFIDENCE.HIGH);
  });

  it("returns HIGH (3) for shopify_customer_id", () => {
    expect(getSignalConfidence("shopify_customer_id")).toBe(SIGNAL_CONFIDENCE.HIGH);
  });

  it("returns HIGH (3) for mindbody_client_id", () => {
    expect(getSignalConfidence("mindbody_client_id")).toBe(SIGNAL_CONFIDENCE.HIGH);
  });

  it("returns MEDIUM (2) for device_id", () => {
    expect(getSignalConfidence("device_id")).toBe(SIGNAL_CONFIDENCE.MEDIUM);
  });

  it("returns LOW (1) for unknown signal types", () => {
    expect(getSignalConfidence("unknown_type")).toBe(SIGNAL_CONFIDENCE.LOW);
    expect(getSignalConfidence("")).toBe(SIGNAL_CONFIDENCE.LOW);
  });
});
