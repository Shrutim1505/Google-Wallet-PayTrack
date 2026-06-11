/**
 * ESLint configuration — backend.
 *
 * Uses the classic config format because devDependencies pin ESLint 8.x.
 * If/when eslint is bumped to 9.x, migrate this to a flat `eslint.config.js`.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'reports/',
    '*.cjs',
    'migrations/',
    'src/benchmarks/',
  ],
  rules: {
    // Allow `_unused` parameter / variable convention used widely in the codebase.
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Don't fight TS for `any` in service-layer reducers — the audit
    // already calls these out for separate cleanup.
    '@typescript-eslint/no-explicit-any': 'warn',
    // The codebase consistently uses non-null assertions on req.userId
    // after authMiddleware. Keep this as a warning, not an error.
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Allow `declare global { namespace Express { ... } }` which is the
    // canonical pattern for extending Express request types.
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    // Empty catch / function bodies are intentional in best-effort cleanup paths.
    '@typescript-eslint/no-empty-function': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    // `while (true)` is a common pattern in algorithm code (heap, retry, etc).
    'no-constant-condition': ['error', { checkLoops: false }],
    // `require()` is needed by the migration files which are .cjs.
    '@typescript-eslint/no-var-requires': 'off',
    // Prefer const over let when not reassigned.
    'prefer-const': 'error',
  },
  overrides: [
    {
      // Test files can be more relaxed.
      files: ['src/tests/**/*.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
