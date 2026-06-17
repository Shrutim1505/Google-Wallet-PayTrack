import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { LRUCache } from '../algorithms/LRUCache.js';

interface ExchangeRates { [currency: string]: number }

const RATE_CACHE_CAPACITY = 32;
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_TTL_MS = 5 * 60 * 1000;

const rateCache = new LRUCache<string, ExchangeRates>({
  capacity: RATE_CACHE_CAPACITY,
  defaultTtlMs: RATE_CACHE_TTL_MS,
});

export class CurrencyService {
  async getRates(base = 'INR'): Promise<ExchangeRates> {
    const cached = rateCache.get(base);
    if (cached) return cached;

    try {
      const url = `${environment.EXCHANGE_RATE_API_URL}/${base}`;
      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.rates) {
        rateCache.set(base, data.rates);
        logger.info({
          message: 'Exchange rates fetched',
          base,
          currencies: Object.keys(data.rates).length,
          cacheStats: rateCache.stats,
        });
        return data.rates;
      }
    } catch (error) {
      logger.error({
        message: 'Failed to fetch exchange rates',
        error: (error as Error).message,
      });
    }

    const fallback = this.getFallbackRates(base);
    rateCache.set(base, fallback, FALLBACK_TTL_MS);
    return fallback;
  }

  async convert(amount: number, from: string, to: string): Promise<{ converted: number; rate: number }> {
    if (from === to) return { converted: amount, rate: 1 };

    const rates = await this.getRates(from);
    const rate = rates[to];

    if (!rate) {
      const inverseRates = await this.getRates(to);
      const inverseRate = inverseRates[from];
      if (inverseRate) {
        const r = 1 / inverseRate;
        return {
          converted: Math.round(amount * r * 100) / 100,
          rate: Math.round(r * 10000) / 10000,
        };
      }
      throw new Error(`No exchange rate found for ${from} -> ${to}`);
    }

    return {
      converted: Math.round(amount * rate * 100) / 100,
      rate: Math.round(rate * 10000) / 10000,
    };
  }

  async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.getRates('USD');
    return Object.keys(rates).sort();
  }

  getCacheStats() {
    return rateCache.stats;
  }

  clearCache(): void {
    rateCache.clear();
  }

  private getFallbackRates(base: string): ExchangeRates {
    const usdRates: ExchangeRates = {
      INR: 83.5, EUR: 0.92, GBP: 0.79, CAD: 1.36,
      AUD: 1.53, JPY: 149.5, CNY: 7.24, USD: 1,
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
