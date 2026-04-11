import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Unit edit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Navigate to units of first property
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-door').click()
    await page.waitForURL(/\/properties\/\d+\/units/)
  })

  test('edit button navigates to edit form', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    await expect(page.locator('text=Редактировать помещение')).toBeVisible()
  })

  test('edit form is pre-populated with unit data', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    // Name should be pre-filled
    await expect(page.getByLabel('Название')).not.toHaveValue('', { timeout: 5000 })
    // Capacity should be pre-filled
    await expect(page.getByLabel('Вместимость')).not.toHaveValue('', { timeout: 5000 })
  })

  test('edit form save updates unit', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)

    // Change name
    const nameField = page.getByLabel('Название')
    await nameField.fill('E2E Updated Unit')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForURL(/\/properties\/\d+\/units$/, { timeout: 10000 })
    await expect(page.locator('text=E2E Updated Unit').first()).toBeVisible()
  })

  test('edit form back arrow returns to unit list', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    await page.locator('.mdi-arrow-left').click()
    await page.waitForURL(/\/properties\/\d+\/units$/)
  })

  test('base price field is visible in edit form', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    await expect(page.locator('text=Базовая цена')).toBeVisible()
  })
})
