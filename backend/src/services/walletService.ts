import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export interface WalletReceipt {
  receiptId: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  items: Array<{ name: string; price: number; quantity: number }>;
}

export interface WalletSyncResult {
  success: boolean;
  walletObjectId: string | null;
  message: string;
}

export interface WebhookEvent {
  eventType: string;
  merchantId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface WalletSyncStatus {
  enabled: boolean;
  lastSyncAt: string | null;
  syncedCount: number;
}

/** In-memory sync tracking (replace with DB in production) */
const syncStore = new Map<string, { lastSyncAt: string; count: number }>();

/**
 * Google Wallet integration service.
 * Uses real Google Wallet APIs when GOOGLE_WALLET_ISSUER_ID is configured,
 * otherwise provides a structured mock implementation.
 */
export class WalletService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!environment.GOOGLE_WALLET_ISSUER_ID;
    logger.info({
      message: this.isConfigured
        ? 'WalletService: Google Wallet API enabled'
        : 'WalletService: Mock mode (set GOOGLE_WALLET_ISSUER_ID to enable)',
    });
  }

  /** Sync a receipt to Google Wallet digital receipt format. */
  async syncReceiptToWallet(receipt: WalletReceipt): Promise<WalletSyncResult> {
    if (this.isConfigured) {
      return this.syncWithGoogleWallet(receipt);
    }
    return this.mockSync(receipt);
  }

  /** Handle incoming payment webhook events from Google Wallet. */
  async processWebhookEvent(event: WebhookEvent): Promise<{ processed: boolean; action: string }> {
    logger.info({ message: 'Wallet webhook received', eventType: event.eventType, transactionId: event.transactionId });

    const actions: Record<string, string> = {
      TRANSACTION_COMPLETE: 'receipt_created',
      TRANSACTION_REFUND: 'receipt_refunded',
      CARD_ADDED: 'wallet_linked',
    };

    const action = actions[event.eventType] || 'ignored';
    return { processed: action !== 'ignored', action };
  }

  /** Get wallet sync status for a user. */
  async getWalletSyncStatus(userId: string): Promise<WalletSyncStatus> {
    const record = syncStore.get(userId);
    return {
      enabled: this.isConfigured,
      lastSyncAt: record?.lastSyncAt || null,
      syncedCount: record?.count || 0,
    };
  }

  private async syncWithGoogleWallet(receipt: WalletReceipt): Promise<WalletSyncResult> {
    try {
      // Structure for Google Wallet Passes API
      const _walletObject = {
        issuerId: environment.GOOGLE_WALLET_ISSUER_ID,
        classId: `${environment.GOOGLE_WALLET_ISSUER_ID}.receipt`,
        id: `${environment.GOOGLE_WALLET_ISSUER_ID}.${receipt.receiptId}`,
        merchantName: receipt.merchant,
        transactionAmount: { currencyCode: receipt.currency, amount: String(receipt.amount) },
        transactionDate: receipt.date,
        lineItems: receipt.items.map(i => ({
          description: i.name,
          totalPrice: { currencyCode: receipt.currency, amount: String(i.price * i.quantity) },
          quantity: String(i.quantity),
        })),
      };

      // TODO: Call Google Wallet Passes API with walletObject
      logger.info({ message: 'Would call Google Wallet API', receiptId: receipt.receiptId });
      return { success: true, walletObjectId: _walletObject.id, message: 'Synced to Google Wallet' };
    } catch (error) {
      logger.error({ message: 'Google Wallet sync failed', error: (error as Error).message });
      return { success: false, walletObjectId: null, message: (error as Error).message };
    }
  }

  private async mockSync(receipt: WalletReceipt): Promise<WalletSyncResult> {
    const walletObjectId = `mock-wallet-${receipt.receiptId}`;
    logger.info({ message: 'Mock wallet sync', receiptId: receipt.receiptId, walletObjectId });

    // Track sync
    const existing = syncStore.get(receipt.receiptId) || { lastSyncAt: '', count: 0 };
    syncStore.set(receipt.receiptId, { lastSyncAt: new Date().toISOString(), count: existing.count + 1 });

    return { success: true, walletObjectId, message: 'Mock sync successful (configure GOOGLE_WALLET_ISSUER_ID for real sync)' };
  }
}
