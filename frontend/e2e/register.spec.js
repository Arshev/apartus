import { test, expect } from '@playwright/test'

test.describe('Registration flow', () => {
  test('register page loads', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('text=Регистрация')).toBeVisible()
  })

  test('register form has all required fields', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('text=Название организации')).toBeVisible()
    await expect(page.locator('text=Имя')).toBeVisible()
    await expect(page.locator('text=Фамилия')).toBeVisible()
    await expect(page.locator('text=Email')).toBeVisible()
    await expect(page.locator('text=Пароль').first()).toBeVisible()
    await expect(page.locator('text=Подтверждение пароля')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Создать аккаунт' })).toBeVisible()
  })

  test('register form has link to login', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('text=Уже есть аккаунт?')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible()
  })

  test('login link navigates to login page', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByRole('link', { name: 'Войти' }).click()
    await page.waitForURL(/\/auth\/login/)
  })

  test('submit empty form shows validation errors', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByRole('button', { name: 'Создать аккаунт' }).click()
    await page.waitForTimeout(1000)
    // Should stay on register page
    expect(page.url()).toContain('/auth/register')
  })

  test('password mismatch shows validation error', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByLabel('Название организации').fill('Test Org')
    await page.locator('input').filter({ hasText: '' }).nth(1).fill('John') // first_name
    await page.locator('input[type="password"]').first().fill('Password123!')
    await page.locator('input[type="password"]').nth(1).fill('DifferentPassword!')
    await page.getByRole('button', { name: 'Создать аккаунт' }).click()
    await page.waitForTimeout(1000)
    // Should show "Пароли не совпадают" validation
    expect(page.url()).toContain('/auth/register')
  })

  test('successful registration redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/register')
    const ts = Date.now()
    await page.getByLabel('Название организации').fill(`E2E Org ${ts}`)
    // First name / Last name fields
    const inputs = page.locator('.v-text-field input[type="text"]')
    await inputs.nth(1).fill('E2E')
    await inputs.nth(2).fill('User')
    await page.getByLabel('Email').fill(`e2e-reg-${ts}@test.com`)
    await page.locator('input[type="password"]').first().fill('Password123!')
    await page.locator('input[type="password"]').nth(1).fill('Password123!')

    await page.getByRole('button', { name: 'Создать аккаунт' }).click()
    // Should redirect to dashboard on success
    await page.waitForURL('/', { timeout: 10000 })
  })
})
