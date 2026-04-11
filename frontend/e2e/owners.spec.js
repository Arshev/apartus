import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Owners', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // Navigation & list
  // ---------------------------------------------------------------------------
  test('sidebar link navigates to owners list', async ({ page }) => {
    await page.getByRole('link', { name: 'Собственники' }).click()
    await page.waitForURL('/owners')
    await expect(page.locator('h1:has-text("Собственники")')).toBeVisible()
  })

  test('list shows table or empty state', async ({ page }) => {
    await page.goto('/owners')
    const table = page.locator('.v-data-table')
    const empty = page.locator('text=Нет собственников')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Create via dialog
  // ---------------------------------------------------------------------------
  test('create owner via dialog', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новый собственник')).toBeVisible()

    const ts = Date.now()
    await page.locator('.v-dialog').getByLabel('Имя').fill(`E2E Owner ${ts}`)
    await page.locator('.v-dialog').getByLabel('Email').fill(`owner-${ts}@test.com`)
    await page.locator('.v-dialog').getByLabel('Комиссия (%)').fill('15')

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Owner ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Edit via dialog
  // ---------------------------------------------------------------------------
  test('edit owner via dialog', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать')).toBeVisible()
    // Name should be pre-filled
    const nameField = page.locator('.v-dialog').getByLabel('Имя')
    await expect(nameField).not.toHaveValue('', { timeout: 5000 })
    // Close without saving
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  test('delete owner → confirmation dialog', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить собственника?')).toBeVisible()
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  // ---------------------------------------------------------------------------
  // Statement
  // ---------------------------------------------------------------------------
  test('statement link opens owner report', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await expect(page.locator('text=Отчёт собственника')).toBeVisible()
  })

  test('statement shows financial summary cards', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Выручка')).toBeVisible()
    await expect(page.locator('text=Комиссия')).toBeVisible()
    await expect(page.locator('text=Расходы')).toBeVisible()
    await expect(page.locator('text=К выплате')).toBeVisible()
  })

  test('statement has PDF download button', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await expect(page.getByText('PDF')).toBeVisible()
  })

  test('statement back button returns to owners list', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.locator('.mdi-arrow-left').click()
    await page.waitForURL('/owners')
  })

  // ---------------------------------------------------------------------------
  // Commission display
  // ---------------------------------------------------------------------------
  test('commission rate displayed as percentage', async ({ page }) => {
    await page.goto('/owners')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    // Commission column should contain % sign
    const cells = page.locator('.v-data-table tbody td')
    const textsArr = await cells.allTextContents()
    const hasPercent = textsArr.some((t) => t.includes('%'))
    expect(hasPercent).toBeTruthy()
  })
})
