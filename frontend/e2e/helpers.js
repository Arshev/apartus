// Shared helpers for E2E tests.
// Demo user from backend seed: demo@apartus.local / Password1!

export const DEMO_USER = {
  email: 'demo@apartus.local',
  password: 'Password1!',
  fullName: 'Demo User', // whatever the seed sets
}

/**
 * Login as demo user and wait for dashboard.
 * Reusable across all E2E suites.
 */
export async function login(page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(DEMO_USER.email)
  // Vuetify password field has appended icon sharing the label — target the input directly
  await page.locator('input[type="password"]').fill(DEMO_USER.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  // Wait for redirect to dashboard (shell visible)
  await page.waitForURL('/')
  await page.waitForSelector('text=Здравствуйте')
}
