// Mock OCR Service - No Google Cloud needed
export class OCRService {
  async extractTextFromImage(imageUrl: string): Promise<string> {
    // In production, you'd integrate Google Cloud Vision API here
    // For now, return mock data
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

    // Simple regex parsing (mock OCR)
    const vendorMatch = text.match(/([A-Z\s]+)/);
    const amountMatch = text.match(/₹(\d+)/g);

    return {
      vendor: vendorMatch?.[1]?.trim() || 'Unknown Vendor',
      date: new Date(),
      amount: amountMatch 
        ? parseInt(amountMatch[amountMatch.length - 1].replace('₹', ''))
        : 0,
      rawText: text,
      confidence: 0.85,
      items: []
    };
  }
}