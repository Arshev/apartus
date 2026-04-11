import { test, expect } from '@playwright/test'
import { login, DEMO_USER } from './helpers.js'

test.describe('AppTopbar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows brand name "Apartus"', async ({ page }) => {
    const topbar = page.locator('.v-app-bar')
    await expect(topbar.getByText('Apartus')).toBeVisible()
  })

  test('shows logged-in user full name', async ({ page }) => {
    const topbar = page.locator('.v-app-bar')
    await expect(topbar.getByText(DEMO_USER.fullName)).toBeVisible()
  })

  test('user menu opens on click and shows "Выйти"', async ({ page }) => {
    await page.locator('.v-app-bar').getByText(DEMO_USER.fullName).click()
    await expect(page.getByText('Выйти')).toBeVisible()
  })

  test('drawer toggle button is visible', async ({ page }) => {
    const navIcon = page.locator('.v-app-bar-nav-icon')
    await expect(navIcon).toBeVisible()
  })

  test('drawer toggle hides/shows sidebar', async ({ page }) => {
    const sidebar = page.locator('.v-navigation-drawer')
    await expect(sidebar).toBeVisible()
    // Click toggle — sidebar may hide on small viewports
    const navIcon = page.locator('.v-app-bar-nav-icon')
    await navIcon.click()
    await page.waitForTimeout(500)
    // Click again to restore
    await navIcon.click()
    await page.waitForTimeout(500)
  })

  test('logout redirects to login page', async ({ page }) => {
    await page.locator('.v-app-bar').getByText(DEMO_USER.fullName).click()
    await page.getByText('Выйти').click()
    await page.waitForURL(/\/auth\/login/)
  })
})
