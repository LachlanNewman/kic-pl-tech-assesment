import { describe, it, expect } from "vitest";
import { groupSignalsByCustomers } from "./groupSignalsByCustomer";
import { IdentitySignal } from "@prisma/client";

describe("groupSignalsByCustomers", () => {
  it("returns empty array for empty input", () => {
    expect(groupSignalsByCustomers([])).toEqual([]);
  });

  it("returns one entry per customer with the signal when only one row per customer", () => {
    const rows: IdentitySignal[] = [
      { customerId: "cust_1", type: "email", value: "jane@example.com", confidence: 3, id: "sig_1", createdAt: new Date() },
    ];

    const result = groupSignalsByCustomers(rows);

    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe("cust_1");
    expect(result[0].matchedSignals).toHaveLength(1);
    expect(result[0].matchedSignals[0]).toMatchObject({ type: "email", value: "jane@example.com", confidence: 3 });
  });

  it("groups all signals for the same customer when multiple rows match", () => {
    const rows: IdentitySignal[] = [
      { customerId: "cust_1", type: "device_id", value: "dev_abc", confidence: 2, id: "sig_1", createdAt: new Date() },
      { customerId: "cust_1", type: "email", value: "jane@example.com", confidence: 3, id: "sig_2", createdAt: new Date() },
    ];

    const result = groupSignalsByCustomers(rows);

    expect(result).toHaveLength(1);
    expect(result[0].matchedSignals).toHaveLength(2);
    expect(result[0].matchedSignals[0]).toMatchObject({ type: "device_id" });
    expect(result[0].matchedSignals[1]).toMatchObject({ type: "email" });
  });

  it("returns one entry per customer when rows span multiple customers", () => {
    const rows: IdentitySignal[] = [
      { customerId: "cust_a", type: "email", value: "alice@example.com", confidence: 3, id: "sig_1", createdAt: new Date() },
      { customerId: "cust_b", type: "phone", value: "+61411000000", confidence: 3, id: "sig_2", createdAt: new Date() },
    ];

    const result = groupSignalsByCustomers(rows);

    expect(result).toHaveLength(2);
    const a = result.find((m) => m.customerId === "cust_a");
    const b = result.find((m) => m.customerId === "cust_b");
    expect(a?.matchedSignals).toEqual([{ customerId: "cust_a", type: "email", value: "alice@example.com", confidence: 3, id: "sig_1", createdAt: expect.any(Date) }]);
    expect(b?.matchedSignals).toEqual([{ customerId: "cust_b", type: "phone", value: "+61411000000", confidence: 3, id: "sig_2", createdAt: expect.any(Date) }]);
  });
});
