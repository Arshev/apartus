import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Expenses', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to expenses', async ({ page }) => {
    await page.getByRole('link', { name: 'Расходы' }).click()
    await page.waitForURL('/expenses')
    await expect(page.locator('h1:has-text("Расходы")')).toBeVisible()
  })

  test('list shows table or empty state', async ({ page }) => {
    await page.goto('/expenses')
    const table = page.locator('.v-data-table')
    const empty = page.locator('text=Нет расходов')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 10000 })
  })

  test('create expense via dialog', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новый расход')).toBeVisible()

    // Select category
    await page.locator('.v-dialog .v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Fill amount
    await page.locator('.v-dialog').getByLabel('Сумма').fill('1500')

    // Fill date
    const today = new Date().toISOString().slice(0, 10)
    await page.locator('.v-dialog').getByLabel('Дата').fill(today)

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(3000)
    // Expense should appear in list
    const table = page.locator('.v-data-table')
    await expect(table).toBeVisible({ timeout: 10000 })
  })

  test('edit expense via dialog', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('delete expense → confirmation', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить расход?')).toBeVisible()
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  test('category labels are localized', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    // Categories should be in Russian
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    const knownCategories = ['Обслуживание', 'Коммуналка', 'Уборка', 'Материалы', 'Прочее']
    const hasLocalized = texts.some((t) => knownCategories.some((c) => t.includes(c)))
    expect(hasLocalized).toBeTruthy()
  })
})
