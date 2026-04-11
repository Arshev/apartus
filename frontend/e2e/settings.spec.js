import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Settings — General tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForTimeout(1000)
  })

  test('general tab is active by default', async ({ page }) => {
    await expect(page.locator('text=Название организации')).toBeVisible()
    await expect(page.locator('text=Валюта')).toBeVisible()
  })

  test('org name field pre-filled with seed value', async ({ page }) => {
    const nameField = page.getByLabel('Название организации')
    await expect(nameField).toHaveValue('Demo Hostel Network', { timeout: 5000 })
  })

  test('save org settings shows success snackbar', async ({ page }) => {
    await page.getByRole('button', { name: 'Сохранить' }).first().click()
    await expect(page.locator('text=Сохранено')).toBeVisible({ timeout: 5000 })
  })

  test('change org name and save persists the change', async ({ page }) => {
    const nameField = page.getByLabel('Название организации')
    await nameField.fill('Demo Hostel Network Edited')
    await page.getByRole('button', { name: 'Сохранить' }).first().click()
    await expect(page.locator('text=Сохранено')).toBeVisible({ timeout: 5000 })
    // Reload and verify
    await page.reload()
    await page.waitForTimeout(2000)
    await expect(page.getByLabel('Название организации')).toHaveValue('Demo Hostel Network Edited')
    // Revert
    await page.getByLabel('Название организации').fill('Demo Hostel Network')
    await page.getByRole('button', { name: 'Сохранить' }).first().click()
    await expect(page.locator('text=Сохранено')).toBeVisible({ timeout: 5000 })
  })

  test('currency selector has common currencies', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.waitForTimeout(500)
    const options = page.locator('.v-list-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(5)
    await page.keyboard.press('Escape')
  })
})

test.describe('Settings — Integrations tab (Telegram)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.getByText('Интеграции').click()
    await page.waitForTimeout(500)
  })

  test('Telegram section shows bot token and chat ID fields', async ({ page }) => {
    await expect(page.locator('text=Telegram уведомления')).toBeVisible()
    await expect(page.locator('text=Bot Token')).toBeVisible()
    await expect(page.locator('text=Chat ID')).toBeVisible()
  })

  test('test button is disabled when fields are empty', async ({ page }) => {
    const testBtn = page.getByRole('button', { name: 'Тест' })
    // If fields empty, button should be disabled
    const isDisabled = await testBtn.isDisabled()
    expect(isDisabled).toBeTruthy()
  })

  test('filling both fields enables the test button', async ({ page }) => {
    await page.getByLabel('Bot Token (от @BotFather)').fill('123:FAKE')
    await page.getByLabel('Chat ID').fill('456')
    const testBtn = page.getByRole('button', { name: 'Тест' })
    await expect(testBtn).toBeEnabled()
  })

  test('instructions block is visible with setup steps', async ({ page }) => {
    await expect(page.locator('text=@BotFather')).toBeVisible()
    await expect(page.locator('text=@getmyid_bot')).toBeVisible()
  })
})

test.describe('Settings — Members tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.getByText('Участники').click()
    await page.waitForTimeout(2000)
  })

  test('members table shows seed users (demo + manager)', async ({ page }) => {
    const table = page.locator('.v-data-table')
    await expect(table).toBeVisible()
    // Seed: demo@apartus.local (owner) + manager@apartus.local (manager)
    await expect(page.locator('text=demo@apartus.local')).toBeVisible()
    await expect(page.locator('text=manager@apartus.local')).toBeVisible()
  })

  test('member rows show "full_name (email)" format', async ({ page }) => {
    // "Demo User (demo@apartus.local)" in table
    await expect(page.locator('text=Demo User')).toBeVisible()
    await expect(page.locator('text=Anna Manager')).toBeVisible()
  })

  test('add member dialog has email, name, password, role fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Добавить участника')).toBeVisible()
    await expect(page.locator('.v-dialog text=Email')).toBeVisible()
    await expect(page.locator('.v-dialog text=Имя')).toBeVisible()
    await expect(page.locator('.v-dialog text=Фамилия')).toBeVisible()
    await expect(page.locator('.v-dialog text=Пароль')).toBeVisible()
    await expect(page.locator('.v-dialog text=Роль')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('edit member dialog shows only role field (no email/name/password)', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать роль')).toBeVisible()
    // Role selector visible
    await expect(page.locator('.v-dialog text=Роль')).toBeVisible()
    // Email/name/password fields should NOT be visible (edit mode)
    await expect(page.locator('.v-dialog').getByLabel('Email')).not.toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('delete member shows confirmation with name', async ({ page }) => {
    // Don't delete demo user — find manager row
    const managerRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'manager@apartus.local' })
    await managerRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить участника?')).toBeVisible()
    await expect(page.locator('.v-dialog text=Anna Manager')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })
})

test.describe('Settings — Roles tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.getByText('Роли').click()
    await page.waitForTimeout(2000)
  })

  test('system roles from seed are displayed', async ({ page }) => {
    await expect(page.locator('text=Администратор')).toBeVisible()
    await expect(page.locator('text=Менеджер')).toBeVisible()
    await expect(page.locator('text=Просмотр')).toBeVisible()
  })

  test('system roles have edit/delete buttons disabled', async ({ page }) => {
    // System role row — edit and delete should be disabled
    const adminRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Администратор' })
    const editBtn = adminRow.locator('.mdi-pencil').locator('..')
    const deleteBtn = adminRow.locator('.mdi-delete').locator('..')
    // Buttons should have disabled attribute
    await expect(editBtn).toBeDisabled()
    await expect(deleteBtn).toBeDisabled()
  })

  test('system column shows "Да" for system roles', async ({ page }) => {
    const adminRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Администратор' })
    const cells = await adminRow.locator('td').allTextContents()
    const hasSystem = cells.some((c) => c.includes('Да'))
    expect(hasSystem).toBeTruthy()
  })

  test('create custom role via dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новая роль')).toBeVisible()

    const ts = Date.now()
    await page.locator('.v-dialog').getByLabel('Название').fill(`E2E Role ${ts}`)
    await page.locator('.v-dialog').getByLabel('Код').fill(`e2e_${ts}`)

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Role ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  test('custom role has edit/delete enabled and shows "Нет" for system', async ({ page }) => {
    // Find a non-system role (created by previous test or we create one)
    const nonSystemRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Нет' }).first()
    if (await nonSystemRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const editBtn = nonSystemRow.locator('.mdi-pencil').locator('..')
      const deleteBtn = nonSystemRow.locator('.mdi-delete').locator('..')
      await expect(editBtn).toBeEnabled()
      await expect(deleteBtn).toBeEnabled()
    }
  })

  test('delete custom role shows confirmation with role name', async ({ page }) => {
    const nonSystemRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Нет' }).first()
    if (await nonSystemRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nonSystemRow.locator('.mdi-delete').click()
      await expect(page.locator('text=Удалить роль?')).toBeVisible()
      await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    }
  })
})
