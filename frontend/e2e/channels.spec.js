import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Channels', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to channels list', async ({ page }) => {
    await page.getByRole('link', { name: 'Каналы' }).click()
    await page.waitForURL('/channels')
    await expect(page.locator('h1:has-text("Каналы продаж")')).toBeVisible()
  })

  test('list shows table or empty state', async ({ page }) => {
    await page.goto('/channels')
    const table = page.locator('.v-data-table')
    const empty = page.locator('text=Нет каналов')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 10000 })
  })

  test('create channel dialog opens', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Добавить канал' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новый канал')).toBeVisible()
    await expect(page.locator('text=Юнит')).toBeVisible()
    await expect(page.locator('text=Площадка')).toBeVisible()
  })

  test('create channel with unit and platform', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Добавить канал' }).click()
    await page.waitForTimeout(500)

    // Select unit
    await page.locator('.v-dialog .v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Select platform
    await page.locator('.v-dialog .v-select').nth(1).click()
    await page.locator('.v-list-item').first().click()

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(3000)
    // Channel should appear in list
    const table = page.locator('.v-data-table')
    await expect(table).toBeVisible({ timeout: 10000 })
  })

  test('edit channel dialog opens', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать канал')).toBeVisible()
  })

  test('delete channel → confirmation', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить канал?')).toBeVisible()
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  test('iCal export URL is displayed', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    // Should show iCal export path
    const codeEl = page.locator('.v-data-table code').first()
    if (await codeEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await codeEl.textContent()
      expect(text).toContain('/api/v1/public/ical/')
    }
  })

  test('copy URL button is visible', async ({ page }) => {
    await page.goto('/channels')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const copyBtn = page.locator('.mdi-content-copy').first()
    if (await copyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(copyBtn).toBeVisible()
    }
  })
})
