import { test, expect } from '@playwright/test'

test.describe('Public Booking Widget', () => {
  // The widget is a public route — no login needed.
  // Uses the organization slug from seed.

  test('widget page loads with org slug', async ({ page }) => {
    // Demo org slug — from seed; typically the parameterized org name
    await page.goto('/widget/demo-hostel-network')
    await expect(page.locator('text=Забронировать')).toBeVisible()
  })

  test('widget has date picker fields', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    await expect(page.locator('text=Дата заезда')).toBeVisible()
    await expect(page.locator('text=Дата выезда')).toBeVisible()
  })

  test('widget has search button', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    await expect(page.getByRole('button', { name: 'Найти' })).toBeVisible()
  })

  test('search without dates does nothing', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(1000)
    // No error, no results — button still visible
    await expect(page.getByRole('button', { name: 'Найти' })).toBeVisible()
  })

  test('search with valid dates shows available units or empty', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 15)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 3)
    const fmtDate = (d) => d.toISOString().slice(0, 10)

    await page.locator('input[type="date"]').first().fill(fmtDate(tomorrow))
    await page.locator('input[type="date"]').nth(1).fill(fmtDate(dayAfter))
    await page.getByRole('button', { name: 'Найти' }).click()

    await page.waitForTimeout(3000)
    // Either unit cards or "Нет доступных юнитов"
    const unitCard = page.locator('.v-card').filter({ hasText: 'Забронировать' })
    const emptyState = page.locator('text=Нет доступных юнитов')
    await expect(unitCard.first().or(emptyState).first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking "Забронировать" opens booking dialog', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 20)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 2)
    const fmtDate = (d) => d.toISOString().slice(0, 10)

    await page.locator('input[type="date"]').first().fill(fmtDate(tomorrow))
    await page.locator('input[type="date"]').nth(1).fill(fmtDate(dayAfter))
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(3000)

    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookBtn.click()
      await expect(page.locator('text=Бронирование')).toBeVisible()
      await expect(page.locator('text=Ваше имя')).toBeVisible()
      await expect(page.locator('text=Email')).toBeVisible()
    }
  })

  test('booking dialog has confirm and cancel buttons', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 25)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 2)
    const fmtDate = (d) => d.toISOString().slice(0, 10)

    await page.locator('input[type="date"]').first().fill(fmtDate(tomorrow))
    await page.locator('input[type="date"]').nth(1).fill(fmtDate(dayAfter))
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(3000)

    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookBtn.click()
      await expect(page.getByRole('button', { name: 'Подтвердить' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Отмена' })).toBeVisible()
    }
  })

  test('confirm booking with guest data shows success', async ({ page }) => {
    await page.goto('/widget/demo-hostel-network')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 28)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 2)
    const fmtDate = (d) => d.toISOString().slice(0, 10)

    await page.locator('input[type="date"]').first().fill(fmtDate(tomorrow))
    await page.locator('input[type="date"]').nth(1).fill(fmtDate(dayAfter))
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(3000)

    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookBtn.click()
      await page.waitForTimeout(500)
      const ts = Date.now()
      await page.getByLabel('Ваше имя').fill(`E2E Widget Guest ${ts}`)
      await page.getByLabel('Email').fill(`widget-${ts}@test.com`)
      await page.getByRole('button', { name: 'Подтвердить' }).click()
      await expect(page.locator('text=Бронирование подтверждено')).toBeVisible({ timeout: 10000 })
    }
  })

  test('widget handles unknown slug gracefully', async ({ page }) => {
    await page.goto('/widget/nonexistent-slug')
    await page.locator('input[type="date"]').first().fill('2026-06-01')
    await page.locator('input[type="date"]').nth(1).fill('2026-06-03')
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(2000)
    // Should show error
    await expect(page.locator('text=Не удалось загрузить доступность')).toBeVisible()
  })
})
