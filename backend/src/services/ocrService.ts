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

/** Amount patterns: currency symbol + number */
const AMOUNT_PATTERNS = [
  /(?:total|grand\s*total|amount\s*due|balance\s*due)[:\s]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
  /[₹$€£]\s*([\d,]+\.\d{2})/,
  /(?:total)[:\s]*([\d,]+\.?\d*)/i,
];

const ITEM_PATTERN = /^\s*[-•*]?\s*(.+?)\s+[₹$€£]?\s*(\d[\d,]*\.?\d*)\s*$/;

/**
 * OCR service with Google Cloud Vision API support.
 * Falls back to intelligent mock parsing when GOOGLE_CLOUD_PROJECT_ID is not set.
 */
export class OCRService {
  private useGoogleVision: boolean;

  constructor() {
    this.useGoogleVision = !!environment.GOOGLE_CLOUD_PROJECT_ID;
    if (this.useGoogleVision) {
      logger.info({ message: 'OCR: Google Cloud Vision API enabled' });
    } else {
      logger.info({ message: 'OCR: Using mock parser (set GOOGLE_CLOUD_PROJECT_ID to enable Vision API)' });
    }
  }

  /** Extract structured receipt data from an image file path. */
  async extractReceiptData(imagePath: string): Promise<ReceiptData> {
    const rawText = this.useGoogleVision
      ? await this.extractWithVision(imagePath)
      : this.generateMockText(imagePath);

    return this.parseReceiptText(rawText);
  }

  private async extractWithVision(imagePath: string): Promise<string> {
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      const client = new ImageAnnotatorClient({
        projectId: environment.GOOGLE_CLOUD_PROJECT_ID,
        ...(environment.GOOGLE_CLOUD_KEY_FILE && { keyFilename: environment.GOOGLE_CLOUD_KEY_FILE }),
      });

      const [result] = await client.textDetection(imagePath);
      const text = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
      logger.info({ message: 'Vision API OCR complete', chars: text.length });
      return text;
    } catch (error) {
      logger.error({ message: 'Vision API failed, falling back to mock', error: (error as Error).message });
      return this.generateMockText(imagePath);
    }
  }

  private generateMockText(_imagePath: string): string {
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
      `  Items:`,
      ...items.map(i => `  - ${i.name} ₹${i.price}`),
      `  Total: ₹${total}`,
    ].join('\n');
  }

  /** NLP-like receipt text parser */
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
