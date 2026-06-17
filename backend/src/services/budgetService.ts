import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';

export interface CreateBudgetDTO {
  category: string;
  amount: number;
  period?: string;
  alertEnabled?: boolean;
  alertThreshold?: number;
}

export class BudgetService {
  async getBudgets(userId: string) {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY category', [userId]);
    return rows;
  }

  async getBudgetById(userId: string, budgetId: string) {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM budgets WHERE id = $1 AND user_id = $2', [budgetId, userId]);
    if (rows.length === 0) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Budget not found');
    return rows[0];
  }

  async createBudget(userId: string, data: CreateBudgetDTO) {
    const pool = getPool();
    const id = uuidv4();

    const { rows: existing } = await pool.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND period = $3',
      [userId, data.category, data.period || 'monthly']
    );
    if (existing.length > 0) {
      throw new AppError(HTTP_STATUS.CONFLICT, `Budget for ${data.category} (${data.period || 'monthly'}) already exists`);
    }

    await pool.query(
      `INSERT INTO budgets (id, user_id, category, amount, period, alert_enabled, alert_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, data.category, data.amount, data.period || 'monthly', data.alertEnabled !== false, data.alertThreshold ?? 80]
    );

    return this.getBudgetById(userId, id);
  }

  async updateBudget(userId: string, budgetId: string, updates: Partial<CreateBudgetDTO>) {
    await this.getBudgetById(userId, budgetId);
    const pool = getPool();

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.amount != null) { setClauses.push(`amount = $${idx++}`); values.push(updates.amount); }
    if (updates.alertEnabled != null) { setClauses.push(`alert_enabled = $${idx++}`); values.push(updates.alertEnabled); }
    if (updates.alertThreshold != null) { setClauses.push(`alert_threshold = $${idx++}`); values.push(updates.alertThreshold); }

    if (setClauses.length === 0) return this.getBudgetById(userId, budgetId);

    setClauses.push('updated_at = NOW()');
    values.push(budgetId, userId);

    await pool.query(
      `UPDATE budgets SET ${setClauses.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
      values
    );
    return this.getBudgetById(userId, budgetId);
  }

  async deleteBudget(userId: string, budgetId: string) {
    await this.getBudgetById(userId, budgetId);
    const pool = getPool();
    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [budgetId, userId]);
  }

  async getBudgetStatus(userId: string) {
    const pool = getPool();
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { rows: budgets } = await pool.query('SELECT * FROM budgets WHERE user_id = $1', [userId]);
    const { rows: spending } = await pool.query(
      `SELECT category, SUM(amount)::numeric as spent
       FROM receipts WHERE user_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    const spendingMap = new Map(spending.map(s => [s.category, parseFloat(s.spent)]));

    return budgets.map(b => {
      const spent = spendingMap.get(b.category) || 0;
      const percentage = b.amount > 0 ? Math.round((spent / parseFloat(b.amount)) * 100) : 0;
      return {
        id: b.id, category: b.category, budgetAmount: parseFloat(b.amount),
        spent, percentage, period: b.period,
        alertEnabled: b.alert_enabled, alertThreshold: b.alert_threshold,
        isOverBudget: percentage >= 100,
        isNearThreshold: percentage >= b.alert_threshold && percentage < 100,
      };
    });
  }
}
