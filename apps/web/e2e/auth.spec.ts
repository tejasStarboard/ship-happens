import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("unauthenticated auth pages", () => {
  test("sign-in page renders required fields", async ({ page }) => {
    await page.goto("/sign-in")
    await waitForAppReady(page)

    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible()
    await expect(page.locator("#sign-in-form").getByLabel("Email address")).toBeVisible()
    await expect(
      page.locator("#sign-in-form").getByLabel("Password", { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Continue", exact: true })
    ).toBeVisible()
  })

  test("sign-up page renders required fields", async ({ page }) => {
    await page.goto("/sign-up")
    await waitForAppReady(page)

    await expect(page.getByText("Create your account")).toBeVisible()
    const form = page.locator("#sign-up-form")
    await expect(form.getByLabel("Name")).toBeVisible()
    await expect(form.getByLabel("Email address")).toBeVisible()
    await expect(form.getByLabel("Password", { exact: true })).toBeVisible()
    await expect(form.getByLabel("Confirm password")).toBeVisible()
  })

  test("sign-in shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/sign-in")
    await waitForAppReady(page)
    await page.getByRole("button", { name: "Continue", exact: true }).click()

    await expect(page.getByText("Enter a valid email")).toBeVisible()
    await expect(page.getByText("Password is required")).toBeVisible()
  })

  test("sign-up shows validation for invalid email", async ({ page }) => {
    await page.goto("/sign-up")
    await waitForAppReady(page)
    const form = page.locator("#sign-up-form")

    await form.getByLabel("Name").fill("Test User")
    await form.getByLabel("Email address").fill("not-an-email")
    await form.getByLabel("Password", { exact: true }).fill("password123")
    await form.getByLabel("Confirm password").fill("password123")

    // Native type="email" validation blocks submit before Zod runs
    await expect(form.getByLabel("Email address")).toHaveJSProperty(
      "validity.valid",
      false
    )
  })

  test("cross-links between sign-in and sign-up", async ({ page }) => {
    await page.goto("/sign-in")
    await waitForAppReady(page)
    // Auth footer uses Button+Link composition → exposed as button
    await page.getByRole("button", { name: "Sign up" }).click()
    await page.waitForURL(/\/sign-up/)
    await expect(page.getByText("Create your account")).toBeVisible()

    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/sign-in/)
    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible()
  })

  test("protected /rfp redirects to sign-in", async ({ page }) => {
    await page.goto("/rfp")
    await page.waitForURL(/\/sign-in/)
    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible()
  })
})
