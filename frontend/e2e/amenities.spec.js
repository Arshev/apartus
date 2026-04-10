import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Amenities catalog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'Amenities' }).click()
    await page.waitForURL('/amenities')
  })

  test('amenities list loads from sidebar', async ({ page }) => {
    await expect(page.locator('text=Удобства')).toBeVisible()
  })

  test('create amenity via dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await page.locator('.v-dialog').getByLabel('Название').fill('E2E WiFi')
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('text=E2E WiFi')).toBeVisible({ timeout: 10000 })
  })
})
