import { TransactionClient } from "../db";

export async function mergeSignal(tx: TransactionClient, winnerId: string, loserId: string){
          return tx.identitySignal.updateMany({
            where: { customerId: loserId },
            data: { customerId: winnerId },
          });
        }          