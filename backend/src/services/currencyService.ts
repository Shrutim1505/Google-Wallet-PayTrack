import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

interface ExchangeRates { [currency: string]: number }

let rateCache: { base: string; rates: ExchangeRates; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Currency conversion service using free exchange rate API.
 * Caches rates for 1 hour to minimize API calls.
 */
export class CurrencyService {
  async getRates(base = 'INR'): Promise<ExchangeRates> {
    if (rateCache && rateCache.base === base && Date.now() - rateCache.fetchedAt < CACHE_TTL) {
      return rateCache.rates;
    }

    try {
      const url = `${environment.EXCHANGE_RATE_API_URL}/${base}`;
      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.rates) {
        rateCache = { base, rates: data.rates, fetchedAt: Date.now() };
        logger.info({ message: 'Exchange rates fetched', base, currencies: Object.keys(data.rates).length });
        return data.rates;
      }
    } catch (error) {
      logger.error({ message: 'Failed to fetch exchange rates', error: (error as Error).message });
    }

    // Fallback static rates
    return this.getFallbackRates(base);
  }

  async convert(amount: number, from: string, to: string): Promise<{ converted: number; rate: number }> {
    if (from === to) return { converted: amount, rate: 1 };

    const rates = await this.getRates(from);
    const rate = rates[to];

    if (!rate) {
      // Try inverse
      const inverseRates = await this.getRates(to);
      const inverseRate = inverseRates[from];
      if (inverseRate) {
        const r = 1 / inverseRate;
        return { converted: Math.round(amount * r * 100) / 100, rate: Math.round(r * 10000) / 10000 };
      }
      throw new Error(`No exchange rate found for ${from} → ${to}`);
    }

    return { converted: Math.round(amount * rate * 100) / 100, rate: Math.round(rate * 10000) / 10000 };
  }

  async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.getRates('USD');
    return Object.keys(rates).sort();
  }

  private getFallbackRates(base: string): ExchangeRates {
    const usdRates: ExchangeRates = {
      INR: 83.5, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, JPY: 149.5, CNY: 7.24, USD: 1,
    };

    if (base === 'USD') return usdRates;

    const baseToUsd = usdRates[base];
    if (!baseToUsd) return usdRates;

    const rates: ExchangeRates = {};
    for (const [currency, usdRate] of Object.entries(usdRates)) {
      rates[currency] = Math.round((usdRate / baseToUsd) * 10000) / 10000;
    }
    return rates;
  }
}
