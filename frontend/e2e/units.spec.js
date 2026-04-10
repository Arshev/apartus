import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Units CRUD (nested under Property)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    // Navigate to units of first property via door icon
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
    // Select unit type
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
})
