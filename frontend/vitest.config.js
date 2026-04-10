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
      // Vuetify component CSS is imported on demand by vite-plugin-vuetify
      // (autoImport). Without inlining, Node tries to import .css natively and
      // fails with "Unknown file extension".
      server: {
        deps: {
          inline: [/vuetify/],
        },
      },
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
          // Coverage ratchet — raise after each feature, never lower without ADR.
          // Actual: 98.18%. Remaining: client.js subscriber queue (15-17,75-83),
          // UnitListView onMounted async (130-131). Both covered by E2E.
          lines: 97,
        },
      },
    },
  }),
)
