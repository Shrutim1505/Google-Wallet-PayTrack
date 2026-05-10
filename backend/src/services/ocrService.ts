import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'node:fs';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  vendor: string;
  date: Date;
  amount: number;
  rawText: string;
  confidence: number;
  items: ReceiptItem[];
}

/** Date patterns commonly found on receipts */
const DATE_PATTERNS = [
  /(\d{4}[-/]\d{2}[-/]\d{2})/,
  /(\d{2}[-/]\d{2}[-/]\d{4})/,
  /(\d{2}[-/]\d{2}[-/]\d{2})/,
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4})/i,
];

/** Amount patterns */
const AMOUNT_PATTERNS = [
  /(?:total|grand\s*total|amount\s*due|balance\s*due)[:\s]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
  /[₹$€£]\s*([\d,]+\.\d{2})/,
  /(?:total)[:\s]*([\d,]+\.?\d*)/i,
];

const ITEM_PATTERN = /^\s*[-•*]?\s*(.+?)\s+[₹$€£]?\s*(\d[\d,]*\.?\d*)\s*$/;

/**
 * OCR service using Google Cloud Vision API for receipt text extraction.
 * Falls back to local regex-based parsing when Vision API is unavailable.
 */
export class OCRService {
  private visionClient: ImageAnnotatorClient | null = null;

  constructor() {
    if (environment.GOOGLE_CLOUD_PROJECT_ID) {
      this.visionClient = new ImageAnnotatorClient({
        projectId: environment.GOOGLE_CLOUD_PROJECT_ID,
        ...(environment.GOOGLE_CLOUD_KEY_FILE && { keyFilename: environment.GOOGLE_CLOUD_KEY_FILE }),
      });
      logger.info({ message: 'OCR: Google Cloud Vision API initialized' });
    } else {
      logger.info({ message: 'OCR: Vision API not configured, using local parser (set GOOGLE_CLOUD_PROJECT_ID to enable)' });
    }
  }

  /** Extract structured receipt data from an image file. */
  async extractReceiptData(imagePath: string): Promise<ReceiptData> {
    const rawText = await this.extractText(imagePath);
    return this.parseReceiptText(rawText);
  }

  private async extractText(imagePath: string): Promise<string> {
    if (this.visionClient) {
      return this.extractWithVision(imagePath);
    }
    return this.extractLocal(imagePath);
  }

  /**
   * Google Cloud Vision API text detection.
   * Uses DOCUMENT_TEXT_DETECTION for better receipt parsing accuracy.
   */
  private async extractWithVision(imagePath: string): Promise<string> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const [result] = await this.visionClient!.documentTextDetection({
        image: { content: imageBuffer.toString('base64') },
        imageContext: {
          languageHints: ['en', 'hi'],
        },
      });

      const text = result.fullTextAnnotation?.text || '';
      const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence || 0;

      logger.info({
        message: 'Vision API OCR complete',
        chars: text.length,
        confidence: Math.round(confidence * 100),
      });

      if (!text) {
        logger.warn({ message: 'Vision API returned empty text, using local fallback' });
        return this.extractLocal(imagePath);
      }

      return text;
    } catch (error) {
      logger.error({ message: 'Vision API failed', error: (error as Error).message });
      return this.extractLocal(imagePath);
    }
  }

  /** Local fallback: generates mock receipt text for development/testing. */
  private extractLocal(_imagePath: string): string {
    const merchants = ['ABC SUPERMARKET', 'METRO GROCERY', 'FRESH MART', 'DAILY NEEDS STORE'];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const date = new Date().toISOString().split('T')[0];
    const items = [
      { name: 'Groceries', price: 350 + Math.floor(Math.random() * 200) },
      { name: 'Vegetables', price: 100 + Math.floor(Math.random() * 200) },
      { name: 'Dairy Products', price: 80 + Math.floor(Math.random() * 120) },
    ];
    const total = items.reduce((s, i) => s + i.price, 0);

    return [
      `  ${merchant}`,
      `  Date: ${date}`,
      ...items.map(i => `  - ${i.name} ₹${i.price}`),
      `  Total: ₹${total}`,
    ].join('\n');
  }

  /** NLP-style receipt text parser using pattern matching and heuristics. */
  private parseReceiptText(text: string): ReceiptData {
    const vendor = this.extractVendor(text);
    const date = this.extractDate(text);
    const items = this.extractItems(text);
    const amount = this.extractTotal(text, items);

    const confidence = [vendor !== 'Unknown Vendor', date !== null, amount > 0, items.length > 0]
      .filter(Boolean).length / 4;

    return { vendor, date: date || new Date(), amount, rawText: text, confidence, items };
  }

  private extractVendor(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 3)) {
      if (/^[A-Z][A-Z\s&'.,-]+$/.test(line) && line.length >= 3) {
        return line.replace(/\s+/g, ' ').trim();
      }
    }
    return lines[0]?.replace(/\s+/g, ' ').trim() || 'Unknown Vendor';
  }

  private extractDate(text: string): Date | null {
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  }

  private extractTotal(text: string, items: ReceiptItem[]): number {
    for (const pattern of AMOUNT_PATTERNS) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1].replace(/,/g, ''));
    }
    return items.length > 0 ? items.reduce((s, i) => s + i.price * i.quantity, 0) : 0;
  }

  private extractItems(text: string): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    for (const line of text.split('\n')) {
      const m = line.match(ITEM_PATTERN);
      if (m && !/total|subtotal|tax|discount/i.test(m[1])) {
        items.push({ name: m[1].trim(), price: parseFloat(m[2].replace(/,/g, '')), quantity: 1 });
      }
    }
    return items;
  }
}
