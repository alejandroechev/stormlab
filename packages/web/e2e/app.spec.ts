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

test.describe("HydroCAD Web E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the app layout", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "HydroCAD Web" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Components" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Properties" })).toBeVisible();
    await expect(page.getByText("Nodes: 0")).toBeVisible();
    await expect(page.getByText("Links: 0")).toBeVisible();
  });

  test("can drag a subcatchment node onto the canvas", async ({ page }) => {
    const stencil = page.locator(".stencil-item", { hasText: "Subcatchment" });
    const canvas = page.locator(".diagram-area svg");
    await stencil.dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("can drag multiple node types onto the canvas", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();

    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas, {
      targetPosition: { x: box!.width / 2, y: box!.height / 3 },
    });
    await page.locator(".stencil-item", { hasText: "Pond" }).dragTo(canvas, {
      targetPosition: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.locator(".stencil-item", { hasText: "Junction" }).dragTo(canvas, {
      targetPosition: { x: box!.width / 2, y: (box!.height * 2) / 3 },
    });

    await expect(page.getByText("Nodes: 3")).toBeVisible();
  });

  test("selecting a node shows properties", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);

    // Click the node
    await page.locator(".node-group").click();

    // Property panel should show subcatchment props
    await expect(page.getByRole("heading", { name: "subcatchment" })).toBeVisible();
    await expect(page.locator(".property-panel input").first()).toBeVisible();
    await expect(page.getByText("Sub-Areas")).toBeVisible();
  });

  test("can edit node name inline", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    const nameInput = page.locator(".property-panel input").first();
    await nameInput.fill("Test Basin");
    // Verify the node label updates on canvas
    await expect(page.locator(".node-label", { hasText: "Test Basin" })).toBeVisible();
  });

  test("can delete a node", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    await page.getByRole("button", { name: "Delete Node" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });

  test("can load a project file", async ({ page }) => {
    await loadExampleProject(page);

    // Verify the project loaded
    await expect(page.getByText("Nodes: 3")).toBeVisible();
    await expect(page.getByText("Links: 2")).toBeVisible();

    // Event selector should be visible with multiple events
    const eventSelect = page.locator(".toolbar select");
    await expect(eventSelect).toBeVisible();
    await expect(eventSelect.locator("option")).toHaveCount(4);
  });

  test("can run simulation and see results", async ({ page }) => {
    await loadExampleProject(page);

    // Run simulation
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Click on a node to see results
    await page.locator(".node-group").first().click();

    // Should show result badges
    await expect(page.getByText("Results")).toBeVisible();
    await expect(page.getByText(/Peak Q/)).toBeVisible();
    await expect(page.locator(".result-badge", { hasText: "cfs" }).first()).toBeVisible();
  });

  test("can switch between storm events", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Click on the detention pond node
    await page.locator(".node-group").nth(1).click();

    // Get 2-year peak outflow
    await expect(page.getByText("Results")).toBeVisible();
    const peakText2yr = page.locator(".result-badge .value").first();
    const val2yr = await peakText2yr.textContent();

    // Switch to 100-year
    await page.locator(".toolbar select").selectOption("100yr");

    // Peak should be different (higher)
    const val100yr = await peakText2yr.textContent();
    expect(val2yr).not.toEqual(val100yr);
  });

  test("hydrograph chart renders after simulation", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Click a node
    await page.locator(".node-group").first().click();

    // Hydrograph chart should appear
    await expect(page.getByText("Outflow Hydrograph")).toBeVisible();
    // Recharts renders as SVG role="application"
    await expect(page.locator(".recharts-wrapper")).toBeVisible();
  });

  test("can create a new project", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // Dismiss confirm dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "New" }).click();

    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });

  test("zoom via mouse wheel updates status bar", async ({ page }) => {
    const canvas = page.locator(".diagram-area");

    await canvas.hover();
    await page.mouse.wheel(0, -100); // zoom in

    // Zoom should change from 100%
    const zoomText = page.locator(".status-bar", { hasText: "Zoom:" });
    await expect(zoomText).not.toHaveText(/Zoom: 100%/);
  });
});
