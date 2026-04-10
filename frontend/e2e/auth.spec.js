import { test, expect } from '@playwright/test'
import { DEMO_USER, login } from './helpers.js'

test.describe('Auth flow', () => {
  test('login with valid credentials → dashboard', async ({ page }) => {
    await login(page)
    await expect(page.locator('text=Здравствуйте')).toBeVisible()
  })

  test('login with invalid credentials → stays on login', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('wrong@email.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: 'Войти' }).click()
    // Either API error shows as v-alert, or form validation keeps us on login
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/auth/login')
    // Not redirected to dashboard = auth rejected
  })

  test('unauthenticated access to /properties → redirects to login', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/auth/login')
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    })
    await page.goto('/properties')
    await page.waitForURL(/\/auth\/login/)
    expect(page.url()).toContain('/auth/login')
  })

  test('logout → redirects to login', async ({ page }) => {
    await login(page)
    // Open user menu
    await page.locator('.v-app-bar').getByText(DEMO_USER.fullName).click()
    await page.getByText('Выйти').click()
    await page.waitForURL(/\/auth\/login/)
  })

  test('guest with session accessing /auth/login → redirects to dashboard', async ({ page }) => {
    await login(page)
    await page.goto('/auth/login')
    await page.waitForURL('/')
    await expect(page.locator('text=Здравствуйте')).toBeVisible()
  })
})
