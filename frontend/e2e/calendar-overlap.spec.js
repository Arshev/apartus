import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// FT-020 Phase 1 — Gantt Calendar e2e.
//
// Phase 1 of this spec (STEP-12 of the implementation plan) is intentionally
// skeleton: tests are skipped and only validate that Playwright config + login
// helper + browser binary work. Real assertions land in STEP-15 after the
// atomic switchover commit.

test.describe('Gantt Calendar — overlap, today marker, jump-to-date (CHK-07)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/calendar')
  })

  test.skip('renders 3 overlapping reservations in distinct lanes (SC-05, EC-06)', async () => {
    // Will be unskipped in STEP-15 with seed of 3 overlapping bookings + lane
    // assertion (3× .gantt-item with distinct top offsets).
  })

  test.skip('today marker is visible in viewport (SC-01)', async () => {
    // Will assert [data-testid="today-marker"] visible.
  })

  test.skip('jump-to-date scrolls viewport to chosen date (SC-06)', async () => {
    // Will use date picker to pick a target date and assert scroll position.
  })
})
