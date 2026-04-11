import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Full navigation — all sidebar sections', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar contains all 13 nav items', async ({ page }) => {
    const sidebar = page.locator('.v-navigation-drawer')
    const expectedItems = [
      'Главная', 'Бронирования', 'Календарь', 'Гости',
      'Объекты', 'Собственники', 'Каналы', 'Задачи',
      'Расходы', 'Отчёты', 'Удобства', 'Филиалы', 'Настройки',
    ]
    for (const item of expectedItems) {
      await expect(sidebar.locator(`text=${item}`).first()).toBeVisible()
    }
  })

  test('navigate to every section via sidebar without errors', async ({ page }) => {
    const sections = [
      { name: 'Бронирования', url: '/reservations', title: 'Бронирования' },
      { name: 'Календарь', url: '/calendar', title: 'Календарь' },
      { name: 'Гости', url: '/guests', title: 'Гости' },
      { name: 'Объекты', url: '/properties', title: 'Объекты' },
      { name: 'Собственники', url: '/owners', title: 'Собственники' },
      { name: 'Каналы', url: '/channels', title: 'Каналы продаж' },
      { name: 'Задачи', url: '/tasks', title: 'Задачи' },
      { name: 'Расходы', url: '/expenses', title: 'Расходы' },
      { name: 'Отчёты', url: '/reports', title: 'Финансовый отчёт' },
      { name: 'Удобства', url: '/amenities', title: 'Удобства' },
      { name: 'Филиалы', url: '/branches', title: 'Филиалы' },
      { name: 'Настройки', url: '/settings', title: 'Настройки организации' },
    ]

    for (const section of sections) {
      await page.getByRole('link', { name: section.name }).click()
      await page.waitForURL(section.url, { timeout: 5000 })
      await expect(page.locator(`text=${section.title}`).first()).toBeVisible({ timeout: 5000 })
    }

    // Return to dashboard
    await page.getByRole('link', { name: 'Главная' }).click()
    await page.waitForURL('/')
    await expect(page.locator('text=Здравствуйте')).toBeVisible()
  })

  test('each section loads without console errors', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    const urls = [
      '/reservations', '/calendar', '/guests', '/properties',
      '/owners', '/channels', '/tasks', '/expenses',
      '/reports', '/amenities', '/branches', '/settings',
    ]

    for (const url of urls) {
      await page.goto(url)
      await page.waitForTimeout(1000)
    }

    // Filter out known benign errors (e.g. ResizeObserver, third-party)
    const criticalErrors = errors.filter((e) =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(criticalErrors).toEqual([])
  })
})
