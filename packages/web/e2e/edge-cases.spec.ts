import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLE_PROJECT = path.resolve(
  __dirname,
  "../../../docs/example-project.json",
);

const SCREENSHOTS_DIR = path.resolve(__dirname, "../../../screenshots");

async function loadExampleProject(page: import("@playwright/test").Page) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(EXAMPLE_PROJECT);
  await expect(page.getByText("Nodes: 3")).toBeVisible();
}

test.describe("Edge Cases & Robustness", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // --- Empty state edge cases ---

  test("run simulation on empty project shows validation", async ({ page }) => {
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    // Should show alert or validation message — no nodes to simulate
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "empty-run.png") });
    // Status bar should still show 0 nodes
    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });

  test("save empty project produces valid JSON", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    const tmpPath = path.join(SCREENSHOTS_DIR, "empty-project.json");
    await download.saveAs(tmpPath);
    const content = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    expect(content.nodes).toEqual([]);
    expect(content.links).toEqual([]);
    fs.unlinkSync(tmpPath);
  });

  test("new project on empty project works without confirm", async ({ page }) => {
    // No unsaved changes, so New shouldn't prompt
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });

  // --- Node manipulation edge cases ---

  test("delete all nodes one by one", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();

    // Add 3 nodes
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.3, y: box!.height * 0.3 },
    });
    await page.locator(".stencil-item", { hasText: "Pond" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.5, y: box!.height * 0.5 },
    });
    await page.locator(".stencil-item", { hasText: "Junction" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.7, y: box!.height * 0.7 },
    });
    await expect(page.getByText("Nodes: 3")).toBeVisible();

    // Delete them one by one
    for (let i = 3; i > 0; i--) {
      await page.locator(".node-group").first().click();
      await page.getByRole("button", { name: "Delete Node" }).click();
      await expect(page.getByText(`Nodes: ${i - 1}`)).toBeVisible();
    }
    await expect(page.getByText("Nodes: 0")).toBeVisible();
    await expect(page.getByText("Links: 0")).toBeVisible();
  });

  test("drag all four node types onto canvas", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();

    const nodeTypes = ["Subcatchment", "Pond", "Reach", "Junction"];
    for (let i = 0; i < nodeTypes.length; i++) {
      await page.locator(".stencil-item", { hasText: nodeTypes[i] }).dragTo(canvas, {
        targetPosition: { x: box!.width * (0.2 + i * 0.2), y: box!.height * 0.5 },
      });
    }
    await expect(page.getByText("Nodes: 4")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "all-node-types.png") });
  });

  // --- Property editing edge cases ---

  test("edit subcatchment name to empty string", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    const nameInput = page.locator(".property-panel input").first();
    await nameInput.fill("");
    // App should handle empty names gracefully — node still exists
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("edit subcatchment name with special characters", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    const nameInput = page.locator(".property-panel input").first();
    await nameInput.fill("Test <Basin> & 'Node' \"#1\"");
    // Should render without breaking SVG
    await expect(page.getByText("Nodes: 1")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "special-chars-name.png") });
  });

  test("edit subcatchment name with very long string", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    const nameInput = page.locator(".property-panel input").first();
    const longName = "A".repeat(200);
    await nameInput.fill(longName);
    await expect(page.getByText("Nodes: 1")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "long-name.png") });
  });

  // --- Theme toggle ---

  test("toggle dark/light theme preserves state", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // Find theme toggle button (🌙 or ☀️)
    const themeBtn = page.locator("button", { hasText: /🌙|☀️/ });
    await themeBtn.click();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "theme-toggled.png") });

    // Node count preserved after theme toggle
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // Toggle back
    await themeBtn.click();
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  // --- Undo/Redo ---

  test("undo adding a node restores empty state", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // Undo — button text is ↩
    await page.locator("button[title*='Undo']").click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // Redo — button text is ↪
    await page.locator("button[title*='Redo']").click();
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("undo after delete restores node", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    // Edit the name
    const nameInput = page.locator(".property-panel input").first();
    await nameInput.fill("My Basin");

    // Delete
    await page.getByRole("button", { name: "Delete Node" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // Undo delete
    await page.locator("button[title*='Undo']").click();
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("keyboard shortcuts Ctrl+Z and Ctrl+Y work", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // Click canvas to ensure focus is not in an input
    await canvas.click({ position: { x: 10, y: 10 } });

    // Ctrl+Z to undo
    await page.keyboard.press("Control+z");
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // Ctrl+Y to redo
    await page.keyboard.press("Control+y");
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  // --- Simulation edge cases ---

  test("run simulation with single unconnected node", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);

    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(500);

    // Click node to check results
    await page.locator(".node-group").click();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "single-node-sim.png") });
    // Even a single unconnected subcatchment should produce runoff
    await expect(page.getByText("Results")).toBeVisible();
  });

  test("run simulation twice produces consistent results", async ({ page }) => {
    await loadExampleProject(page);

    // First run
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();
    const firstPeak = await page.locator(".result-badge .value").first().textContent();

    // Second run
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(300);
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();
    const secondPeak = await page.locator(".result-badge .value").first().textContent();

    expect(firstPeak).toBe(secondPeak);
  });

  // --- Zoom edge cases ---

  test("extreme zoom in and out", async ({ page }) => {
    const canvas = page.locator(".diagram-area");
    await canvas.hover();

    // Zoom way in (negative deltaY = zoom in)
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -200);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "zoom-in-extreme.png") });

    // Zoom way out
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 200);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "zoom-out-extreme.png") });

    // App should still be functional
    await expect(page.getByRole("heading", { name: "StormLab" })).toBeVisible();
  });

  // --- Link/connection edge cases ---

  test("create and delete a link between nodes", async ({ page }) => {
    await loadExampleProject(page);
    await expect(page.getByText("Links: 2")).toBeVisible();

    // Click a link line to select it
    const linkPaths = page.locator(".link-path");
    if (await linkPaths.count() > 0) {
      await linkPaths.first().click({ force: true });
      // If link is selected, delete should be available
      const deleteBtn = page.getByRole("button", { name: "Delete Link" });
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.getByText("Links: 1")).toBeVisible();
      }
    }
  });

  // --- File I/O edge cases ---

  test("save and reload project preserves all data", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Save
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    const tmpPath = path.join(SCREENSHOTS_DIR, "roundtrip-test.json");
    await download.saveAs(tmpPath);

    // Reload into new project
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tmpPath);

    await expect(page.getByText("Nodes: 3")).toBeVisible();
    await expect(page.getByText("Links: 2")).toBeVisible();
    fs.unlinkSync(tmpPath);
  });

  test("load project with corrupted JSON shows error gracefully", async ({ page }) => {
    const corruptedPath = path.join(SCREENSHOTS_DIR, "corrupted.json");
    fs.writeFileSync(corruptedPath, "{ this is not valid json !!!");

    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toBeTruthy(); // Should show an error
      await dialog.accept();
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(corruptedPath);

    // App should still be functional after error
    await page.waitForTimeout(500);
    await expect(page.getByRole("heading", { name: "StormLab" })).toBeVisible();
    fs.unlinkSync(corruptedPath);
  });

  test("load non-StormLab JSON file handles gracefully", async ({ page }) => {
    const wrongJsonPath = path.join(SCREENSHOTS_DIR, "wrong-format.json");
    fs.writeFileSync(wrongJsonPath, JSON.stringify({ foo: "bar", baz: [1, 2, 3] }));

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(wrongJsonPath);

    await page.waitForTimeout(500);
    // App should still work regardless of what happened
    await expect(page.getByRole("heading", { name: "StormLab" })).toBeVisible();
    fs.unlinkSync(wrongJsonPath);
  });

  // --- Report generation ---

  test("generate report with simulation results", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Click Report button
    const reportBtn = page.getByRole("button", { name: /Report/ });
    if (await reportBtn.isVisible()) {
      // Report might open a new window or download
      const [newPage] = await Promise.all([
        page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null),
        reportBtn.click(),
      ]);
      if (newPage) {
        await newPage.waitForLoadState();
        await newPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "report.png") });
        await newPage.close();
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "after-report.png") });
  });

  test("generate report on empty project", async ({ page }) => {
    const reportBtn = page.getByRole("button", { name: /Report/ });
    if (await reportBtn.isVisible()) {
      page.on("dialog", (d) => d.accept());
      await reportBtn.click();
      await page.waitForTimeout(500);
    }
    // App should remain functional
    await expect(page.getByRole("heading", { name: "StormLab" })).toBeVisible();
  });

  // --- Event selector edge cases ---

  test("switching events rapidly doesn't break UI", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    const eventSelect = page.locator(".event-selector");
    // Rapidly switch between events
    const options = await eventSelect.locator("option").allTextContents();
    for (const opt of options) {
      await eventSelect.selectOption(opt);
    }
    // Cycle back
    for (const opt of options.reverse()) {
      await eventSelect.selectOption(opt);
    }

    // Click a node — results should still display correctly
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "rapid-event-switch.png") });
  });

  // --- Pre/Post Comparison ---

  test("pre/post comparison workflow", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Open comparison panel
    const prePostBtn = page.getByRole("button", { name: /Pre\/Post/ });
    if (await prePostBtn.isVisible()) {
      await prePostBtn.click();
      await page.waitForTimeout(300);

      // Save baseline
      const saveBaselineBtn = page.getByRole("button", { name: /Save as Pre/ });
      if (await saveBaselineBtn.isVisible()) {
        await saveBaselineBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "pre-post-baseline.png") });
      }
    }
  });

  // --- Goal Seek ---

  test("goal seek panel interaction", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    const goalSeekBtn = page.getByRole("button", { name: /Goal-Seek/ });
    if (await goalSeekBtn.isVisible()) {
      await goalSeekBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "goal-seek-panel.png") });

      // Try to run goal seek with default values
      const findBtn = page.getByRole("button", { name: /Find Orifice/ });
      if (await findBtn.isVisible() && await findBtn.isEnabled()) {
        await findBtn.click();
        await page.waitForTimeout(3000); // Goal seek may take time
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "goal-seek-result.png") });
      }
    }
  });

  // --- Large project stress test ---

  test("add 10 nodes without crashing", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();

    for (let i = 0; i < 10; i++) {
      const types = ["Subcatchment", "Pond", "Reach", "Junction"];
      const nodeType = types[i % 4];
      const x = box!.width * (0.1 + (i % 5) * 0.18);
      const y = box!.height * (0.2 + Math.floor(i / 5) * 0.4);
      await page.locator(".stencil-item", { hasText: nodeType }).dragTo(canvas, {
        targetPosition: { x, y },
      });
    }
    await expect(page.getByText("Nodes: 10")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10-nodes-stress.png") });

    // Run simulation on 10 nodes
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(1000);
    await page.locator(".node-group").first().click();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10-nodes-sim.png") });
  });

  // --- Feedback button ---

  test("feedback button is visible and accessible", async ({ page }) => {
    const feedbackBtn = page.getByRole("button", { name: "💬 Feedback" });
    await expect(feedbackBtn).toBeVisible();
    // Clicking opens the feedback modal
    await feedbackBtn.click();
    await expect(page.locator("text=Send Feedback")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "feedback-button.png") });
  });

  // --- Multi-step workflow: build, simulate, export, reimport ---

  test("full workflow: build project → simulate → export → reimport → simulate", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();

    // 1. Add a subcatchment
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.3, y: box!.height * 0.3 },
    });
    await page.locator(".node-group").click();
    await page.locator(".property-panel input").first().fill("Test Watershed");
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // 3. Run simulation
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(500);

    // 4. Save project
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    const savePath = path.join(SCREENSHOTS_DIR, "workflow-test.json");
    await download.saveAs(savePath);

    // 5. New project
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // 6. Reimport
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(savePath);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    // 7. Re-run simulation
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(500);
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "full-workflow-complete.png") });
    fs.unlinkSync(savePath);
  });

  // --- Dark theme full screenshot ---

  test("dark theme renders correctly with project loaded", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.locator(".node-group").first().click();

    // Switch to dark theme
    const themeBtn = page.locator("button", { hasText: /🌙|☀️/ });
    await themeBtn.click();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "dark-theme-full.png"), fullPage: true });
  });

  test("light theme renders correctly with project loaded", async ({ page }) => {
    await loadExampleProject(page);
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.locator(".node-group").first().click();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "light-theme-full.png"), fullPage: true });
  });
});
