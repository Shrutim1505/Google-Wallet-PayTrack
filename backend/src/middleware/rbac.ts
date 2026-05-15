import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';
import { getPool } from '../config/database.js';

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) return next(AppError.unauthorized());

    if (!req.permissions?.includes(permission)) {
      logger.warn({
        msg: 'Permission denied',
        userId: req.userId,
        permission,
        traceId: req.requestId,
      });
      return next(AppError.forbidden(`Required permission: ${permission}`));
    }
    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) return next(AppError.unauthorized());

    const has = permissions.some(p => req.permissions?.includes(p));
    if (!has) {
      logger.warn({
        msg: 'Permission denied',
        userId: req.userId,
        permissions,
        traceId: req.requestId,
      });
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

export function requireRole(roleName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) return next(AppError.unauthorized());

    if (!req.roles?.includes(roleName)) {
      return next(AppError.forbidden(`Role '${roleName}' required`));
    }
    next();
  };
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const { rows } = await getPool().query(
    `SELECT DISTINCT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map(r => r.name);
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const { rows } = await getPool().query(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map(r => r.name);
}
