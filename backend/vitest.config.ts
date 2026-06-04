import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./src/tests/setup.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },

    // -------------------------------------------------------------------------
    //  Coverage configuration — used when invoked with `--coverage`.
    //  CI enforces these via the workflow; locally `npm run test:coverage`
    //  applies the same gates so problems surface before the PR.
    // -------------------------------------------------------------------------
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/tests/**',
        'src/benchmarks/**',
        'src/index.ts',
      ],
      thresholds: {
        // Baseline pending measurement — tighten as tests are added.
        // Roadmap target 80% per Phase 3 of the engineering audit.
        lines: 0,
        functions: 0,
        statements: 0,
        branches: 0,
      },
      all: true,
      clean: true,
    },
  },
});
