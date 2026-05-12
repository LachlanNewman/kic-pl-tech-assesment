import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { findEventByExternalId } from "./findEventByExternalId";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
  },
}));

const mockFindUnique = vi.mocked(prisma.event.findUnique);

describe("findEventByExternalId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the customerId when the event exists", async () => {
    mockFindUnique.mockResolvedValueOnce({ customerId: "cust_1" } as Awaited<ReturnType<typeof mockFindUnique>>);

    const result = await findEventByExternalId("order_123");

    expect(result).toBe("cust_1");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { externalId: "order_123" },
      select: { customerId: true },
    });
  });

  it("returns null when no event exists", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await findEventByExternalId("order_unknown");

    expect(result).toBeNull();
  });
});
