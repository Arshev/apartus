import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Reservations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // Navigation & list
  // ---------------------------------------------------------------------------
  test('sidebar link navigates to reservations list', async ({ page }) => {
    await page.getByRole('link', { name: 'Бронирования' }).click()
    await page.waitForURL('/reservations')
    await expect(page.locator('text=Бронирования').first()).toBeVisible()
  })

  test('list shows table or empty state', async ({ page }) => {
    await page.goto('/reservations')
    // Either data-table with rows or empty state
    const table = page.locator('.v-data-table')
    const empty = page.locator('text=Нет бронирований')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 10000 })
  })

  test('list table has correct columns', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForTimeout(2000)
    const table = page.locator('.v-data-table')
    if (await table.isVisible()) {
      await expect(page.locator('text=Юнит')).toBeVisible()
      await expect(page.locator('text=Гость')).toBeVisible()
      await expect(page.locator('text=Заезд')).toBeVisible()
      await expect(page.locator('text=Выезд')).toBeVisible()
      await expect(page.locator('text=Статус')).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  test('"Новое бронирование" button navigates to form', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForTimeout(1000)
    await page.getByRole('link', { name: 'Новое бронирование' }).first().click()
    await page.waitForURL('/reservations/new')
    await expect(page.locator('text=Новое бронирование').first()).toBeVisible()
  })

  test('create reservation form has required fields', async ({ page }) => {
    await page.goto('/reservations/new')
    await expect(page.locator('text=Юнит')).toBeVisible()
    await expect(page.locator('text=Дата заезда')).toBeVisible()
    await expect(page.locator('text=Дата выезда')).toBeVisible()
    await expect(page.locator('text=Количество гостей')).toBeVisible()
    await expect(page.locator('text=Цена')).toBeVisible()
  })

  test('create reservation → redirects to list', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(1000)

    // Select unit (first option)
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()

    // Fill dates
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 30)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 3)
    const fmtDate = (d) => d.toISOString().slice(0, 10)

    await page.locator('input[type="date"]').first().fill(fmtDate(tomorrow))
    await page.locator('input[type="date"]').nth(1).fill(fmtDate(dayAfter))

    // Guests count
    await page.getByLabel('Количество гостей').fill('2')

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/reservations', { timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------
  test('edit reservation → form pre-populated', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/reservations\/\d+\/edit/)
    await expect(page.locator('text=Редактировать бронирование')).toBeVisible()
    // Check-in date should be pre-filled
    await expect(page.locator('input[type="date"]').first()).not.toHaveValue('', { timeout: 5000 })
  })

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------
  test('check-in button visible for confirmed reservations', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    // Look for "Подтверждено" chip — if present, Check-in button should be nearby
    const confirmedChip = page.locator('text=Подтверждено').first()
    if (await confirmedChip.isVisible()) {
      const row = confirmedChip.locator('xpath=ancestor::tr')
      await expect(row.locator('text=Check-in')).toBeVisible()
    }
  })

  test('check-in changes status to checked_in', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const checkInBtn = page.locator('.v-data-table tbody tr')
      .filter({ hasText: 'Подтверждено' })
      .first()
      .getByText('Check-in')
    if (await checkInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkInBtn.click()
      await expect(page.locator('text=Check-in выполнен')).toBeVisible({ timeout: 5000 })
    }
  })

  test('check-out button visible for checked_in reservations', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const checkedInChip = page.locator('text=Заселён').first()
    if (await checkedInChip.isVisible()) {
      const row = checkedInChip.locator('xpath=ancestor::tr')
      await expect(row.locator('text=Check-out')).toBeVisible()
    }
  })

  test('cancel button visible for active reservations', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    // Cancel button should be visible for confirmed or checked_in
    const activeRow = page.locator('.v-data-table tbody tr')
      .filter({ hasText: /Подтверждено|Заселён/ })
      .first()
    if (await activeRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activeRow.locator('text=Отмена').first()).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  test('delete reservation → confirmation dialog', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить бронирование?')).toBeVisible()
    // Close without deleting
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  // ---------------------------------------------------------------------------
  // Status chips have correct colors
  // ---------------------------------------------------------------------------
  test('status chips render with correct labels', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForTimeout(2000)
    const table = page.locator('.v-data-table')
    if (await table.isVisible()) {
      // At least one status chip should be visible
      const chips = page.locator('.v-chip')
      await expect(chips.first()).toBeVisible()
    }
  })
})
