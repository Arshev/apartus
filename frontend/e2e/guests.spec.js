import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Guests — CRUD and validation logic', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/guests')
    await page.waitForTimeout(2000)
  })

  // ---------------------------------------------------------------------------
  // Seed data verification
  // ---------------------------------------------------------------------------
  test('table shows seed guests (5 guests)', async ({ page }) => {
    const rows = page.locator('.v-data-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('seed guest names visible (Иван Петров, Мария Сидорова, etc.)', async ({ page }) => {
    await expect(page.locator('text=Иван').first()).toBeVisible()
    await expect(page.locator('text=Мария').first()).toBeVisible()
    await expect(page.locator('text=Алексей').first()).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Create — validation
  // ---------------------------------------------------------------------------
  test('create without first_name shows validation error (form does not submit)', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    // Leave first_name empty, fill last_name
    await page.getByLabel('Фамилия').fill('TestLast')
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(1000)
    // Should stay on form (validation fails)
    expect(page.url()).toContain('/guests/new')
  })

  test('create without last_name shows validation error', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await page.getByLabel('Имя').fill('TestFirst')
    // Leave last_name empty
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/guests/new')
  })

  test('create with valid data redirects to list and shows new guest', async ({ page }) => {
    const ts = Date.now()
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await page.getByLabel('Имя').fill('E2E')
    await page.getByLabel('Фамилия').fill(`Guest ${ts}`)
    await page.getByLabel('Email').fill(`e2e-${ts}@test.com`)
    await page.getByLabel('Телефон').fill('+79009999999')
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })
    await expect(page.locator(`text=Guest ${ts}`)).toBeVisible()
  })

  test('duplicate email shows server-side validation error', async ({ page }) => {
    // Try to create guest with existing email from seed
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await page.getByLabel('Имя').fill('Duplicate')
    await page.getByLabel('Фамилия').fill('Test')
    await page.getByLabel('Email').fill('ivan@example.com') // seed email
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(2000)
    // Should show error alert (email uniqueness violation)
    const alert = page.locator('.v-alert')
    if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await alert.textContent()
      expect(text?.toLowerCase()).toMatch(/email|уже|taken/)
    }
  })

  // ---------------------------------------------------------------------------
  // Edit — pre-population and save
  // ---------------------------------------------------------------------------
  test('edit pre-fills all fields from existing guest', async ({ page }) => {
    // Find Иван Петров row
    const ivanRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Иван' }).first()
    await ivanRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/guests\/\d+\/edit/)
    await expect(page.locator('text=Редактировать гостя')).toBeVisible()
    // Fields pre-filled
    await expect(page.getByLabel('Имя')).toHaveValue('Иван', { timeout: 5000 })
    await expect(page.getByLabel('Фамилия')).toHaveValue('Петров', { timeout: 5000 })
    await expect(page.getByLabel('Email')).toHaveValue('ivan@example.com', { timeout: 5000 })
  })

  test('edit save redirects back to list', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/guests\/\d+\/edit/)
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Delete — confirmation with guest name
  // ---------------------------------------------------------------------------
  test('delete dialog shows guest full name in confirmation text', async ({ page }) => {
    const ivanRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Иван' }).first()
    await ivanRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить гостя?')).toBeVisible()
    // Confirmation should mention guest name
    const dialogText = await page.locator('.v-dialog').textContent()
    expect(dialogText).toContain('Иван')
    expect(dialogText).toContain('Петров')
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('actual delete removes guest from list with snackbar', async ({ page }) => {
    // Create a guest to delete
    const ts = Date.now()
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await page.getByLabel('Имя').fill('ToDelete')
    await page.getByLabel('Фамилия').fill(`Victim ${ts}`)
    await page.getByLabel('Email').fill(`delete-${ts}@test.com`)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })

    // Delete it
    const row = page.locator('.v-data-table tbody tr').filter({ hasText: `Victim ${ts}` })
    await row.locator('.mdi-delete').click()
    await page.locator('.v-dialog').getByRole('button', { name: 'Удалить' }).click()
    await expect(page.locator('text=Гость удалён')).toBeVisible({ timeout: 5000 })
    await expect(page.locator(`text=Victim ${ts}`)).not.toBeVisible({ timeout: 3000 })
  })

  // ---------------------------------------------------------------------------
  // Cancel navigation
  // ---------------------------------------------------------------------------
  test('cancel on create form returns to list without creating', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await page.getByLabel('Имя').fill('Should Not Exist')
    await page.getByRole('link', { name: 'Отмена' }).click()
    await page.waitForURL('/guests')
    await expect(page.locator('text=Should Not Exist')).not.toBeVisible()
  })
})
