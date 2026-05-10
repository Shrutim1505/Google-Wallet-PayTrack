import { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * RBAC middleware: checks if the authenticated user has the required permission.
 * Usage: router.get('/admin', authMiddleware, requirePermission('users:manage'), handler)
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT p.name FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1 AND p.name = $2
      LIMIT 1
    `, [userId, permission]);

    if (rows.length === 0) {
      logger.warn({ msg: 'Permission denied', userId, permission });
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Require any of the listed permissions (OR logic).
 */
export function requireAnyPermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT p.name FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1 AND p.name = ANY($2)
      LIMIT 1
    `, [userId, permissions]);

    if (rows.length === 0) {
      logger.warn({ msg: 'Permission denied', userId, permissions });
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Require a specific role (e.g., 'admin').
 */
export function requireRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.name = $2
      LIMIT 1
    `, [userId, roleName]);

    if (rows.length === 0) {
      return res.status(403).json({ success: false, error: `Role '${roleName}' required` });
    }

    next();
  };
}

/**
 * Get all permissions for a user (useful for frontend to show/hide UI elements).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT DISTINCT p.name FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = $1
  `, [userId]);
  return rows.map(r => r.name);
}

/**
 * Get all roles for a user.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT r.name FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = $1
  `, [userId]);
  return rows.map(r => r.name);
}
