import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Настройки' }).click()
    await page.waitForURL('/settings')
    await expect(page.locator('h1:has-text("Настройки организации")')).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  test('settings has four tabs', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=Общие')).toBeVisible()
    await expect(page.locator('text=Интеграции')).toBeVisible()
    await expect(page.locator('text=Участники')).toBeVisible()
    await expect(page.locator('text=Роли')).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // General tab
  // ---------------------------------------------------------------------------
  test('general tab shows org name and currency', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=Название организации')).toBeVisible()
    await expect(page.locator('text=Валюта')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сохранить' }).first()).toBeVisible()
  })

  test('general tab save button works', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)
    // Click save without changes — should succeed
    await page.getByRole('button', { name: 'Сохранить' }).first().click()
    await expect(page.locator('text=Сохранено')).toBeVisible({ timeout: 5000 })
  })

  // ---------------------------------------------------------------------------
  // Integrations tab
  // ---------------------------------------------------------------------------
  test('integrations tab shows Telegram settings', async ({ page }) => {
    await page.goto('/settings')
    await page.getByText('Интеграции').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Telegram уведомления')).toBeVisible()
    await expect(page.locator('text=Bot Token')).toBeVisible()
    await expect(page.locator('text=Chat ID')).toBeVisible()
  })

  test('integrations tab has test button', async ({ page }) => {
    await page.goto('/settings')
    await page.getByText('Интеграции').click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: 'Тест' })).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Members tab
  // ---------------------------------------------------------------------------
  test('members tab shows members list', async ({ page }) => {
    await page.goto('/settings')
    await page.getByText('Участники').click()
    await page.waitForTimeout(1000)
    // Should show at least the current user
    const table = page.locator('.v-data-table')
    await expect(table).toBeVisible({ timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Roles tab
  // ---------------------------------------------------------------------------
  test('roles tab shows system roles', async ({ page }) => {
    await page.goto('/settings')
    await page.getByText('Роли').click()
    await page.waitForTimeout(1000)
    // System roles from seed: admin, manager, viewer
    await expect(page.locator('text=Администратор')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Менеджер')).toBeVisible()
    await expect(page.locator('text=Просмотр')).toBeVisible()
  })
})
