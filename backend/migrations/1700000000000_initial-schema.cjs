/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Initial schema migration.
 * Creates all tables, indexes, and seeds default RBAC data.
 */

exports.up = async (pgm) => {
  // Users
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', unique: true, notNull: true },
    name: { type: 'varchar(100)', notNull: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    email_verified: { type: 'boolean', notNull: true, default: false },
    currency: { type: 'varchar(3)', default: 'INR' },
    timezone: { type: 'varchar(50)', default: 'Asia/Kolkata' },
    preferences: { type: 'jsonb', default: '{}' },
    deleted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // RBAC: Roles
  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(50)', unique: true, notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // RBAC: Permissions
  pgm.createTable('permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', unique: true, notNull: true },
    resource: { type: 'varchar(50)', notNull: true },
    action: { type: 'varchar(20)', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // RBAC: Role-Permission mapping
  pgm.createTable('role_permissions', {
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    permission_id: { type: 'uuid', notNull: true, references: 'permissions(id)', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('role_permissions', 'role_permissions_pkey', {
    primaryKey: ['role_id', 'permission_id'],
  });

  // RBAC: User-Role mapping
  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    assigned_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.addConstraint('user_roles', 'user_roles_pkey', {
    primaryKey: ['user_id', 'role_id'],
  });

  // User settings
  pgm.createTable('user_settings', {
    user_id: { type: 'uuid', primaryKey: true, references: 'users(id)', onDelete: 'CASCADE' },
    monthly_budget: { type: 'numeric(12,2)', default: 50000 },
    notifications_enabled: { type: 'boolean', notNull: true, default: true },
    dark_mode: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Receipts
  pgm.createTable('receipts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    merchant: { type: 'varchar(255)', notNull: true },
    amount: { type: 'numeric(12,2)', notNull: true },
    currency: { type: 'varchar(3)', default: 'INR' },
    date: { type: 'date', notNull: true },
    category: { type: 'varchar(50)', default: 'Other' },
    items: { type: 'jsonb', default: '[]' },
    image_url: { type: 'text', default: '' },
    notes: { type: 'text', default: '' },
    tags: { type: 'jsonb', default: '[]' },
    ocr_data: { type: 'jsonb' },
    is_manual_entry: { type: 'boolean', default: false },
    deleted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Budgets
  pgm.createTable('budgets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    category: { type: 'varchar(50)', notNull: true },
    amount: { type: 'numeric(12,2)', notNull: true },
    period: { type: 'varchar(20)', default: 'monthly' },
    alert_enabled: { type: 'boolean', default: true },
    alert_threshold: { type: 'integer', default: 80 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.addConstraint('budgets', 'budgets_user_category_period_unique', {
    unique: ['user_id', 'category', 'period'],
  });

  // Splits
  pgm.createTable('splits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    receipt_id: { type: 'uuid', notNull: true, references: 'receipts(id)', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    share_token: { type: 'varchar(64)', unique: true, notNull: true },
    participants: { type: 'jsonb', default: '[]' },
    split_type: { type: 'varchar(20)', default: 'equal' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Smart alerts
  pgm.createTable('smart_alerts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    type: { type: 'varchar(50)', notNull: true },
    message: { type: 'text', notNull: true },
    severity: { type: 'varchar(20)', default: 'info' },
    data: { type: 'jsonb', default: '{}' },
    is_read: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // ML training data
  pgm.createTable('ml_training_data', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    merchant: { type: 'varchar(255)', notNull: true },
    items: { type: 'text', default: '' },
    category: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Password reset tokens
  pgm.createTable('password_resets', {
    token_hash: { type: 'varchar(64)', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Indexes
  pgm.createIndex('receipts', ['user_id', { name: 'date', sort: 'DESC' }], { name: 'idx_receipts_user_date' });
  pgm.createIndex('receipts', ['user_id', 'category'], { name: 'idx_receipts_user_category' });
  pgm.createIndex('receipts', ['user_id', 'amount'], { name: 'idx_receipts_user_amount' });
  pgm.createIndex('receipts', ['user_id', { name: 'date', sort: 'DESC' }, 'category'], {
    name: 'idx_receipts_user_date_category',
  });
  pgm.createIndex('receipts', ['deleted_at'], { name: 'idx_receipts_deleted_at' });
  pgm.createIndex('budgets', ['user_id']);
  pgm.createIndex('user_roles', ['user_id']);
  pgm.createIndex('user_roles', ['role_id']);
  pgm.createIndex('role_permissions', ['role_id']);
  pgm.createIndex('smart_alerts', ['user_id', { name: 'created_at', sort: 'DESC' }]);
  pgm.createIndex('smart_alerts', ['user_id', 'is_read'], {
    name: 'idx_smart_alerts_unread',
    where: 'is_read = false',
  });
  pgm.createIndex('splits', ['user_id']);
  pgm.createIndex('splits', ['share_token']);
  pgm.createIndex('ml_training_data', ['user_id']);
  pgm.createIndex('password_resets', ['user_id']);
  pgm.createIndex('password_resets', ['expires_at']);

  // Seed roles
  pgm.sql(`
    INSERT INTO roles (name, description) VALUES
      ('admin', 'Full system access'),
      ('user', 'Standard user access'),
      ('viewer', 'Read-only access')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Seed permissions
  pgm.sql(`
    INSERT INTO permissions (name, resource, action, description) VALUES
      ('receipts:create', 'receipts', 'create', 'Create receipts'),
      ('receipts:read', 'receipts', 'read', 'Read own receipts'),
      ('receipts:update', 'receipts', 'update', 'Update own receipts'),
      ('receipts:delete', 'receipts', 'delete', 'Delete own receipts'),
      ('receipts:read_all', 'receipts', 'read_all', 'Read all users receipts'),
      ('budgets:create', 'budgets', 'create', 'Create budgets'),
      ('budgets:read', 'budgets', 'read', 'Read own budgets'),
      ('budgets:update', 'budgets', 'update', 'Update own budgets'),
      ('budgets:delete', 'budgets', 'delete', 'Delete own budgets'),
      ('analytics:read', 'analytics', 'read', 'View analytics'),
      ('settings:read', 'settings', 'read', 'Read settings'),
      ('settings:update', 'settings', 'update', 'Update settings'),
      ('users:manage', 'users', 'manage', 'Manage all users'),
      ('roles:manage', 'roles', 'manage', 'Manage roles and permissions')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Assign permissions to roles
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'user' AND p.name IN (
      'receipts:create', 'receipts:read', 'receipts:update', 'receipts:delete',
      'budgets:create', 'budgets:read', 'budgets:update', 'budgets:delete',
      'analytics:read', 'settings:read', 'settings:update'
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'viewer' AND p.name IN (
      'receipts:read', 'budgets:read', 'analytics:read', 'settings:read'
    )
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.dropTable('password_resets');
  pgm.dropTable('ml_training_data');
  pgm.dropTable('smart_alerts');
  pgm.dropTable('splits');
  pgm.dropTable('budgets');
  pgm.dropTable('receipts');
  pgm.dropTable('user_settings');
  pgm.dropTable('user_roles');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('users');
};
