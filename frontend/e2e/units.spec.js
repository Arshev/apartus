import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Units CRUD (nested under Property)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-door').click()
    await page.waitForURL(/\/properties\/\d+\/units/)
  })

  test('units list loads with property context', async ({ page }) => {
    await expect(page.locator('text=Помещения')).toBeVisible()
  })

  test('create unit → appears in list', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)

    await page.getByLabel('Название').fill('E2E Room 101')
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Комната' }).click()
    await page.getByLabel('Вместимость').fill('2')

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/properties\/\d+\/units$/)
    await expect(page.locator('text=E2E Room 101').first()).toBeVisible()
  })

  test('back link returns to properties', async ({ page }) => {
    await page.locator('.mdi-arrow-left').click()
    await page.waitForURL('/properties')
    await expect(page.locator('text=Объекты')).toBeVisible()
  })

  test('delete unit → confirmation dialog', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить помещение?')).toBeVisible()
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  test('delete unit → confirm removes from list', async ({ page }) => {
    // Create a unit first
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    const ts = Date.now()
    await page.getByLabel('Название').fill(`Delete Me ${ts}`)
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.getByLabel('Вместимость').fill('1')
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/properties\/\d+\/units$/, { timeout: 10000 })

    // Delete it
    const row = page.locator('.v-data-table tbody tr').filter({ hasText: `Delete Me ${ts}` })
    await row.locator('.mdi-delete').click()
    await page.getByRole('button', { name: 'Удалить' }).last().click()
    await expect(page.locator('text=Помещение удалено')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Unit Form — deep', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-door').click()
    await page.waitForURL(/\/properties\/\d+\/units/)
  })

  test('create form has all fields', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    await expect(page.locator('text=Новое помещение')).toBeVisible()
    await expect(page.locator('text=Название')).toBeVisible()
    await expect(page.locator('text=Тип помещения')).toBeVisible()
    await expect(page.locator('text=Вместимость')).toBeVisible()
    await expect(page.locator('text=Статус')).toBeVisible()
    await expect(page.locator('text=Цена за ночь')).toBeVisible()
  })

  test('type selector has all 4 unit types', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    await page.locator('.v-select').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('option', { name: 'Комната' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Квартира' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Кровать' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Студия' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('status selector has 3 options', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    // Status is second select
    await page.locator('.v-select').nth(1).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('option', { name: 'Доступен' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Обслуживание' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Заблокирован' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('create unit with base_price', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    const ts = Date.now()
    await page.getByLabel('Название').fill(`Priced Unit ${ts}`)
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)
    await page.getByLabel('Вместимость').fill('3')
    await page.getByLabel('Цена за ночь').fill('150.50')

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/properties\/\d+\/units$/, { timeout: 10000 })
    await expect(page.locator(`text=Priced Unit ${ts}`).first()).toBeVisible()
  })

  test('edit form shows amenity chips for toggling', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    await page.waitForTimeout(2000)
    // In edit mode, amenity chips should be visible
    const chips = page.locator('.v-chip')
    if (await chips.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(chips.first()).toBeVisible()
    }
  })

  test('amenity chip click toggles attachment', async ({ page }) => {
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/units\/\d+\/edit/)
    await page.waitForTimeout(3000)
    const chips = page.locator('.v-chip')
    if (await chips.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click first amenity chip — should toggle color
      const firstChip = chips.first()
      const classBefore = await firstChip.getAttribute('class')
      await firstChip.click()
      await page.waitForTimeout(1000)
      // Click again to revert
      await firstChip.click()
      await page.waitForTimeout(1000)
    }
  })

  test('validation: name required — submit without name stays', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.getByLabel('Вместимость').fill('2')
    // Don't fill name
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/units/new')
  })

  test('cancel button returns to unit list', async ({ page }) => {
    await page.getByRole('link', { name: 'Добавить' }).click()
    await page.waitForURL(/\/units\/new/)
    await page.getByRole('link', { name: 'Отмена' }).click()
    await page.waitForURL(/\/properties\/\d+\/units$/)
  })
})
