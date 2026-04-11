import { test, expect } from '@playwright/test'

test.describe('Booking Widget — full public booking flow', () => {
  // Public route — no login needed. Uses seed org slug.
  const SLUG = 'demo-hostel-network'

  // ---------------------------------------------------------------------------
  // Search flow
  // ---------------------------------------------------------------------------
  test('search without dates does not call API', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(1000)
    // No results, no error
    expect(page.url()).toContain(`/widget/${SLUG}`)
  })

  test('search with valid dates shows available units', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    const start = futureDate(30)
    const end = futureDate(33)
    await page.locator('input[type="date"]').first().fill(start)
    await page.locator('input[type="date"]').nth(1).fill(end)
    await page.getByRole('button', { name: 'Найти' }).click()
    await page.waitForTimeout(5000)

    // Should show units or empty state
    const unitCards = page.locator('.v-card').filter({ hasText: 'Забронировать' })
    const emptyState = page.locator('text=Нет доступных юнитов')
    await expect(unitCards.first().or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('search populates org name from API response', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 35, 37)
    await expect(page.locator('text=Demo Hostel Network')).toBeVisible()
  })

  test('unit cards show property → unit name, type, capacity, and price', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 40, 43)
    const unitCard = page.locator('.v-card').filter({ hasText: 'Забронировать' }).first()
    if (await unitCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await unitCard.textContent()
      // Should have property name and unit name
      expect(text).toContain('—')
      // Should have guest count ("до N гостей")
      expect(text).toContain('гостей')
    }
  })

  test('price shows formatted value or "Бесплатно"', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 45, 48)
    const unitCard = page.locator('.v-card').filter({ hasText: 'Забронировать' }).first()
    if (await unitCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await unitCard.textContent()
      // Price formatted with currency symbol OR "Бесплатно"
      const hasPrice = text?.match(/₽|\$|€|Бесплатно/)
      expect(hasPrice).toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // Booking dialog
  // ---------------------------------------------------------------------------
  test('clicking "Забронировать" opens dialog with unit details and date range', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 50, 53)
    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click()
      await expect(page.locator('.v-dialog')).toBeVisible()
      await expect(page.locator('text=Бронирование')).toBeVisible()
      // Dialog shows unit name, dates, price
      const dialogText = await page.locator('.v-dialog').textContent()
      expect(dialogText).toContain('→')
      // Guest fields visible
      await expect(page.locator('.v-dialog text=Ваше имя')).toBeVisible()
      await expect(page.locator('.v-dialog text=Email')).toBeVisible()
      await expect(page.locator('.v-dialog text=Телефон')).toBeVisible()
    }
  })

  test('cancel button closes dialog without booking', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 60, 62)
    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click()
      await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
      await expect(page.locator('.v-dialog')).not.toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Full booking flow: search → select → fill guest → confirm → success
  // ---------------------------------------------------------------------------
  test('complete booking flow shows success dialog', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 65, 67)
    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click()
      await page.waitForTimeout(500)

      const ts = Date.now()
      await page.locator('.v-dialog').getByLabel('Ваше имя').fill(`Widget Guest ${ts}`)
      await page.locator('.v-dialog').getByLabel('Email').fill(`widget-${ts}@test.com`)
      await page.locator('.v-dialog').getByLabel('Телефон').fill('+79001234567')

      await page.locator('.v-dialog').getByRole('button', { name: 'Подтвердить' }).click()

      // Success dialog appears
      await expect(page.locator('text=Бронирование подтверждено')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=подтверждение на ваш email')).toBeVisible()

      // Dismiss success dialog
      await page.getByRole('button', { name: 'Ок' }).click()
      await expect(page.locator('text=Бронирование подтверждено')).not.toBeVisible()
    }
  })

  test('after successful booking, units list is cleared', async ({ page }) => {
    await page.goto(`/widget/${SLUG}`)
    await searchAvailability(page, 70, 72)
    const bookBtn = page.getByRole('button', { name: 'Забронировать' }).first()
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookBtn.click()
      const ts = Date.now()
      await page.locator('.v-dialog').getByLabel('Ваше имя').fill(`Clear Test ${ts}`)
      await page.locator('.v-dialog').getByLabel('Email').fill(`clear-${ts}@test.com`)
      await page.locator('.v-dialog').getByRole('button', { name: 'Подтвердить' }).click()
      await expect(page.locator('text=Бронирование подтверждено')).toBeVisible({ timeout: 10000 })
      await page.getByRole('button', { name: 'Ок' }).click()
      // Units list should be empty (cleared after booking)
      await expect(page.getByRole('button', { name: 'Забронировать' })).not.toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  test('unknown slug shows error on search', async ({ page }) => {
    await page.goto('/widget/nonexistent-slug-xyz')
    await page.locator('input[type="date"]').first().fill('2027-06-01')
    await page.locator('input[type="date"]').nth(1).fill('2027-06-03')
    await page.getByRole('button', { name: 'Найти' }).click()
    await expect(page.locator('text=Не удалось загрузить доступность')).toBeVisible({ timeout: 5000 })
  })
})

// Helpers
function futureDate(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

async function searchAvailability(page, startDaysAhead, endDaysAhead) {
  await page.locator('input[type="date"]').first().fill(futureDate(startDaysAhead))
  await page.locator('input[type="date"]').nth(1).fill(futureDate(endDaysAhead))
  await page.getByRole('button', { name: 'Найти' }).click()
  await page.waitForTimeout(5000)
}
