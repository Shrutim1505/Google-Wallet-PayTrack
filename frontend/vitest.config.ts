/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest configuration for the PayTrack frontend.
 *
 * - Runs in JSDOM so React Testing Library works without a browser.
 * - Setup file wires up jest-dom matchers, MSW lifecycle, and Zustand
 *   store reset between tests.
 * - Coverage gated at 70 % lines and branches per CI requirement.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: false,
    testTimeout: 10_000,

    // Same files vitest will scan; explicit list keeps weird matches out.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Reporters: pretty for humans, junit for CI ingestion.
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'reports/junit/frontend-unit.xml' },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/shared/api/schema.d.ts',
        // Pure type / index re-export files contribute no logic.
        'src/types/**',
        'src/shared/ui/index.ts',
        // Stub pages flagged in the audit as not-yet-implemented.
        'src/pages/OtherPages.tsx',
        'src/pages/NotFoundPage.tsx',
        'src/pages/AnalyticsPage.tsx',
        'src/pages/SettingsPage.tsx',
        'src/pages/ReceiptDetailPage.tsx',
        // Config-shaped code best validated via integration tests.
        'src/app/App.tsx',
        'src/app/AppLayout.tsx',
        'src/app/router.tsx',
        'src/shared/api/queryClient.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
      all: true,
      clean: true,
    },
  },
});
