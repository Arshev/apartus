import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Branches tree', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'Branches' }).click()
    await page.waitForURL('/branches')
  })

  test('branches page loads from sidebar', async ({ page }) => {
    await expect(page.locator('text=Филиалы')).toBeVisible()
  })

  test('create root branch via dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await page.locator('.v-dialog').getByLabel('Название').fill('E2E HQ Branch')
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('text=E2E HQ Branch')).toBeVisible({ timeout: 10000 })
  })

  test('tree renders nested branches', async ({ page }) => {
    // Demo seed should have branches — verify tree structure renders
    const nodes = page.locator('.mdi-source-branch')
    await expect(nodes.first()).toBeVisible()
  })
})
