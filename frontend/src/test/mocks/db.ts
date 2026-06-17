/**
 * Tiny in-memory store used by the MSW handlers so tests can do realistic
 * CRUD flows ("create then list then delete then 404") without rebuilding
 * the whole network mock.
 */
import type { Receipt } from '@/features/receipts/types';

class ReceiptDB {
  private receipts: Receipt[] = [];

  list(): Receipt[] {
    return [...this.receipts];
  }

  findById(id: string): Receipt | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  add = (r: Receipt): Receipt => {
    this.receipts.unshift(r);
    return r;
  };

  update(updated: Receipt): Receipt {
    const idx = this.receipts.findIndex((r) => r.id === updated.id);
    if (idx === -1) throw new Error(`No receipt with id ${updated.id}`);
    this.receipts[idx] = updated;
    return updated;
  }

  remove(id: string): boolean {
    const before = this.receipts.length;
    this.receipts = this.receipts.filter((r) => r.id !== id);
    return this.receipts.length < before;
  }

  clear(): void {
    this.receipts = [];
  }
}

export const receiptDB = new ReceiptDB();
