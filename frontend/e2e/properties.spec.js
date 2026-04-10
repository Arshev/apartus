import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Properties CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('list page loads from sidebar navigation', async ({ page }) => {
    await page.getByRole('link', { name: 'Properties' }).click()
    await page.waitForURL('/properties')
    await expect(page.locator('text=Объекты')).toBeVisible()
  })

  test('create property → appears in list', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('text=Объекты')
    await page.getByRole('link', { name: 'Добавить объект' }).click()
    await page.waitForURL('/properties/new')

    await page.getByLabel('Название').fill('E2E Test Property')
    await page.getByLabel('Адрес').fill('123 Test St')
    // Select property type
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Квартира' }).click()

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/properties')
    // Snackbar may disappear quickly — assert on table content instead
    await expect(page.locator('text=E2E Test Property')).toBeVisible()
  })

  test('edit property → navigates to edit form', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    // Click pencil icon on first row
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/properties\/\d+\/edit/)
    await expect(page.locator('text=Редактировать объект')).toBeVisible()
    // Form is pre-populated with existing name (loaded async)
    await expect(page.getByLabel('Название')).not.toHaveValue('', { timeout: 5000 })
  })

  test('delete property → confirmation and removal', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    // Click delete on last row
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить объект?')).toBeVisible()
    await page.getByRole('button', { name: 'Удалить' }).last().click()
    await expect(page.locator('text=Объект удалён')).toBeVisible()
  })
})
