import { Customer } from "@prisma/client";
import { prisma } from "../db";
import logger from "../logger";
import { CustomerProfile } from "@/types";

export async function getCustomerProfiles(customers: string[]) : Promise<CustomerProfile[]> {
    logger.info("getCustomerProfiles: running");
  return prisma.customer.findMany({
    where: { id: { in: customers } },
    include: { events: true }
  })
}