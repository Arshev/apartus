import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Guests CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // Navigation & list
  // ---------------------------------------------------------------------------
  test('sidebar link navigates to guests list', async ({ page }) => {
    await page.getByRole('link', { name: 'Гости' }).click()
    await page.waitForURL('/guests')
    await expect(page.locator('h1:has-text("Гости")')).toBeVisible()
  })

  test('list shows table or empty state', async ({ page }) => {
    await page.goto('/guests')
    const table = page.locator('.v-data-table')
    const empty = page.locator('text=Нет гостей')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 10000 })
  })

  test('list table shows guest columns', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForTimeout(2000)
    const table = page.locator('.v-data-table')
    if (await table.isVisible()) {
      // Check that full_name column is rendered (first_name + last_name combined)
      const rows = page.locator('.v-data-table tbody tr')
      await expect(rows.first()).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  test('"Добавить гостя" navigates to form', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForTimeout(1000)
    await page.getByRole('link', { name: 'Добавить гостя' }).first().click()
    await page.waitForURL('/guests/new')
    await expect(page.locator('text=Новый гость')).toBeVisible()
  })

  test('create guest form has required fields', async ({ page }) => {
    await page.goto('/guests/new')
    await expect(page.locator('text=Имя')).toBeVisible()
    await expect(page.locator('text=Фамилия')).toBeVisible()
    await expect(page.locator('text=Email')).toBeVisible()
    await expect(page.locator('text=Телефон')).toBeVisible()
  })

  test('create guest with valid data → redirects to list', async ({ page }) => {
    await page.goto('/guests/new')
    const ts = Date.now()
    await page.getByLabel('Имя').fill('E2E')
    await page.getByLabel('Фамилия').fill(`Guest ${ts}`)
    await page.getByLabel('Email').fill(`e2e-${ts}@test.com`)
    await page.getByLabel('Телефон').fill('+70001112233')

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })
    // Verify new guest appears
    await expect(page.locator(`text=Guest ${ts}`)).toBeVisible()
  })

  test('create guest without required fields shows validation', async ({ page }) => {
    await page.goto('/guests/new')
    // Submit empty form
    await page.getByRole('button', { name: 'Создать' }).click()
    // Should stay on form
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/guests/new')
  })

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------
  test('edit guest → form pre-populated', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/guests\/\d+\/edit/)
    await expect(page.locator('text=Редактировать гостя')).toBeVisible()
    // Name field should be pre-filled
    await expect(page.getByLabel('Имя')).not.toHaveValue('', { timeout: 5000 })
    await expect(page.getByLabel('Фамилия')).not.toHaveValue('', { timeout: 5000 })
  })

  test('edit guest → save redirects to list', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/guests\/\d+\/edit/)
    // Just save without changes
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  test('delete guest → confirmation dialog', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить гостя?')).toBeVisible()
    // Close dialog
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  test('delete guest → confirm removes from list', async ({ page }) => {
    // First create a guest to delete
    await page.goto('/guests/new')
    const ts = Date.now()
    await page.getByLabel('Имя').fill('ToDelete')
    await page.getByLabel('Фамилия').fill(`Victim ${ts}`)
    await page.getByLabel('Email').fill(`delete-${ts}@test.com`)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/guests', { timeout: 10000 })

    // Now delete it
    const row = page.locator('.v-data-table tbody tr').filter({ hasText: `Victim ${ts}` })
    await row.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить гостя?')).toBeVisible()
    await page.getByRole('button', { name: 'Удалить' }).last().click()
    await expect(page.locator('text=Гость удалён')).toBeVisible({ timeout: 5000 })
  })

  // ---------------------------------------------------------------------------
  // Cancel on form returns to list
  // ---------------------------------------------------------------------------
  test('cancel button on form navigates back to list', async ({ page }) => {
    await page.goto('/guests/new')
    await page.getByRole('link', { name: 'Отмена' }).click()
    await page.waitForURL('/guests')
  })
})
