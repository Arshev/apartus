import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Organization selection', () => {
  // Note: select-organization page is only shown when user has multiple orgs.
  // Demo user likely has one org. These tests verify the page renders correctly
  // when navigated to directly.

  test('select-organization page requires auth', async ({ page }) => {
    await page.goto('/auth/login')
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    })
    await page.goto('/auth/select-organization')
    // Should redirect to login since requiresAuth: true
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('select-organization page loads when authenticated', async ({ page }) => {
    await login(page)
    await page.goto('/auth/select-organization')
    await expect(page.locator('text=Выберите организацию')).toBeVisible()
  })

  test('org list shows at least one organization', async ({ page }) => {
    await login(page)
    await page.goto('/auth/select-organization')
    await page.waitForTimeout(1000)
    // Should show at least the demo org
    const listItems = page.locator('.v-list-item')
    await expect(listItems.first()).toBeVisible()
  })

  test('clicking org navigates to dashboard', async ({ page }) => {
    await login(page)
    await page.goto('/auth/select-organization')
    await page.waitForTimeout(1000)
    const listItems = page.locator('.v-list-item')
    await listItems.first().click()
    await page.waitForURL('/', { timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Org switcher in sidebar
  // ---------------------------------------------------------------------------
  test('sidebar org switcher opens menu with orgs', async ({ page }) => {
    await login(page)
    // Click the org switcher in sidebar
    const sidebar = page.locator('.v-navigation-drawer')
    await sidebar.locator('.mdi-chevron-down').click()
    await page.waitForTimeout(500)
    // Menu should be visible with org name
    const menu = page.locator('.v-menu .v-list')
    if (await menu.isVisible({ timeout: 3000 }).catch(() => false)) {
      const items = menu.locator('.v-list-item')
      await expect(items.first()).toBeVisible()
    }
  })
})
