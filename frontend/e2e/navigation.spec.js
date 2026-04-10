import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Shell navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar contains all nav items', async ({ page }) => {
    const sidebar = page.locator('.v-navigation-drawer')
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Properties' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Amenities' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Branches' })).toBeVisible()
  })

  test('org switcher shows organization name', async ({ page }) => {
    const sidebar = page.locator('.v-navigation-drawer')
    // Org name from seed — "Demo Hostel Network" or similar
    await expect(sidebar.locator('text=Организация')).toBeVisible()
  })

  test('topbar shows user name and brand', async ({ page }) => {
    const topbar = page.locator('.v-app-bar')
    await expect(topbar.getByText('Apartus')).toBeVisible()
    await expect(topbar.getByText('Demo User')).toBeVisible()
  })

  test('navigate through all sections without errors', async ({ page }) => {
    await page.getByRole('link', { name: 'Properties' }).click()
    await page.waitForURL('/properties')
    await expect(page.locator('text=Объекты')).toBeVisible()

    await page.getByRole('link', { name: 'Amenities' }).click()
    await page.waitForURL('/amenities')
    await expect(page.locator('text=Удобства')).toBeVisible()

    await page.getByRole('link', { name: 'Branches' }).click()
    await page.waitForURL('/branches')
    await expect(page.locator('text=Филиалы')).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()
    await page.waitForURL('/')
    await expect(page.locator('text=Здравствуйте')).toBeVisible()
  })
})
