import { test, expect } from "@playwright/test"

// E2E smoke tests — assume `pnpm dev` (or production server) is running at
// E2E_BASE_URL. Skeleton only; not executed in CI without a live server.

test.describe("AED SaaS smoke", () => {
  test("landing page shows the login button", async ({ page }) => {
    await page.goto("/")
    const loginLink = page.getByRole("link", { name: /로그인/ })
    await expect(loginLink).toBeVisible()
  })

  test("login page shows the email input form", async ({ page }) => {
    await page.goto("/login")
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test("/api/health returns 200 with status ok", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("ok")
  })

  test("/dashboard without auth redirects to /login", async ({ page }) => {
    const response = await page.goto("/dashboard")
    // Either an HTTP redirect or a client-side redirect lands the user on /login.
    await expect(page).toHaveURL(/\/login/)
    // Status of the final response should still be a successful page render.
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })
})
