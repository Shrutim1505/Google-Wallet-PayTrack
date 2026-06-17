import { describe, expect, it } from 'vitest';

import { CURRENCIES, formatAmount, formatCurrency, formatIndianCurrency } from './currency';

describe('currency utilities', () => {
  it('exposes the supported currency list', () => {
    expect(CURRENCIES).toContain('INR');
    expect(CURRENCIES).toContain('USD');
  });

  it('formatCurrency renders a localised string with currency symbol', () => {
    expect(formatCurrency(1000)).toMatch(/1,000/);
    expect(formatCurrency(1000, 'USD')).toMatch(/1,000/);
  });

  it('formatAmount returns a formatted number without symbol', () => {
    expect(formatAmount(1234.5)).toMatch(/1,234/);
  });

  it('formatIndianCurrency picks the right magnitude bucket', () => {
    expect(formatIndianCurrency(50)).toMatch(/₹50/);
    expect(formatIndianCurrency(1500)).toMatch(/K/);
    expect(formatIndianCurrency(150000)).toMatch(/L/);
    expect(formatIndianCurrency(15000000)).toMatch(/Cr/);
  });
});
