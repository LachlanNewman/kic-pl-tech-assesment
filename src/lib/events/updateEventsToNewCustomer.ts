import { TransactionClient } from "../db";
import logger from "../logger";

export async function updateEventsToNewCustomer(tx: TransactionClient, oldCustomerId: string, newCustomerId: string){
    logger.info("updateEventToNewCustomer: running");
    return tx.event.updateMany({
        where: { customerId: oldCustomerId },
        data: { customerId: newCustomerId },
    });
}