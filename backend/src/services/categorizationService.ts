import { AIService } from './aiService.js';
import { logger } from '../utils/logger.js';

const aiService = new AIService();

const KEYWORD_MAP: Record<string, string[]> = {
  food: ['restaurant', 'cafe', 'pizza', 'burger', 'food', 'dinner', 'lunch', 'hotel'],
  groceries: ['grocery', 'supermarket', 'market', 'vegetables', 'fruits', 'store'],
  transport: ['uber', 'ola', 'cab', 'taxi', 'petrol', 'bus', 'auto', 'fuel'],
  utilities: ['electricity', 'water', 'gas', 'internet', 'phone', 'bill'],
  entertainment: ['cinema', 'movie', 'game', 'sport', 'play', 'theater'],
  shopping: ['mall', 'shop', 'clothing', 'dress', 'brand', 'apparel'],
  healthcare: ['hospital', 'doctor', 'pharmacy', 'medicine', 'health', 'clinic'],
  education: ['school', 'college', 'university', 'course', 'book'],
  dining: ['restaurant', 'bar', 'pub', 'lounge', 'cafe'],
  personal: ['salon', 'spa', 'gym', 'fitness'],
};

export class CategorizationService {
  /**
   * Categorize a receipt using AI smart categorization as primary,
   * falling back to keyword matching if AI returns 'Other'.
   */
  categorizeReceipt(vendor: string, items?: string[]): string {
    // Primary: AI-powered smart categorization
    const aiResult = aiService.smartCategorize(vendor, items);
    if (aiResult !== 'Other') return aiResult;

    // Fallback: simple keyword matching
    const text = `${vendor} ${items?.join(' ') || ''}`.toLowerCase();
    for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(kw => text.includes(kw))) return category;
    }

    logger.debug({ message: 'Categorization fell through to default', vendor });
    return 'other';
  }
}
