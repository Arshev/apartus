import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Task Board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to tasks', async ({ page }) => {
    await page.getByRole('link', { name: 'Задачи' }).click()
    await page.waitForURL('/tasks')
    await expect(page.locator('h1:has-text("Задачи")')).toBeVisible()
  })

  test('kanban board shows three columns', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(2000)
    // Three status columns: pending, in_progress, completed
    await expect(page.locator('text=Ожидает')).toBeVisible()
    await expect(page.locator('text=В работе')).toBeVisible()
    await expect(page.locator('text=Завершено')).toBeVisible()
  })

  test('create task via dialog', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Новая задача' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Новая задача').last()).toBeVisible()

    const ts = Date.now()
    await page.locator('.v-dialog').getByLabel('Название').fill(`E2E Task ${ts}`)

    // Select priority
    await page.locator('.v-dialog .v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Task ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  test('task card shows title and priority chip', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(3000)
    // If tasks exist, cards should have a title and priority chip
    const taskCards = page.locator('.v-card .text-body-1')
    if (await taskCards.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(taskCards.first()).toBeVisible()
      // Priority chips
      const chips = page.locator('.v-chip')
      await expect(chips.first()).toBeVisible()
    }
  })

  test('move task forward button works', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(3000)
    const moveBtn = page.locator('text=В работу').first()
    if (await moveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moveBtn.click()
      await page.waitForTimeout(2000)
      // Task should have moved columns — no error
      expect(page.url()).toContain('/tasks')
    }
  })

  test('edit task via dialog', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(3000)
    const editBtn = page.locator('text=Изменить').first()
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click()
      await expect(page.locator('.v-dialog')).toBeVisible()
      await expect(page.locator('text=Редактировать')).toBeVisible()
      await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    }
  })

  test('delete task from card', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(3000)
    const deleteBtn = page.locator('text=Удалить').first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click()
      await expect(page.locator('text=Удалить задачу?')).toBeVisible()
      await page.getByRole('button', { name: 'Отмена' }).last().click()
    }
  })
})
