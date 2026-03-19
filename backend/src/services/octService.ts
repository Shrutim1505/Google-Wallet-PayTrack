// Mock OCR Service - No Google Cloud needed
export class OCRService {
  async extractTextFromImage(imageUrl: string): Promise<string> {
    console.log('OCR processing:', imageUrl);
    
    return `
      ABC SUPERMARKET
      Date: 2024-03-19
      Items:
      - Groceries ₹500
      - Vegetables ₹300
      Total: ₹800
    `;
  }

  async extractReceiptData(imageUrl: string) {
    const text = await this.extractTextFromImage(imageUrl);

    const vendorLineMatch = text.match(/^\s*([A-Z][A-Z\s]+?)\s*$/m);
    const vendor = (vendorLineMatch?.[1] || 'Unknown Vendor').trim().replace(/\s+/g, ' ');

    // Total amount: prefer "Total: ₹<num>" then fall back to last ₹<num>.
    const totalMatch = text.match(/Total:\s*₹(\d+)/i);
    const amountMatch = text.match(/₹(\d+)/g);
    const amount = totalMatch
      ? parseInt(totalMatch[1], 10)
      : amountMatch
        ? parseInt(amountMatch[amountMatch.length - 1].replace('₹', ''), 10)
        : 0;

    // Items: parse lines like "- Item Name ₹500"
    const items: Array<{ name: string; price: number; quantity: number }> = [];
    const itemLines = text.match(/^\s*-\s*(.+?)\s+₹(\d+)\s*$/gm) || [];
    for (const line of itemLines) {
      const m = line.match(/^\s*-\s*(.+?)\s+₹(\d+)\s*$/);
      if (!m) continue;
      items.push({ name: m[1].trim(), price: parseInt(m[2], 10), quantity: 1 });
    }

    return {
      vendor,
      date: new Date(),
      amount,
      rawText: text,
      confidence: 0.85,
      items,
    };
  }
}