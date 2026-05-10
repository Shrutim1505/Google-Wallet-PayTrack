import { describe, it, expect, beforeAll } from 'vitest';
import { getPool, runTransaction } from '../config/database.js';
import { getUserPermissions, getUserRoles } from '../middleware/rbac.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

describe('RBAC System', () => {
  let adminUserId: string;
  let regularUserId: string;
  let viewerUserId: string;

  beforeAll(async () => {
    const pool = getPool();
    const hash = await bcrypt.hash('test', 10);

    // Create test users with different roles
    adminUserId = uuidv4();
    regularUserId = uuidv4();
    viewerUserId = uuidv4();

    await runTransaction(async (client) => {
      await client.query('INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)', [adminUserId, `admin-${Date.now()}@test.com`, 'Admin', hash]);
      await client.query('INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)', [regularUserId, `user-${Date.now()}@test.com`, 'User', hash]);
      await client.query('INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)', [viewerUserId, `viewer-${Date.now()}@test.com`, 'Viewer', hash]);

      await client.query(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'admin'`, [adminUserId]);
      await client.query(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'user'`, [regularUserId]);
      await client.query(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'viewer'`, [viewerUserId]);
    });
  });

  describe('getUserRoles', () => {
    it('should return admin role for admin user', async () => {
      const roles = await getUserRoles(adminUserId);
      expect(roles).toContain('admin');
    });

    it('should return user role for regular user', async () => {
      const roles = await getUserRoles(regularUserId);
      expect(roles).toContain('user');
    });

    it('should return viewer role for viewer user', async () => {
      const roles = await getUserRoles(viewerUserId);
      expect(roles).toContain('viewer');
    });
  });

  describe('getUserPermissions', () => {
    it('admin should have all permissions including users:manage', async () => {
      const perms = await getUserPermissions(adminUserId);
      expect(perms).toContain('users:manage');
      expect(perms).toContain('roles:manage');
      expect(perms).toContain('receipts:create');
      expect(perms).toContain('receipts:read_all');
    });

    it('regular user should have CRUD on own resources but not admin perms', async () => {
      const perms = await getUserPermissions(regularUserId);
      expect(perms).toContain('receipts:create');
      expect(perms).toContain('receipts:read');
      expect(perms).toContain('receipts:update');
      expect(perms).toContain('receipts:delete');
      expect(perms).not.toContain('users:manage');
      expect(perms).not.toContain('roles:manage');
      expect(perms).not.toContain('receipts:read_all');
    });

    it('viewer should only have read permissions', async () => {
      const perms = await getUserPermissions(viewerUserId);
      expect(perms).toContain('receipts:read');
      expect(perms).toContain('analytics:read');
      expect(perms).not.toContain('receipts:create');
      expect(perms).not.toContain('receipts:update');
      expect(perms).not.toContain('receipts:delete');
    });
  });

  describe('Role hierarchy', () => {
    it('roles table should have admin, user, viewer', async () => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT name FROM roles ORDER BY name');
      const names = rows.map(r => r.name);
      expect(names).toContain('admin');
      expect(names).toContain('user');
      expect(names).toContain('viewer');
    });

    it('permissions should cover all resources', async () => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT DISTINCT resource FROM permissions ORDER BY resource');
      const resources = rows.map(r => r.resource);
      expect(resources).toContain('receipts');
      expect(resources).toContain('budgets');
      expect(resources).toContain('analytics');
      expect(resources).toContain('settings');
      expect(resources).toContain('users');
      expect(resources).toContain('roles');
    });
  });
});
