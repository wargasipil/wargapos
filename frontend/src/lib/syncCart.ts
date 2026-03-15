import { transactionClient } from '../client'

export interface SyncCartItem {
  productId: bigint
  qty: number
  notes?: string
}

export async function syncCartToServer(
  sessionId: string,
  tableId: bigint,
  items: SyncCartItem[],
): Promise<void> {
  for (const item of items) {
    await transactionClient.addToCart({
      sessionId,
      productId: item.productId,
      quantity: item.qty,
      tableId,
      notes: item.notes ?? '',
    })
  }
}
