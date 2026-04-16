import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// FT-020 Phase 1 — Gantt Calendar e2e (CHK-07).
//
// Per feature.md EC-06: e2e verifies render + today marker + jump-to-date
// using existing seed data. Lane-stacking overlap handling (SC-05) is
// defensive code and verified at unit/component level (CHK-02) — backend's
// `Reservation#no_overlapping_reservations` prevents creating overlap
// through the public API, so direct e2e assertion is not feasible.

test.describe('Gantt Calendar (CHK-07)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/calendar')
  })

  test('renders at least one reservation bar from seed data (SC-01)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })
    const count = await page.locator('.gantt-item').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('today marker is visible in default range (SC-01)', async ({ page }) => {
    await page.waitForSelector('[data-testid="today-marker"]', { timeout: 5000 })
    await expect(page.locator('[data-testid="today-marker"]')).toBeVisible()
  })

  test('jump-to-date button opens date picker (SC-06)', async ({ page }) => {
    // Click-day interaction with Vuetify v-date-picker is notoriously brittle
    // in headless Chrome (day-button DOM structure varies by month); test
    // the interaction entry point here and leave actual date-pick to manual
    // QA (STEP-18). The underlying scrollToDate logic is unit-tested in
    // GanttTimeline.test.js.
    await page.waitForSelector('[data-testid="jump-btn"]', { timeout: 5000 })
    await page.locator('[data-testid="jump-btn"]').click()
    await expect(page.locator('.v-date-picker')).toBeVisible({ timeout: 3000 })
  })

  // FT-021 Handover Mode
  test('handover toggle applies handover / dimmed classes to bars (FT-021, SC-01..04)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })

    // Pre-toggle: bars должны быть без handover-specific классов.
    const preCount = await page.locator('.gantt-item--dimmed').count()
    expect(preCount).toBe(0)

    // Activate handover mode.
    await page.locator('[data-testid="handover-btn"]').click()
    // Either some bars get handover-* class (if seed has matching reservations)
    // or all get dimmed — at minimum, ≥1 bar should have one of these classes.
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-item--dimmed, .gantt-item--handover-checkin_today, .gantt-item--handover-checkin_tomorrow, .gantt-item--handover-checkout_today, .gantt-item--handover-checkout_tomorrow').length > 0,
      { timeout: 5000 }
    )
    const affected = await page.locator('.gantt-item--dimmed, [class*="gantt-item--handover-"]').count()
    expect(affected).toBeGreaterThanOrEqual(1)

    // Deactivate — dimmed / handover classes gone.
    await page.locator('[data-testid="handover-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-item--dimmed').length === 0,
      { timeout: 5000 }
    )
  })

  // FT-023 Idle Gaps Mode
  test('idle toggle renders gap layer under bars; mutual exclusion with handover (FT-023, SC-01,04)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })

    // Pre-toggle: no gap layer.
    const preGapCount = await page.locator('.gantt-row__idle-gap').count()
    expect(preGapCount).toBe(0)

    // Activate idle mode.
    await page.locator('[data-testid="idle-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__idle-gap').length > 0,
      { timeout: 5000 }
    )
    const gapCount = await page.locator('.gantt-row__idle-gap').count()
    expect(gapCount).toBeGreaterThanOrEqual(1)

    // Mutual exclusion: switch to handover → gaps disappear.
    await page.locator('[data-testid="handover-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__idle-gap').length === 0,
      { timeout: 5000 }
    )

    // Back to normal — deactivate handover.
    await page.locator('[data-testid="handover-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__idle-gap, .gantt-item--dimmed, [class*="gantt-item--handover-"]').length === 0,
      { timeout: 5000 }
    )
  })

  // FT-024 Heatmap Mode
  test('heatmap toggle renders per-day tint cells; mutual exclusion (FT-024, SC-01,04)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })

    // Pre-toggle: no heat cells.
    const preCount = await page.locator('.gantt-row__heat-cell').count()
    expect(preCount).toBe(0)

    // Activate heatmap mode.
    await page.locator('[data-testid="heatmap-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__heat-cell').length > 0,
      { timeout: 5000 }
    )
    const cellCount = await page.locator('.gantt-row__heat-cell').count()
    expect(cellCount).toBeGreaterThanOrEqual(1)

    // Mutual exclusion: switch to idle → heatmap cells disappear.
    await page.locator('[data-testid="idle-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__heat-cell').length === 0,
      { timeout: 5000 }
    )

    // Deactivate idle — clean state.
    await page.locator('[data-testid="idle-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-row__heat-cell, .gantt-row__idle-gap, [class*="gantt-item--handover-"]').length === 0,
      { timeout: 5000 }
    )
  })

  // FT-022 Overdue Mode
  test('overdue toggle applies overdue / dimmed classes; mutual exclusion with handover (FT-022, SC-01..04)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })

    // Activate overdue mode.
    await page.locator('[data-testid="overdue-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-item--dimmed, .gantt-item--overdue').length > 0,
      { timeout: 5000 }
    )
    const affected = await page.locator('.gantt-item--dimmed, .gantt-item--overdue').count()
    expect(affected).toBeGreaterThanOrEqual(1)

    // Mutual exclusion: click handover → overdue classes gone, handover classes appear.
    await page.locator('[data-testid="handover-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-item--overdue').length === 0,
      { timeout: 5000 }
    )
    // At this point handover mode active — at minimum some bars dimmed or handover-*.
    const afterHandover = await page.locator('.gantt-item--dimmed, [class*="gantt-item--handover-"]').count()
    expect(afterHandover).toBeGreaterThanOrEqual(1)

    // Deactivate handover — всё чисто.
    await page.locator('[data-testid="handover-btn"]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('.gantt-item--dimmed, .gantt-item--overdue, [class*="gantt-item--handover-"]').length === 0,
      { timeout: 5000 }
    )
  })
})
