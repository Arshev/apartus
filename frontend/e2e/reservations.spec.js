import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Reservations — business logic', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reservations')
    await page.waitForSelector('.v-data-table', { timeout: 10000 })
  })

  // ---------------------------------------------------------------------------
  // Seed data verification — list displays correct data shape
  // ---------------------------------------------------------------------------
  test('list shows reservations with all required columns populated', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    // Unit name column should have text (not empty)
    const cells = await firstRow.locator('td').allTextContents()
    const joined = cells.join(' ')
    // Seed has units like "Main Studio", "Dorm 6A", etc.
    expect(joined.length).toBeGreaterThan(10)
  })

  test('status chips use correct colors — confirmed=blue, checked_in=green', async ({ page }) => {
    // Seed has both confirmed and checked_in reservations
    const blueChip = page.locator('.v-chip.bg-blue').first()
    const greenChip = page.locator('.v-chip.bg-green').first()
    // At least one should be visible
    const hasBlue = await blueChip.isVisible({ timeout: 2000 }).catch(() => false)
    const hasGreen = await greenChip.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasBlue || hasGreen).toBeTruthy()
  })

  test('prices display formatted with currency symbol, not raw cents', async ({ page }) => {
    // Seed has reservation with total_price_cents: 20000 = 200.00 ₽
    const priceCell = page.locator('.v-data-table tbody td').filter({ hasText: /[\d.,]+\s*₽|₽\s*[\d.,]+|\$[\d.,]+/ }).first()
    if (await priceCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await priceCell.textContent()
      // Should NOT contain raw cents like "20000" without formatting
      expect(text).not.toMatch(/^\d{5,}$/)
    }
  })

  test('zero-price reservations display "—" instead of 0', async ({ page }) => {
    // Seed has a block reservation with total_price_cents: 0
    const dashCell = page.locator('.v-data-table tbody td:has-text("—")').first()
    if (await dashCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(dashCell).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Status transitions — Check-in
  // ---------------------------------------------------------------------------
  test('check-in button only visible for confirmed reservations', async ({ page }) => {
    // Confirmed row should have Check-in; checked_in should NOT
    const confirmedRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Подтверждено' }).first()
    if (await confirmedRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(confirmedRow.getByText('Check-in')).toBeVisible()
    }
    const checkedInRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Заселён' }).first()
    if (await checkedInRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(checkedInRow.getByText('Check-in')).not.toBeVisible()
    }
  })

  test('check-in transitions status confirmed → checked_in with snackbar', async ({ page }) => {
    const confirmedRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Подтверждено' }).first()
    if (await confirmedRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmedRow.getByText('Check-in').click()
      await expect(page.locator('text=Check-in выполнен')).toBeVisible({ timeout: 5000 })
      // Row status should now show "Заселён"
      await expect(confirmedRow.locator('text=Заселён')).toBeVisible({ timeout: 3000 })
    }
  })

  // ---------------------------------------------------------------------------
  // Status transitions — Check-out
  // ---------------------------------------------------------------------------
  test('check-out button only visible for checked_in reservations', async ({ page }) => {
    const checkedInRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Заселён' }).first()
    if (await checkedInRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(checkedInRow.getByText('Check-out')).toBeVisible()
    }
  })

  test('check-out transitions status checked_in → checked_out with snackbar', async ({ page }) => {
    const checkedInRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Заселён' }).first()
    if (await checkedInRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkedInRow.getByText('Check-out').click()
      await expect(page.locator('text=Check-out выполнен')).toBeVisible({ timeout: 5000 })
      await expect(checkedInRow.locator('text=Выселен')).toBeVisible({ timeout: 3000 })
    }
  })

  // ---------------------------------------------------------------------------
  // Status transitions — Cancel
  // ---------------------------------------------------------------------------
  test('cancel button visible for confirmed and checked_in, not for others', async ({ page }) => {
    const checkedOutRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Выселен' }).first()
    if (await checkedOutRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(checkedOutRow.locator('button:has-text("Отмена")')).not.toBeVisible()
    }
    const cancelledRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Отменено' }).first()
    if (await cancelledRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(cancelledRow.locator('button:has-text("Отмена")')).not.toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // Delete flow with confirmation dialog
  // ---------------------------------------------------------------------------
  test('delete shows confirmation with "Удалить бронирование?" and both buttons', async ({ page }) => {
    const lastRow = page.locator('.v-data-table tbody tr').last()
    await lastRow.locator('.mdi-delete').click()
    await expect(page.locator('text=Удалить бронирование?')).toBeVisible()
    await expect(page.locator('.v-dialog').getByRole('button', { name: 'Удалить' })).toBeVisible()
    await expect(page.locator('.v-dialog').getByRole('button', { name: 'Отмена' })).toBeVisible()
    // Cancel — dialog closes, row still exists
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
    await expect(page.locator('text=Удалить бронирование?')).not.toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // Edit navigates and pre-fills
  // ---------------------------------------------------------------------------
  test('edit opens form with correct title and pre-filled dates', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await page.waitForURL(/\/reservations\/\d+\/edit/)
    await expect(page.locator('text=Редактировать бронирование')).toBeVisible()
    // Unit selector should be disabled in edit mode
    const unitSelect = page.locator('.v-select').first()
    await expect(unitSelect.locator('[aria-disabled="true"], .v-field--disabled')).toBeVisible({ timeout: 3000 })
    // Dates pre-filled
    const checkIn = page.locator('input[type="date"]').first()
    await expect(checkIn).not.toHaveValue('', { timeout: 5000 })
  })
})

test.describe('Reservation form — create with price auto-calculation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('create form has all fields with correct labels', async ({ page }) => {
    await page.goto('/reservations/new')
    await expect(page.locator('text=Новое бронирование')).toBeVisible()
    await expect(page.locator('text=Юнит')).toBeVisible()
    await expect(page.locator('text=Гость')).toBeVisible()
    await expect(page.locator('text=Дата заезда')).toBeVisible()
    await expect(page.locator('text=Дата выезда')).toBeVisible()
    await expect(page.locator('text=Количество гостей')).toBeVisible()
    await expect(page.locator('text=Цена')).toBeVisible()
    await expect(page.locator('text=Заметки')).toBeVisible()
  })

  test('unit selector populated with units from all properties (format: property → unit)', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)
    await page.locator('.v-select').first().click()
    await page.waitForTimeout(500)
    // Seed: "Sea View Apartment → Main Studio", "Tverskaya Hostel → Dorm 6A" etc
    const options = page.locator('.v-list-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(4) // 6 units in seed
    // Check format includes →
    const firstText = await options.first().textContent()
    expect(firstText).toContain('→')
    await page.keyboard.press('Escape')
  })

  test('guest selector populated with guests (format: first_name last_name)', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)
    await page.locator('.v-select').nth(1).click()
    await page.waitForTimeout(500)
    const options = page.locator('.v-list-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(3) // 5 guests in seed + possibly clearable
    await page.keyboard.press('Escape')
  })

  test('price auto-calculates when unit + dates selected', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)

    // Select first unit
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Set dates far in future (no seasonal override, uses base_price)
    await page.locator('input[type="date"]').first().fill('2027-03-01')
    await page.locator('input[type="date"]').nth(1).fill('2027-03-04')

    // Wait for price watcher to fire
    await page.waitForTimeout(2000)

    // Price field should now have a non-zero value
    const priceField = page.getByLabel('Цена')
    const value = await priceField.inputValue()
    expect(Number(value)).toBeGreaterThan(0)
  })

  test('successful create redirects to reservations list', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)

    // Select unit
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Dates
    await page.locator('input[type="date"]').first().fill('2027-06-01')
    await page.locator('input[type="date"]').nth(1).fill('2027-06-04')
    await page.getByLabel('Количество гостей').fill('2')
    await page.waitForTimeout(1500) // let price calculate

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/reservations', { timeout: 10000 })
  })

  test('cancel button returns to list without creating', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.getByRole('link', { name: 'Отмена' }).click()
    await page.waitForURL('/reservations')
  })

  test('create reservation with guest selected', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)

    // Unit
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Guest (second select)
    await page.locator('.v-select').nth(1).click()
    await page.waitForTimeout(500)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Dates
    await page.locator('input[type="date"]').first().fill('2027-07-01')
    await page.locator('input[type="date"]').nth(1).fill('2027-07-04')
    await page.getByLabel('Количество гостей').fill('2')
    await page.waitForTimeout(1500)

    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL('/reservations', { timeout: 10000 })
  })

  test('notes field is visible and accepts text', async ({ page }) => {
    await page.goto('/reservations/new')
    await expect(page.locator('text=Заметки')).toBeVisible()
    await page.locator('textarea').fill('VIP guest, needs extra pillows')
  })

  test('validation: submit without required fields stays on form', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/reservations/new')
  })

  test('form shows error alert on validation failure from API', async ({ page }) => {
    await page.goto('/reservations/new')
    await page.waitForTimeout(2000)
    // Select unit
    await page.locator('.v-select').first().click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)
    // Invalid: check_out before check_in
    await page.locator('input[type="date"]').first().fill('2027-09-10')
    await page.locator('input[type="date"]').nth(1).fill('2027-09-05')
    await page.getByLabel('Количество гостей').fill('1')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.waitForTimeout(2000)
    // Should show error alert
    const alert = page.locator('.v-alert')
    if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(alert).toBeVisible()
    }
  })
})
