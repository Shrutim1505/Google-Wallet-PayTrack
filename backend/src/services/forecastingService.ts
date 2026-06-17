import { getPool } from '../config/database.js';
import { exponentialSmoothing as esFn, movingAverage as maFn, standardDeviation as stdDevFn } from '../utils/aiMath.js';
import { logger } from '../utils/logger.js';

export interface ForecastResult {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ForecastResponse {
  next7Days: ForecastResult[];
  next30Days: ForecastResult[];
  modelName: string;
  mape: number | null; // Mean Absolute Percentage Error
  trend: 'increasing' | 'decreasing' | 'stable';
  dailyAverage: number;
}

export class ForecastingService {
  async forecast(userId: string): Promise<ForecastResponse> {
    const pool = getPool();

    // Get daily spending for last 90 days
    const { rows } = await pool.query(
      `SELECT date::date as day, SUM(amount)::numeric as total
       FROM receipts WHERE user_id = $1 AND date >= NOW() - INTERVAL '90 days'
       GROUP BY date::date ORDER BY day`,
      [userId]
    );

    if (rows.length < 3) {
      return { next7Days: [], next30Days: [], modelName: 'insufficient_data', mape: null, trend: 'stable', dailyAverage: 0 };
    }

    // Fill missing days with 0
    const dailySpend = this.fillMissingDays(rows.map(r => ({ day: r.day, total: parseFloat(r.total) })));
    const values = dailySpend.map(d => d.total);

    // Exponential smoothing forecast
    const esForecasts7 = this.exponentialSmoothing(values, 7);
    const esForecasts30 = this.exponentialSmoothing(values, 30);

    // Moving average for comparison
    const maForecasts7 = this.movingAverage(values, 7);

    // Use ES as primary, compute confidence intervals from both models
    const lastDate = new Date(dailySpend[dailySpend.length - 1].day);
    const stdDev = this.standardDeviation(values.slice(-14));

    const next7Days: ForecastResult[] = esForecasts7.map((val, i) => {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i + 1);
      return {
        date: date.toISOString().split('T')[0],
        predicted: Math.round(val),
        lower: Math.round(Math.max(0, val - 1.96 * stdDev * Math.sqrt(i + 1) * 0.3)),
        upper: Math.round(val + 1.96 * stdDev * Math.sqrt(i + 1) * 0.3),
      };
    });

    const next30Days: ForecastResult[] = esForecasts30.map((val, i) => {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i + 1);
      return {
        date: date.toISOString().split('T')[0],
        predicted: Math.round(val),
        lower: Math.round(Math.max(0, val - 1.96 * stdDev * Math.sqrt(i + 1) * 0.3)),
        upper: Math.round(val + 1.96 * stdDev * Math.sqrt(i + 1) * 0.3),
      };
    });

    // Trend detection
    const recent7 = values.slice(-7).reduce((s, v) => s + v, 0);
    const prev7 = values.slice(-14, -7).reduce((s, v) => s + v, 0);
    const trend: ForecastResponse['trend'] = recent7 > prev7 * 1.15 ? 'increasing' : recent7 < prev7 * 0.85 ? 'decreasing' : 'stable';

    // MAPE on last 7 days (backtest)
    const mape = this.computeMAPE(values);
    const dailyAverage = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

    // Persist forecasts
    for (const f of next7Days) {
      await pool.query(
        `INSERT INTO spending_forecasts (user_id, forecast_date, predicted_amount, confidence_lower, confidence_upper, model_name)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [userId, f.date, f.predicted, f.lower, f.upper, 'exponential_smoothing']
      );
    }

    logger.info({ message: 'Forecast generated', userId, trend, dailyAverage, mape });
    return { next7Days, next30Days, modelName: 'exponential_smoothing', mape, trend, dailyAverage };
  }

  /** Simple Exponential Smoothing (Holt's method) */
  private exponentialSmoothing(data: number[], horizon: number, alpha = 0.3, beta = 0.1): number[] {
    return esFn(data, horizon, alpha, beta);
  }

  /** Simple Moving Average */
  private movingAverage(data: number[], horizon: number, window = 7): number[] {
    return maFn(data, horizon, window);
  }

  /** Backtest MAPE on last 7 observations */
  private computeMAPE(data: number[]): number | null {
    if (data.length < 14) return null;
    const train = data.slice(0, -7);
    const test = data.slice(-7);
    const predictions = this.exponentialSmoothing(train, 7);

    let totalError = 0;
    let validCount = 0;
    for (let i = 0; i < test.length; i++) {
      if (test[i] > 0) {
        totalError += Math.abs((test[i] - predictions[i]) / test[i]);
        validCount++;
      }
    }
    return validCount > 0 ? Math.round((totalError / validCount) * 100) : null;
  }

  private fillMissingDays(data: { day: string; total: number }[]): { day: string; total: number }[] {
    if (data.length === 0) return [];
    const result: { day: string; total: number }[] = [];
    const start = new Date(data[0].day);
    const end = new Date(data[data.length - 1].day);
    const lookup = new Map(data.map(d => [d.day.toString().split('T')[0], d.total]));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      result.push({ day: key, total: lookup.get(key) || 0 });
    }
    return result;
  }

  private standardDeviation(values: number[]): number {
    return stdDevFn(values);
  }
}
