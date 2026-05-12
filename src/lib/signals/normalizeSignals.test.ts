import { describe, it, expect } from "vitest";
import { normalizeSignals } from "./normalizeSignals";
import { NormalizedInput } from "@/types";

describe("normalizeSignals", () => {
  it("returns all signals when all fields are non-null", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: {
        email: "jane@example.com",
        phone: "+61411000000",
        device_id: "dev_abc",
        shopify_customer_id: "cust_xyz",
      },
    };
    const signals = normalizeSignals(input);
    expect(signals).toHaveLength(4);
    expect(signals).toContainEqual({ type: "email", value: "jane@example.com" });
    expect(signals).toContainEqual({ type: "phone", value: "+61411000000" });
    expect(signals).toContainEqual({ type: "device_id", value: "dev_abc" });
    expect(signals).toContainEqual({ type: "shopify_customer_id", value: "cust_xyz" });
  });

  it("returns empty array when all nullable fields are null", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: {
        email: null,
        phone: null,
        device_id: null,
        shopify_customer_id: null,
        mindbody_client_id: null,
      },
    };
    expect(normalizeSignals(input)).toEqual([]);
  });

  it("returns only non-null signals for partial input", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: {
        email: "jane@example.com",
        phone: null,
        device_id: null,
        shopify_customer_id: null,
      },
    };
    const signals = normalizeSignals(input);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toEqual({ type: "email", value: "jane@example.com" });
  });

  it("Shopify source produces shopify_customer_id, no mindbody_client_id", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: {
        shopify_customer_id: "cust_xyz",
        email: null,
        phone: null,
        device_id: null,
      },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "shopify_customer_id", value: "cust_xyz" });
    expect(signals.find((s) => s.type === "mindbody_client_id")).toBeUndefined();
  });

  it("Mindbody source produces mindbody_client_id, no device_id", () => {
    const input: NormalizedInput = {
      source: "mindbody",
      signals: {
        mindbody_client_id: "mb_client_xyz",
        email: null,
        phone: null,
      },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "mindbody_client_id", value: "mb_client_xyz" });
    expect(signals.find((s) => s.type === "device_id")).toBeUndefined();
  });

  it("normalizes email to lowercase and trimmed", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: { email: "  Jane.Doe@Example.COM  " },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "email", value: "jane.doe@example.com" });
  });

  it("normalizes local Australian phone (0x) to E.164 +61", () => {
    const input: NormalizedInput = {
      source: "mindbody",
      signals: { phone: "(04) 1100-0000" },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "phone", value: "+61411000000" });
  });

  it("preserves existing + prefix on international numbers", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: { phone: "+61411000000" },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "phone", value: "+61411000000" });
  });

  it("adds +61 prefix to bare digits with no leading 0", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: { phone: "411000000" },
    };
    const signals = normalizeSignals(input);
    expect(signals).toContainEqual({ type: "phone", value: "+61411000000" });
  });

  it("every returned signal conforms to { type: string; value: string }", () => {
    const input: NormalizedInput = {
      source: "shopify",
      signals: {
        email: "jane@example.com",
        phone: "+61411000000",
        shopify_customer_id: "cust_xyz",
      },
    };
    const signals = normalizeSignals(input);
    for (const signal of signals) {
      expect(typeof signal.type).toBe("string");
      expect(typeof signal.value).toBe("string");
    }
  });
});
