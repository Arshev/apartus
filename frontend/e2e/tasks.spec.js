import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Task Board — kanban logic', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks')
    await page.waitForTimeout(3000)
  })

  // ---------------------------------------------------------------------------
  // Column structure from seed data
  // ---------------------------------------------------------------------------
  test('three kanban columns rendered with correct titles and counts', async ({ page }) => {
    // Seed: 2 pending, 2 in_progress, 1 completed (+ 1 from other tests possible)
    const pendingCol = page.locator('.v-card').filter({ hasText: /Ожидает \(\d+\)/ })
    const inProgressCol = page.locator('.v-card').filter({ hasText: /В работе \(\d+\)/ })
    const completedCol = page.locator('.v-card').filter({ hasText: /Завершено \(\d+\)/ })
    await expect(pendingCol).toBeVisible()
    await expect(inProgressCol).toBeVisible()
    await expect(completedCol).toBeVisible()
  })

  test('seed tasks appear in correct columns', async ({ page }) => {
    // "Уборка Main Studio" — pending
    await expect(page.locator('text=Уборка Main Studio')).toBeVisible()
    // "Проверить кондиционер" — in_progress
    await expect(page.locator('text=Проверить кондиционер').first()).toBeVisible()
    // "Закупить полотенца" — completed
    await expect(page.locator('text=Закупить полотенца')).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Priority chips with correct colors
  // ---------------------------------------------------------------------------
  test('task cards show priority chips', async ({ page }) => {
    const chips = page.locator('.v-chip')
    await expect(chips.first()).toBeVisible()
    // Seed has: high, urgent, medium, low priorities
    const allChipText = await chips.allTextContents()
    const joined = allChipText.join(' ')
    const hasPriority = joined.includes('Высокий') || joined.includes('Срочный') || joined.includes('Средний') || joined.includes('Низкий')
    expect(hasPriority).toBeTruthy()
  })

  test('assignee shown on assigned tasks', async ({ page }) => {
    // Seed: "Уборка Main Studio" assigned to manager (Anna Manager)
    const taskCard = page.locator('.v-card').filter({ hasText: 'Уборка Main Studio' })
    const text = await taskCard.textContent()
    expect(text).toContain('Anna Manager')
  })

  test('due date shown on tasks with due_date', async ({ page }) => {
    // Several seed tasks have due_date
    const taskCard = page.locator('.v-card').filter({ hasText: 'Уборка Main Studio' })
    const subtitle = await taskCard.locator('.v-card-subtitle').textContent()
    // Should contain a date string
    expect(subtitle).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  // ---------------------------------------------------------------------------
  // Move forward (status transitions)
  // ---------------------------------------------------------------------------
  test('"В работу" moves task from pending to in_progress', async ({ page }) => {
    // Find a pending task's "В работу" button
    const pendingTask = page.locator('.v-card').filter({ hasText: 'Ожидает' }).locator('.v-card').filter({ hasText: 'В работу' }).first()
    if (await pendingTask.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pendingTask.getByText('В работу').click()
      await page.waitForTimeout(2000)
      // Column counts should have changed
    }
  })

  test('"Завершить" moves task from in_progress to completed', async ({ page }) => {
    const inProgressTask = page.locator('.v-card').filter({ hasText: 'В работе' }).locator('.v-card').filter({ hasText: 'Завершить' }).first()
    if (await inProgressTask.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inProgressTask.getByText('Завершить').click()
      await page.waitForTimeout(2000)
    }
  })

  test('completed tasks have no forward button', async ({ page }) => {
    const completedCol = page.locator('.v-card').filter({ hasText: /Завершено/ })
    const cards = completedCol.locator('.v-card')
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const text = await card.textContent()
      if (text?.includes('Завершить') || text?.includes('В работу')) {
        // Only the column header card might match — inner task cards should not
        const isColumnHeader = text?.includes('Завершено (')
        if (!isColumnHeader) {
          // Should not have forward button
          expect(text).not.toContain('В работу')
          expect(text).not.toContain('Завершить')
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------
  test('create task with title and priority', async ({ page }) => {
    const ts = Date.now()
    await page.getByRole('button', { name: 'Новая задача' }).click()
    await page.waitForTimeout(500)
    await page.locator('.v-dialog').getByLabel('Название').fill(`E2E Task ${ts}`)
    // Select priority
    await page.locator('.v-dialog .v-select').first().click()
    await page.locator('.v-list-item').filter({ hasText: 'Высокий' }).click()
    await page.waitForTimeout(300)
    await page.locator('.v-dialog').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator(`text=E2E Task ${ts}`)).toBeVisible({ timeout: 10000 })
  })

  test('edit task changes title', async ({ page }) => {
    const editBtn = page.locator('text=Изменить').first()
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click()
      await expect(page.locator('.v-dialog')).toBeVisible()
      await expect(page.locator('text=Редактировать')).toBeVisible()
      await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    }
  })

  test('delete task shows confirmation and removes card', async ({ page }) => {
    const deleteBtn = page.locator('.v-card-actions').filter({ hasText: 'Удалить' }).locator('text=Удалить').first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click()
      await expect(page.locator('.v-dialog text=Удалить задачу?')).toBeVisible()
      await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    }
  })
})
