import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLE_PROJECT = path.resolve(
  __dirname,
  "../../../docs/example-project.json",
);

async function loadExampleProject(page: import("@playwright/test").Page) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(EXAMPLE_PROJECT);
}

test.describe("User Feedback Fixes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows toast when running simulation with empty project", async ({ page }) => {
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    const toast = page.locator("[data-testid='toast']");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Add nodes");
  });

  test("shows toast when running simulation without subcatchments", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Junction" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    const toast = page.locator("[data-testid='toast']");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Subcatchment");
  });

  test("theme persists across reload", async ({ page }) => {
    // Toggle to dark
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Reload and verify persistence
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Toggle back to light and verify
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("auto-selects outfall node after simulation", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Should auto-select a node and show results in property panel
    await expect(page.getByText("Results")).toBeVisible();
    await expect(page.locator(".result-badge").first()).toBeVisible();

    // Success toast should appear
    const toast = page.locator("[data-testid='toast']");
    await expect(toast.first()).toContainText("Simulation complete");
  });
});
