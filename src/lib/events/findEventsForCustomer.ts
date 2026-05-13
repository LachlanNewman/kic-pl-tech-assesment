import { Event } from "@prisma/client";
import { TransactionClient } from "../db";

export async function findEventsForCustomer(tx: TransactionClient, customerId: string): Promise<Event[]>{
    return tx.event.findMany({
        where: { customerId },
    });
    }   
