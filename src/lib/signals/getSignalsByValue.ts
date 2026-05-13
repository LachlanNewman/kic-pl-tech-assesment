import { IdentitySignal } from "@prisma/client";
import { prisma } from "../db";

export async function getSignalsByValue(value: string): Promise<IdentitySignal[]> {
    return prisma.identitySignal.findMany({
        where: { value },
    });
}