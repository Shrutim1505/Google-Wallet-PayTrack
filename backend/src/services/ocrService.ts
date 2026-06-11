import { ImageAnnotatorClient } from '@google-cloud/vision';
import Tesseract from 'tesseract.js';
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

const DATE_PATTERNS = [
  /(\d{4}[-/]\d{2}[-/]\d{2})/,
  /(\d{2}[-/]\d{2}[-/]\d{4})/,
  /(\d{2}[-/]\d{2}[-/]\d{2})/,
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4})/i,
];

const AMOUNT_PATTERNS = [
  /(?:total|grand\s*total|amount\s*due|balance\s*due)[:\s]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
  /[₹$€£]\s*([\d,]+\.\d{2})/,
  /(?:total)[:\s]*([\d,]+\.?\d*)/i,
];

const ITEM_PATTERN = /^\s*[-•*]?\s*(.+?)\s+[₹$€£]?\s*(\d[\d,]*\.?\d*)\s*$/;
const VENDOR_PATTERN = /^[A-Z][A-Z\s&'.,-]+$/;
const NON_ITEM_KEYWORDS = /total|subtotal|tax|discount/i;
const VISION_LANGUAGE_HINTS = ['en', 'hi'];

export class OCRService {
  private readonly visionClient: ImageAnnotatorClient | null;

  constructor() {
    if (environment.GOOGLE_CLOUD_PROJECT_ID) {
      this.visionClient = new ImageAnnotatorClient({
        projectId: environment.GOOGLE_CLOUD_PROJECT_ID,
        ...(environment.GOOGLE_CLOUD_KEY_FILE && { keyFilename: environment.GOOGLE_CLOUD_KEY_FILE }),
      });
      logger.info({ message: 'OCR: Google Cloud Vision API initialized' });
    } else {
      this.visionClient = null;
      logger.info({ message: 'OCR: Vision API not configured, using Tesseract.js' });
    }
  }

  async extractReceiptData(imagePath: string, mimetype?: string): Promise<ReceiptData> {
    if (mimetype === 'application/pdf') {
      logger.warn({ message: 'PDF upload not supported without Google Vision API' });
      return { vendor: 'Unknown', date: new Date(), amount: 0, rawText: '', confidence: 0, items: [] };
    }
    const rawText = await this.extractText(imagePath);
    return this.parseReceiptText(rawText);
  }

  private async extractText(imagePath: string): Promise<string> {
    if (this.visionClient) return this.extractWithVision(imagePath);
    return this.extractWithTesseract(imagePath);
  }

  private async extractWithVision(imagePath: string): Promise<string> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const [result] = await this.visionClient!.documentTextDetection({
        image: { content: imageBuffer.toString('base64') },
        imageContext: { languageHints: VISION_LANGUAGE_HINTS },
      });

      const text = result.fullTextAnnotation?.text || '';
      const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence || 0;

      logger.info({
        message: 'Vision API OCR complete',
        chars: text.length,
        confidence: Math.round(confidence * 100),
      });

      if (!text) {
        logger.warn({ message: 'Vision API returned empty text, using Tesseract fallback' });
        return this.extractWithTesseract(imagePath);
      }

      return text;
    } catch (error) {
      logger.error({ message: 'Vision API failed', error: (error as Error).message });
      return this.extractWithTesseract(imagePath);
    }
  }

  private async extractWithTesseract(imagePath: string): Promise<string> {
    try {
      // Tesseract.js only supports images, not PDFs
      if (imagePath.toLowerCase().endsWith('.pdf')) {
        logger.warn({ message: 'Tesseract does not support PDF files' });
        return '';
      }
      const { data } = await Tesseract.recognize(imagePath, 'eng');
      logger.info({
        message: 'Tesseract OCR complete',
        chars: data.text.length,
        confidence: Math.round(data.confidence),
      });
      return data.text;
    } catch (error) {
      logger.error({ message: 'Tesseract OCR failed', error: (error as Error).message });
      return '';
    }
  }

  private parseReceiptText(text: string): ReceiptData {
    const vendor = this.extractVendor(text);
    const date = this.extractDate(text);
    const items = this.extractItems(text);
    const amount = this.extractTotal(text, items);

    const signals = [vendor !== 'Unknown Vendor', date !== null, amount > 0, items.length > 0];
    const confidence = signals.filter(Boolean).length / signals.length;

    return { vendor, date: date || new Date(), amount, rawText: text, confidence, items };
  }

  private extractVendor(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 3)) {
      if (VENDOR_PATTERN.test(line) && line.length >= 3) {
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
    return items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  private extractItems(text: string): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    for (const line of text.split('\n')) {
      const m = line.match(ITEM_PATTERN);
      if (m && !NON_ITEM_KEYWORDS.test(m[1])) {
        items.push({
          name: m[1].trim(),
          price: parseFloat(m[2].replace(/,/g, '')),
          quantity: 1,
        });
      }
    }
    return items;
  }
}
