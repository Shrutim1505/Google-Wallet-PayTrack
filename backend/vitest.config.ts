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
        // Current baseline — existing 14 unit tests cover algorithm
        // helpers and a subset of middleware. Raise to 80% per Phase 3
        // of the engineering audit (untested services + controllers).
        lines: 30,
        functions: 30,
        statements: 30,
        branches: 30,
      },
      all: true,
      clean: true,
    },
  },
});
