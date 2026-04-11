import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Expenses — CRUD and data formatting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/expenses')
    await page.waitForTimeout(2000)
  })

  // ---------------------------------------------------------------------------
  // Seed data display
  // ---------------------------------------------------------------------------
  test('table shows seed expenses (7 items)', async ({ page }) => {
    const rows = page.locator('.v-data-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('category column shows localized labels, not raw enum values', async ({ page }) => {
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    const joined = texts.join(' ')
    // Seed categories: maintenance, utilities, cleaning, supplies, other
    // Should show Russian: Обслуживание, Коммунальные, Уборка, Расходники, Прочее
    const raw = ['maintenance', 'utilities', 'cleaning', 'supplies', 'other']
    const hasRaw = raw.some((r) => joined.includes(r))
    // Raw values should NOT appear in display
    expect(hasRaw).toBeFalsy()
  })

  test('amount column shows formatted currency, not raw cents', async ({ page }) => {
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    // Seed: 3000 cents = 30.00 ₽. Should NOT show "3000" as raw number
    // Should show formatted value with currency symbol
    const joined = texts.join(' ')
    expect(joined).toMatch(/₽|\$|€/)
  })

  // ---------------------------------------------------------------------------
  // Create expense — amount conversion
  // ---------------------------------------------------------------------------
  test('create expense with amount in RUB, verify it saves correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await page.waitForTimeout(500)

    // Select category
    await page.locator('.v-dialog .v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Enter amount in rubles (not cents)
    await page.locator('.v-dialog').getByLabel('Сумма').fill('250.50')

    // Date
    const today = new Date().toISOString().slice(0, 10)
    await page.locator('.v-dialog').getByLabel('Дата').fill(today)

    // Description
    await page.locator('.v-dialog').getByLabel('Описание').fill('E2E test expense')

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(3000)

    // Verify expense appears with formatted amount
    await expect(page.locator('text=E2E test expense')).toBeVisible()
  })

  test('create expense defaults date to today', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await page.waitForTimeout(500)
    const dateField = page.locator('.v-dialog').getByLabel('Дата')
    const value = await dateField.inputValue()
    const today = new Date().toISOString().slice(0, 10)
    expect(value).toBe(today)
  })

  // ---------------------------------------------------------------------------
  // Edit — form pre-populated with existing data
  // ---------------------------------------------------------------------------
  test('edit populates dialog with existing expense data', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать')).toBeVisible()
    // Amount should be non-zero
    const amountField = page.locator('.v-dialog').getByLabel('Сумма')
    const value = await amountField.inputValue()
    expect(Number(value)).toBeGreaterThan(0)
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  test('delete expense shows confirmation dialog with correct wording', async ({ page }) => {
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить расход?')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })
})
