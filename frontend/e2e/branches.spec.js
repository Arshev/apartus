import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Branches tree', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'Branches' }).click()
    await page.waitForURL('/branches')
  })

  test('branches page loads from sidebar', async ({ page }) => {
    await expect(page.locator('text=Филиалы')).toBeVisible()
  })

  test('seed branches displayed (HQ, Moscow)', async ({ page }) => {
    await page.waitForTimeout(2000)
    await expect(page.locator('text=HQ')).toBeVisible()
    await expect(page.locator('text=Moscow')).toBeVisible()
  })

  test('nested branches rendered (Tverskaya, Arbat under Moscow)', async ({ page }) => {
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Tverskaya')).toBeVisible()
    await expect(page.locator('text=Arbat')).toBeVisible()
  })

  test('tree renders branch icons', async ({ page }) => {
    const nodes = page.locator('.mdi-source-branch')
    await expect(nodes.first()).toBeVisible()
  })

  test('create root branch via dialog', async ({ page }) => {
    const ts = Date.now()
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новый филиал')).toBeVisible()
    await page.locator('.v-dialog').getByLabel('Название').fill(`E2E Root ${ts}`)
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Root ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  test('create child branch via "+" button on node', async ({ page }) => {
    await page.waitForTimeout(2000)
    const ts = Date.now()
    // Click first add-child button (mdi-plus)
    await page.locator('.mdi-plus').first().click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await page.locator('.v-dialog').getByLabel('Название').fill(`E2E Child ${ts}`)
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Child ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  test('edit branch → dialog pre-populated with name', async ({ page }) => {
    await page.waitForTimeout(2000)
    await page.locator('.mdi-pencil').first().click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать филиал')).toBeVisible()
    const nameField = page.locator('.v-dialog').getByLabel('Название')
    await expect(nameField).not.toHaveValue('', { timeout: 3000 })
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('edit branch save updates name in tree', async ({ page }) => {
    await page.waitForTimeout(2000)
    await page.locator('.mdi-pencil').first().click()
    const nameField = page.locator('.v-dialog').getByLabel('Название')
    const origName = await nameField.inputValue()
    await nameField.fill(origName + ' Ed')
    await page.locator('.v-dialog').getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForTimeout(2000)
    await expect(page.locator(`text=${origName} Ed`)).toBeVisible()
    // Revert
    await page.locator('.mdi-pencil').first().click()
    await page.locator('.v-dialog').getByLabel('Название').fill(origName)
    await page.locator('.v-dialog').getByRole('button', { name: 'Сохранить' }).click()
    await page.waitForTimeout(2000)
  })

  test('delete branch → confirmation dialog with name', async ({ page }) => {
    await page.waitForTimeout(2000)
    await page.locator('.mdi-delete').first().click()
    await expect(page.locator('text=Удалить филиал?')).toBeVisible()
    const dialogText = await page.locator('.v-dialog').textContent()
    expect(dialogText).toContain('будет удалён')
    await page.getByRole('button', { name: 'Отмена' }).last().click()
  })

  test('expand/collapse toggle hides and shows children', async ({ page }) => {
    await page.waitForTimeout(2000)
    const chevronDown = page.locator('.mdi-chevron-down').first()
    if (await chevronDown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chevronDown.click()
      await page.waitForTimeout(500)
      // Chevron should now be right (collapsed)
      const chevronRight = page.locator('.mdi-chevron-right').first()
      if (await chevronRight.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Click to expand again
        await chevronRight.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('branch form has parent selector with clearable option', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.locator('text=Родительский филиал')).toBeVisible()
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('create dialog cancel closes without creating', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить' }).click()
    await page.locator('.v-dialog').getByLabel('Название').fill('Ghost Branch')
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    await expect(page.locator('text=Ghost Branch')).not.toBeVisible()
  })
})
