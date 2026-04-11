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
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Квартира' }).click()

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/properties')
    await expect(page.locator('text=E2E Test Property')).toBeVisible()
  })

  test('edit property → navigates to edit form', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/properties\/\d+\/edit/)
    await expect(page.locator('text=Редактировать объект')).toBeVisible()
    await expect(page.getByLabel('Название')).not.toHaveValue('', { timeout: 5000 })
  })

  test('delete property → confirmation and removal', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить объект?')).toBeVisible()
    await page.getByRole('button', { name: 'Удалить' }).last().click()
    await expect(page.locator('text=Объект удалён')).toBeVisible()
  })
})

test.describe('Property Form — deep', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('create form has all required fields and labels', async ({ page }) => {
    await page.goto('/properties/new')
    await expect(page.locator('text=Новый объект')).toBeVisible()
    await expect(page.locator('text=Название')).toBeVisible()
    await expect(page.locator('text=Адрес')).toBeVisible()
    await expect(page.locator('text=Тип объекта')).toBeVisible()
    await expect(page.locator('text=Описание')).toBeVisible()
    await expect(page.locator('text=Филиал')).toBeVisible()
  })

  test('type selector has all 4 property types', async ({ page }) => {
    await page.goto('/properties/new')
    await page.waitForTimeout(1000)
    // Click type selector
    const selects = page.locator('.v-select')
    await selects.first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('option', { name: 'Квартира' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Отель' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Дом' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Хостел' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('branch selector populated with seed branches', async ({ page }) => {
    await page.goto('/properties/new')
    await page.waitForTimeout(2000)
    // Branch is the second select (or labeled "Филиал")
    const branchSelect = page.locator('.v-select').last()
    await branchSelect.click()
    await page.waitForTimeout(500)
    const options = page.locator('.v-list-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(2) // seed: HQ, Moscow, Tverskaya, Arbat
    await page.keyboard.press('Escape')
  })

  test('create with branch_id links property to branch', async ({ page }) => {
    await page.goto('/properties/new')
    await page.waitForTimeout(2000)
    const ts = Date.now()
    await page.getByLabel('Название').fill(`Branched Prop ${ts}`)
    await page.getByLabel('Адрес').fill('Branch St 1')
    // Type
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Отель' }).click()
    await page.waitForTimeout(300)
    // Branch — select first available
    await page.locator('.v-select').last().click()
    await page.waitForTimeout(500)
    await page.locator('.v-list-item').first().click()

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/properties', { timeout: 10000 })
    await expect(page.locator(`text=Branched Prop ${ts}`)).toBeVisible()
  })

  test('description is optional — create without it', async ({ page }) => {
    await page.goto('/properties/new')
    await page.waitForTimeout(1000)
    const ts = Date.now()
    await page.getByLabel('Название').fill(`NoDesc ${ts}`)
    await page.getByLabel('Адрес').fill('No Desc St')
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Дом' }).click()
    // Skip description
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/properties', { timeout: 10000 })
  })

  test('validation: submit without name stays on form', async ({ page }) => {
    await page.goto('/properties/new')
    await page.waitForTimeout(1000)
    await page.getByLabel('Адрес').fill('Some Address')
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Квартира' }).click()
    // Don't fill name
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/properties/new')
  })

  test('cancel button returns to list', async ({ page }) => {
    await page.goto('/properties/new')
    await page.getByRole('link', { name: 'Отмена' }).click()
    await page.waitForURL('/properties')
  })

  test('edit form shows "Редактировать объект" and "Сохранить" button', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/properties\/\d+\/edit/)
    await expect(page.locator('text=Редактировать объект')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сохранить' })).toBeVisible()
  })

  test('edit save → redirect to list with updated name', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    await page.locator('.v-data-table tbody tr').first().locator('.mdi-pencil').click()
    await page.waitForURL(/\/properties\/\d+\/edit/)
    await page.waitForTimeout(2000)
    const nameField = page.getByLabel('Название')
    const origName = await nameField.inputValue()
    await nameField.fill(origName + ' Edited')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForURL('/properties', { timeout: 10000 })
    await expect(page.locator(`text=${origName} Edited`)).toBeVisible()
    // Revert
    await page.locator('.v-data-table tbody tr').filter({ hasText: `${origName} Edited` }).locator('.mdi-pencil').click()
    await page.waitForURL(/\/properties\/\d+\/edit/)
    await page.waitForTimeout(1000)
    await page.getByLabel('Название').fill(origName)
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForURL('/properties', { timeout: 10000 })
  })

  test('delete dialog cancel keeps property in list', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    const count = await page.locator('.v-data-table tbody tr').count()
    await page.locator('.v-data-table tbody tr').last().locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить объект?')).toBeVisible()
    await page.getByRole('button', { name: 'Отмена' }).last().click()
    await expect(page.locator('text=Удалить объект?')).not.toBeVisible()
    // Count unchanged
    const countAfter = await page.locator('.v-data-table tbody tr').count()
    expect(countAfter).toBe(count)
  })

  test('delete confirmation shows property name', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForSelector('.v-data-table')
    const firstRow = page.locator('.v-data-table tbody tr').first()
    const name = await firstRow.locator('td').first().textContent()
    await firstRow.locator('.mdi-delete').click()
    const dialogText = await page.locator('.v-dialog').textContent()
    expect(dialogText).toContain(name?.trim())
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })
})
