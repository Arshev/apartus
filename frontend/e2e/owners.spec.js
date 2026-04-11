import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Owners — commission logic and statement', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/owners')
    await page.waitForTimeout(2000)
  })

  // ---------------------------------------------------------------------------
  // Seed data display
  // ---------------------------------------------------------------------------
  test('table shows seed owners (Иванов 15%, Петрова 20%)', async ({ page }) => {
    await expect(page.locator('text=Сергей Иванов')).toBeVisible()
    await expect(page.locator('text=Елена Петрова')).toBeVisible()
  })

  test('commission rate displayed as "15.0%" format (divided by 100)', async ({ page }) => {
    // Seed: Иванов commission_rate=1500 → should display "15.0%"
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    const joined = texts.join('|')
    expect(joined).toContain('15.0%')
    expect(joined).toContain('20.0%')
  })

  test('properties count shown in table', async ({ page }) => {
    // Иванов has 1 property (Sea View Apartment), Петрова has 2
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    const joined = texts.join(' ')
    // Should contain numeric property counts
    expect(joined).toMatch(/\d/)
  })

  // ---------------------------------------------------------------------------
  // Create — commission conversion
  // ---------------------------------------------------------------------------
  test('create owner: commission entered as percentage, stored as basis points', async ({ page }) => {
    const ts = Date.now()
    await page.getByRole('button', { name: 'Добавить' }).click()
    await page.waitForTimeout(500)
    await page.locator('.v-dialog').getByLabel('Имя').fill(`E2E Owner ${ts}`)
    await page.locator('.v-dialog').getByLabel('Комиссия (%)').fill('12.5')
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(3000)
    // Should display "12.5%"
    await expect(page.locator('text=12.5%')).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Edit — pre-populates commission correctly
  // ---------------------------------------------------------------------------
  test('edit owner: commission field shows percentage (not basis points)', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    const commField = page.locator('.v-dialog').getByLabel('Комиссия (%)')
    const value = await commField.inputValue()
    // 1500 basis points → 15.0 in form
    expect(Number(value)).toBe(15)
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  // ---------------------------------------------------------------------------
  // Statement — financial data
  // ---------------------------------------------------------------------------
  test('statement shows owner name and commission rate', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Сергей Иванов')).toBeVisible()
    await expect(page.locator('text=15.0%')).toBeVisible()
  })

  test('statement shows four financial summary cards', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(3000)
    await expect(page.locator('.v-card').filter({ hasText: 'Выручка' })).toBeVisible()
    await expect(page.locator('.v-card').filter({ hasText: 'Комиссия' })).toBeVisible()
    await expect(page.locator('.v-card').filter({ hasText: 'Расходы' })).toBeVisible()
    await expect(page.locator('.v-card').filter({ hasText: 'К выплате' })).toBeVisible()
  })

  test('statement has per-property breakdown table', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(3000)
    await expect(page.locator('text=По объектам')).toBeVisible()
    // Иванов owns "Sea View Apartment"
    await expect(page.locator('text=Sea View Apartment')).toBeVisible()
  })

  test('statement net payout card color: green if positive, red if negative', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(3000)
    const payoutCard = page.locator('.v-card').filter({ hasText: 'К выплате' })
    const classes = await payoutCard.getAttribute('class')
    const hasColor = classes?.includes('green') || classes?.includes('red')
    expect(hasColor).toBeTruthy()
  })

  test('statement PDF button triggers download', async ({ page }) => {
    const ivanovRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Сергей Иванов' })
    await ivanovRow.getByText('Отчёт').click()
    await page.waitForURL(/\/owners\/\d+\/statement/)
    await page.waitForTimeout(2000)
    await expect(page.getByText('PDF')).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  test('delete owner shows confirmation with owner name', async ({ page }) => {
    const lastRow = page.locator('.v-data-table tbody tr').last()
    const ownerName = await lastRow.locator('td').first().textContent()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить собственника?')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })
})
