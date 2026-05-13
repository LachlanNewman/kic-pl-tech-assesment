import { TransactionClient } from "../db";
import logger from "../logger";

export async function setCustomerAsMerged(tx: TransactionClient, mergeInto: string,loser: string){
    logger.info("setCustomerAsMerged: running");
    await tx.customer.update({
        where: { id: loser },
        data: { mergedInto: mergeInto },
    });
}