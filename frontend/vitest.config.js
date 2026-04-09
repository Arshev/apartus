import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// Vitest merges this with vite.config.js automatically, but we call mergeConfig
// explicitly so the Vuetify/Vue plugins from vite.config are applied in tests too.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      include: ['src/**/*.{test,spec}.{js,mjs}', 'src/__tests__/**/*.{test,spec}.{js,mjs}'],
      coverage: {
        provider: 'v8',
        // json-summary is required by scripts/coverage-badge.mjs (reads total.lines.pct).
        // json is kept for debugging; text is the console summary.
        reporter: ['text', 'json', 'json-summary'],
        reportsDirectory: './coverage',
        // Without explicit include, v8 only counts files that tests actually import,
        // which inflates coverage %. Forcing src/** gives an honest denominator.
        include: ['src/**/*.{js,vue}'],
        exclude: [
          'src/**/*.{test,spec}.{js,mjs}',
          'src/__tests__/**',
          'src/main.js',
          'src/plugins/**',
        ],
        thresholds: {
          // HW-1 ratchet: start at 0, raise after each feature. Mirrors backend
          // SimpleCov ratchet in spec_helper.rb. Final HW-1 target: 80 (may slip to HW-2).
          lines: 0,
        },
      },
    },
  }),
)
