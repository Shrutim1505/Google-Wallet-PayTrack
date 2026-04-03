import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
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
    const db = getDatabase();
    return db.all('SELECT * FROM budgets WHERE userId = ? ORDER BY category', [userId]);
  }

  async getBudgetById(userId: string, budgetId: string) {
    const db = getDatabase();
    const budget = await db.get('SELECT * FROM budgets WHERE id = ? AND userId = ?', [budgetId, userId]);
    if (!budget) throw new AppError(HTTP_STATUS.NOT_FOUND, 'Budget not found');
    return budget;
  }

  async createBudget(userId: string, data: CreateBudgetDTO) {
    const db = getDatabase();

    // Prevent duplicate category+period budgets
    const existing = await db.get(
      'SELECT id FROM budgets WHERE userId = ? AND category = ? AND period = ?',
      [userId, data.category, data.period || 'monthly']
    );
    if (existing) {
      throw new AppError(HTTP_STATUS.CONFLICT, `Budget for ${data.category} (${data.period || 'monthly'}) already exists`);
    }

    const id = uuidv4();
    await db.run(
      `INSERT INTO budgets (id, userId, category, amount, period, alertEnabled, alertThreshold)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, data.category, data.amount, data.period || 'monthly', data.alertEnabled !== false ? 1 : 0, data.alertThreshold ?? 80]
    );

    return this.getBudgetById(userId, id);
  }

  async updateBudget(userId: string, budgetId: string, updates: Partial<CreateBudgetDTO>) {
    const db = getDatabase();
    await this.getBudgetById(userId, budgetId);

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.amount != null) { setClauses.push('amount = ?'); values.push(updates.amount); }
    if (updates.alertEnabled != null) { setClauses.push('alertEnabled = ?'); values.push(updates.alertEnabled ? 1 : 0); }
    if (updates.alertThreshold != null) { setClauses.push('alertThreshold = ?'); values.push(updates.alertThreshold); }

    if (setClauses.length === 0) return this.getBudgetById(userId, budgetId);

    setClauses.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(budgetId, userId);

    await db.run(`UPDATE budgets SET ${setClauses.join(', ')} WHERE id = ? AND userId = ?`, values);
    return this.getBudgetById(userId, budgetId);
  }

  async deleteBudget(userId: string, budgetId: string) {
    await this.getBudgetById(userId, budgetId);
    const db = getDatabase();
    await db.run('DELETE FROM budgets WHERE id = ? AND userId = ?', [budgetId, userId]);
  }

  /**
   * Returns budget vs actual spending for the current period.
   * Useful for budget alerts on the frontend.
   */
  async getBudgetStatus(userId: string) {
    const db = getDatabase();
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const budgets = await db.all('SELECT * FROM budgets WHERE userId = ?', [userId]);

    const spending = await db.all(
      `SELECT category, SUM(amount) as spent
       FROM receipts WHERE userId = ? AND date BETWEEN ? AND ?
       GROUP BY category`,
      [userId, startDate, endDate]
    );

    const spendingMap = new Map(spending.map((s: any) => [s.category, s.spent]));

    return budgets.map((b: any) => {
      const spent = spendingMap.get(b.category) || 0;
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      return {
        id: b.id,
        category: b.category,
        budgetAmount: b.amount,
        spent,
        percentage,
        period: b.period,
        alertEnabled: Boolean(b.alertEnabled),
        alertThreshold: b.alertThreshold,
        isOverBudget: percentage >= 100,
        isNearThreshold: percentage >= b.alertThreshold && percentage < 100,
      };
    });
  }
}
