import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import { getPool } from '../config/database.js';
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
  saveUrl: string | null;
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
  syncedReceiptIds: string[];
}

export class WalletService {
  private isConfigured: boolean;
  private serviceAccountKey: any = null;

  constructor() {
    this.isConfigured = !!environment.GOOGLE_WALLET_ISSUER_ID;

    if (this.isConfigured && environment.GOOGLE_CLOUD_KEY_FILE) {
      try {
        const keyPath = environment.GOOGLE_CLOUD_KEY_FILE.startsWith('/')
          ? environment.GOOGLE_CLOUD_KEY_FILE
          : `${process.cwd()}/${environment.GOOGLE_CLOUD_KEY_FILE}`;
        this.serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        logger.info({ message: 'WalletService: Google Wallet API enabled' });
      } catch (e) {
        logger.error({ message: 'WalletService: Failed to read service account key', error: (e as Error).message });
        this.isConfigured = false;
      }
    }

    if (!this.isConfigured) {
      logger.info({ message: 'WalletService: Not configured (set GOOGLE_WALLET_ISSUER_ID)' });
    }
  }

  async syncReceiptToWallet(userId: string, receipt: WalletReceipt): Promise<WalletSyncResult> {
    if (!this.isConfigured || !this.serviceAccountKey) {
      return { success: false, walletObjectId: null, saveUrl: null, message: 'Wallet not configured' };
    }

    try {
      const issuerId = environment.GOOGLE_WALLET_ISSUER_ID;
      const classId = `${issuerId}.paytrack_receipt`;
      const objectId = `${issuerId}.receipt_${receipt.receiptId.replace(/-/g, '')}`;

      const genericObject = {
        id: objectId,
        classId,
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        header: { defaultValue: { value: receipt.merchant, language: 'en' } },
        subheader: { defaultValue: { value: `Receipt - ${receipt.date}`, language: 'en' } },
        cardTitle: { defaultValue: { value: 'PayTrack Receipt', language: 'en' } },
        hexBackgroundColor: '#4338ca',
        logo: { sourceUri: { uri: 'https://www.gstatic.com/wallet/receipt.png' } },
        textModulesData: [
          { id: 'amount', header: 'Amount', body: `${receipt.currency} ${receipt.amount.toFixed(2)}` },
          { id: 'date', header: 'Date', body: receipt.date },
          ...(receipt.items.length > 0 ? [{
            id: 'items', header: 'Items',
            body: receipt.items.map(i => `${i.name} × ${i.quantity} — ${receipt.currency} ${(i.price * i.quantity).toFixed(2)}`).join('\n'),
          }] : []),
        ],
        barcode: { type: 'QR_CODE', value: objectId },
      };

      const genericClass = { id: classId, genericType: 'GENERIC_TYPE_UNSPECIFIED' };

      const claims = {
        iss: this.serviceAccountKey.client_email,
        aud: 'google',
        origins: ['http://localhost:5173'],
        typ: 'savetowallet',
        payload: { genericClasses: [genericClass], genericObjects: [genericObject] },
      };

      const token = jwt.sign(claims, this.serviceAccountKey.private_key, { algorithm: 'RS256' });
      const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

      // Persist to DB
      const pool = getPool();
      await pool.query(
        `INSERT INTO wallet_syncs (user_id, receipt_id, wallet_object_id, save_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, receipt_id) DO UPDATE SET save_url = $4, synced_at = NOW()`,
        [userId, receipt.receiptId, objectId, saveUrl]
      );

      logger.info({ message: 'Wallet pass created', receiptId: receipt.receiptId, objectId });
      return { success: true, walletObjectId: objectId, saveUrl, message: 'Wallet pass ready' };
    } catch (error) {
      logger.error({ message: 'Wallet sync failed', error: (error as Error).message });
      return { success: false, walletObjectId: null, saveUrl: null, message: (error as Error).message };
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<{ processed: boolean; action: string }> {
    logger.info({ message: 'Wallet webhook received', eventType: event.eventType });
    const actions: Record<string, string> = { TRANSACTION_COMPLETE: 'receipt_created', TRANSACTION_REFUND: 'receipt_refunded', CARD_ADDED: 'wallet_linked' };
    const action = actions[event.eventType] || 'ignored';
    return { processed: action !== 'ignored', action };
  }

  async getWalletSyncStatus(userId: string): Promise<WalletSyncStatus> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT receipt_id, synced_at FROM wallet_syncs WHERE user_id = $1 ORDER BY synced_at DESC',
      [userId]
    );
    return {
      enabled: this.isConfigured,
      lastSyncAt: rows.length > 0 ? rows[0].synced_at : null,
      syncedCount: rows.length,
      syncedReceiptIds: rows.map(r => r.receipt_id),
    };
  }
}
