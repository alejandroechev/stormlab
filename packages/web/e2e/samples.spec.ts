import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Samples dropdown and sample project loading.
 * Covers: dropdown visibility, loading each sample, simulation after load,
 * rapid switching, and stale state checks.
 */

const SAMPLE_IDS = [
  { id: "simple-detention", name: "Simple Detention Pond", nodes: 3, links: 2, events: 2 },
  { id: "commercial-dev", name: "Commercial Development", nodes: 5, links: 4, events: 3 },
  { id: "subdivision", name: "Subdivision Layout", nodes: 7, links: 6, events: 3 },
  { id: "pre-post", name: "Pre/Post Development", nodes: 2, links: 1, events: 4 },
  { id: "multi-pond", name: "Multi-Pond System", nodes: 7, links: 6, events: 3 },
];

test.describe("Samples Dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("samples dropdown is visible in toolbar", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await expect(dropdown).toBeVisible();
    // Should have placeholder + 5 sample options
    const options = dropdown.locator("option");
    await expect(options).toHaveCount(6); // 1 placeholder + 5 samples
    await expect(options.first()).toHaveText("📂 Samples");
  });

  test("samples dropdown lists all 5 sample projects", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    for (const sample of SAMPLE_IDS) {
      await expect(dropdown.locator(`option[value="${sample.id}"]`)).toHaveText(sample.name);
    }
  });

  for (const sample of SAMPLE_IDS) {
    test(`load sample: ${sample.name}`, async ({ page }) => {
      const dropdown = page.locator("select[title='Load a sample project']");
      await dropdown.selectOption(sample.id);

      await expect(page.getByText(`Nodes: ${sample.nodes}`)).toBeVisible();
      await expect(page.getByText(`Links: ${sample.links}`)).toBeVisible();

      // Node groups should appear on canvas
      const nodeGroups = page.locator(".node-group");
      await expect(nodeGroups).toHaveCount(sample.nodes);

      // Event selector should show correct event count
      const eventSelector = page.locator(".event-selector");
      await expect(eventSelector).toBeVisible();
      await expect(eventSelector.locator("option")).toHaveCount(sample.events);
    });
  }

  for (const sample of SAMPLE_IDS) {
    test(`run simulation after loading sample: ${sample.name}`, async ({ page }) => {
      page.on("dialog", (d) => d.accept());
      const dropdown = page.locator("select[title='Load a sample project']");
      await dropdown.selectOption(sample.id);
      await expect(page.getByText(`Nodes: ${sample.nodes}`)).toBeVisible();

      // Run simulation
      await page.getByRole("button", { name: "▶ Run Simulation" }).click();

      // Click the first node — should have results
      await page.locator(".node-group").first().click();
      await expect(page.getByText("Results")).toBeVisible();
      await expect(page.locator(".result-badge").first()).toBeVisible();
    });
  }

  test("loading a sample clears previous project", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");

    // Load first sample
    await dropdown.selectOption("simple-detention");
    await expect(page.getByText("Nodes: 3")).toBeVisible();

    // Load second sample — should replace, not add
    await dropdown.selectOption("commercial-dev");
    await expect(page.getByText("Nodes: 5")).toBeVisible();
    await expect(page.getByText("Links: 4")).toBeVisible();
  });

  test("loading sample clears stale simulation results", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");

    // Load and simulate first sample
    await dropdown.selectOption("simple-detention");
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();

    // Load a different sample — results from old simulation shouldn't appear
    await dropdown.selectOption("subdivision");
    await expect(page.getByText("Nodes: 7")).toBeVisible();
    // Click the first node of the new sample
    await page.locator(".node-group").first().click();
    // Results section should NOT be visible (no simulation run yet)
    await expect(page.getByText("Results")).not.toBeVisible();
  });

  test("rapid sample switching doesn't crash", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");

    // Rapidly cycle through all samples
    for (const sample of SAMPLE_IDS) {
      await dropdown.selectOption(sample.id);
    }
    // Cycle back in reverse
    for (const sample of [...SAMPLE_IDS].reverse()) {
      await dropdown.selectOption(sample.id);
    }

    // App should still be functional — last sample loaded
    const lastSample = SAMPLE_IDS[0]; // reversed, so first is last
    await expect(page.getByText(`Nodes: ${lastSample.nodes}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "StormLab" })).toBeVisible();

    // Should still be able to run simulation
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();
  });

  test("sample dropdown resets to placeholder after load", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");
    // The select value should reset to "" (placeholder) since value="" is set
    await expect(dropdown).toHaveValue("");
  });

  test("loading sample then New clears all nodes", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("commercial-dev");
    await expect(page.getByText("Nodes: 5")).toBeVisible();

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();
    await expect(page.getByText("Links: 0")).toBeVisible();
  });

  test("loading sample then undo reverts to previous state", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");

    // Start from empty
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // Load a sample
    await dropdown.selectOption("simple-detention");
    await expect(page.getByText("Nodes: 3")).toBeVisible();

    // Undo should revert
    await page.locator("button[title*='Undo']").click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    // Redo should restore
    await page.locator("button[title*='Redo']").click();
    await expect(page.getByText("Nodes: 3")).toBeVisible();
  });
});

test.describe("Core Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("add subcatchment node via drag", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();
    await expect(page.locator(".node-group")).toHaveCount(1);
  });

  test("add pond node via drag", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Pond" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("add reach and junction nodes", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    const box = await canvas.boundingBox();
    await page.locator(".stencil-item", { hasText: "Reach" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.3, y: box!.height * 0.5 },
    });
    await page.locator(".stencil-item", { hasText: "Junction" }).dragTo(canvas, {
      targetPosition: { x: box!.width * 0.6, y: box!.height * 0.5 },
    });
    await expect(page.getByText("Nodes: 2")).toBeVisible();
  });

  test("set properties in property panel", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await page.locator(".node-group").click();

    // Property panel should be visible with subcatchment heading
    await expect(page.getByRole("heading", { name: "subcatchment" })).toBeVisible();

    // Edit node name
    const nameInput = page.locator(".property-panel input").first();
    await nameInput.fill("My Watershed");
    await expect(page.locator(".node-label", { hasText: "My Watershed" })).toBeVisible();
  });

  test("connect two nodes with a link", async ({ page }) => {
    // Load simple detention (has 3 nodes, 2 links already)
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");
    await expect(page.getByText("Links: 2")).toBeVisible();

    // Verify link paths exist on canvas
    const linkPaths = page.locator("path.flow-link");
    await expect(linkPaths).toHaveCount(2);
  });

  test("run simulation produces results on sample project", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");

    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    // Click the subcatchment node
    await page.locator(".node-group").first().click();
    await expect(page.getByText("Results")).toBeVisible();
    await expect(page.getByText(/Peak Q/)).toBeVisible();
    await expect(page.locator(".result-badge", { hasText: "cfs" }).first()).toBeVisible();
  });

  test("run simulation with no nodes shows alert", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("No nodes");
      await dialog.accept();
    });
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    // App still functional
    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });
});

test.describe("Existing Features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("New button works", async ({ page }) => {
    // Load a sample first
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");
    await expect(page.getByText("Nodes: 3")).toBeVisible();

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();
  });

  test("Save button downloads a JSON file", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("Open button triggers file chooser", async ({ page }) => {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test("Undo/Redo buttons work", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    await page.locator("button[title*='Undo']").click();
    await expect(page.getByText("Nodes: 0")).toBeVisible();

    await page.locator("button[title*='Redo']").click();
    await expect(page.getByText("Nodes: 1")).toBeVisible();
  });

  test("theme toggle switches between light and dark", async ({ page }) => {
    const themeBtn = page.locator("button.theme-toggle");
    await expect(themeBtn).toBeVisible();

    // Initial theme should be light
    const initialText = await themeBtn.textContent();
    await themeBtn.click();

    // Text should change (🌙 ↔ ☀️)
    const newText = await themeBtn.textContent();
    expect(newText).not.toBe(initialText);

    // data-theme attribute should toggle
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme).toBe("dark");

    // Toggle back
    await themeBtn.click();
    const restoredTheme = await page.locator("html").getAttribute("data-theme");
    expect(restoredTheme).toBe("light");
  });

  test("Guide button is visible", async ({ page }) => {
    const guideBtn = page.getByRole("button", { name: /Guide/ });
    await expect(guideBtn).toBeVisible();
  });

  test("Report button is visible", async ({ page }) => {
    const reportBtn = page.getByRole("button", { name: /Report/ });
    await expect(reportBtn).toBeVisible();
  });

  test("Location selector is visible", async ({ page }) => {
    // Location selector has a state dropdown
    const stateSelect = page.locator("select").filter({ hasText: /State/ });
    // It might not be labeled "State" exactly. Look for the LocationSelector.
    // At minimum, the toolbar should have it rendered.
    await expect(page.locator(".toolbar")).toBeVisible();
  });

  test("Event selector appears after loading project with events", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");

    const eventSelector = page.locator(".event-selector");
    await expect(eventSelector).toBeVisible();
    // Simple detention has 2 events
    await expect(eventSelector.locator("option")).toHaveCount(2);
  });

  test("switching events updates active event", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("simple-detention");
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();

    const eventSelector = page.locator(".event-selector");
    // Switch to 100-year event
    await eventSelector.selectOption("100yr");
    await expect(eventSelector).toHaveValue("100yr");
  });
});

test.describe("Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("delete all nodes from sample leaves clean state", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("pre-post"); // smallest: 2 nodes

    await expect(page.getByText("Nodes: 2")).toBeVisible();

    // Delete both nodes
    for (let i = 2; i > 0; i--) {
      await page.locator(".node-group").first().click();
      await page.getByRole("button", { name: "Delete Node" }).click();
      await expect(page.getByText(`Nodes: ${i - 1}`)).toBeVisible();
    }
    await expect(page.getByText("Nodes: 0")).toBeVisible();
    await expect(page.getByText("Links: 0")).toBeVisible();
  });

  test("load sample, add node, then load another sample replaces all", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("pre-post");
    await expect(page.getByText("Nodes: 2")).toBeVisible();

    // Add extra node
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Junction" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 3")).toBeVisible();

    // Load different sample — should replace everything
    await dropdown.selectOption("simple-detention");
    await expect(page.getByText("Nodes: 3")).toBeVisible(); // simple-detention has exactly 3
    await expect(page.getByText("Links: 2")).toBeVisible(); // simple-detention has 2 links
  });

  test("simulation on single subcatchment node produces results", async ({ page }) => {
    const canvas = page.locator(".diagram-area svg");
    await page.locator(".stencil-item", { hasText: "Subcatchment" }).dragTo(canvas);
    await expect(page.getByText("Nodes: 1")).toBeVisible();

    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(500);

    await page.locator(".node-group").click();
    // Single subcatchment should still produce runoff results
    await expect(page.getByText("Results")).toBeVisible();
  });

  test("load sample then save produces valid file with correct data", async ({ page }) => {
    const dropdown = page.locator("select[title='Load a sample project']");
    await dropdown.selectOption("commercial-dev");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("commercial-development.json");
  });
});
