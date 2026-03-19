export class CategorizationService {
  private categoryKeywords: Record<string, string[]> = {
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

  categorizeReceipt(vendor: string, items?: string[]): string {
    const text = `${vendor} ${items?.join(' ') || ''}`.toLowerCase();

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }
}