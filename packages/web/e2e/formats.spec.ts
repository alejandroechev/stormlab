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

const TEMP_DIR = path.resolve(__dirname, "../test-results/format-exports");

test.describe("File Format Roundtrip E2E", () => {
  test.beforeAll(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Load example project
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(EXAMPLE_PROJECT);
    await expect(page.getByText("Nodes: 3")).toBeVisible();
    await expect(page.getByText("Links: 2")).toBeVisible();
    // Run simulation so results are available for CSV export
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
  });

  test("CSV subcatchments roundtrip", async ({ page }) => {
    // Export CSV
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const csvRow = page.locator("text=CSV — Subcatchments").locator("..");
    await csvRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "subcatchments.csv");
    await download.saveAs(exportPath);

    // Verify the exported file has content
    const csvContent = fs.readFileSync(exportPath, "utf-8");
    expect(csvContent).toContain("name,area,cn,soil_group,tc,description");
    expect(csvContent).toContain("North Basin");
    const exportedRowCount = csvContent.trim().split("\n").length - 1;
    expect(exportedRowCount).toBeGreaterThan(0);

    // Create new project and import CSV
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await page.waitForTimeout(500);

    const importChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const csvRow2 = page.locator("text=CSV — Subcatchments").locator("..");
    await csvRow2.getByRole("button", { name: "Import" }).click();
    const importChooser = await importChooserPromise;
    await importChooser.setFiles(exportPath);

    // Wait for nodes to appear and verify
    await page.waitForTimeout(500);
    const nodeGroups = page.locator(".node-group");
    expect(await nodeGroups.count()).toBeGreaterThanOrEqual(1);

    // Click first node and verify it's a subcatchment
    await nodeGroups.first().click();
    await expect(page.getByText("Sub-Areas")).toBeVisible();
  });

  test("CSV results export contains data", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const resultsRow = page.locator("text=CSV — Results").locator("..");
    await resultsRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "results.csv");
    await download.saveAs(exportPath);

    const csv = fs.readFileSync(exportPath, "utf-8");
    expect(csv).toContain("event,node,type,peak_inflow_cfs,peak_outflow_cfs");
    expect(csv).toContain("North Basin");
    expect(csv).toContain("Detention Pond");
    // Should have results for multiple events (4 events × 3 nodes = 12 data rows)
    const lines = csv.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(4); // header + at least 3 nodes
  });

  test("EPA SWMM .inp roundtrip", async ({ page }) => {
    // Export SWMM
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const swmmRow = page.locator("text=EPA SWMM").locator("..");
    await swmmRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "project.inp");
    await download.saveAs(exportPath);

    // Verify SWMM file structure
    const inp = fs.readFileSync(exportPath, "utf-8");
    expect(inp).toContain("[TITLE]");
    expect(inp).toContain("[SUBCATCHMENTS]");
    expect(inp).toContain("[OPTIONS]");
    expect(inp).toContain("North Basin");

    // Import the SWMM file into a new project
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await page.waitForTimeout(500);

    const importChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const swmmRow2 = page.locator("text=EPA SWMM").locator("..");
    await swmmRow2.getByRole("button", { name: "Import" }).click();
    const importChooser = await importChooserPromise;
    await importChooser.setFiles(exportPath);

    // Verify nodes were created
    await page.waitForTimeout(500);
    const nodeGroups = page.locator(".node-group");
    expect(await nodeGroups.count()).toBeGreaterThanOrEqual(1);

    // Verify a node exists and can be selected
    await nodeGroups.first().click();
    await expect(page.locator(".property-panel h3")).toBeVisible();
  });

  test("HEC-HMS .basin roundtrip", async ({ page }) => {
    // Export HEC-HMS
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const hmsRow = page.locator("text=HEC-HMS").locator("..");
    await hmsRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "project.basin");
    await download.saveAs(exportPath);

    // Verify basin file structure
    const basin = fs.readFileSync(exportPath, "utf-8");
    expect(basin).toContain("Basin:");
    expect(basin).toContain("Subbasin: North Basin");
    expect(basin).toContain("Area:");
    expect(basin).toContain("Curve Number:");
    expect(basin).toContain("End:");

    // Import back
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await page.waitForTimeout(500);

    const importChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const hmsRow2 = page.locator("text=HEC-HMS").locator("..");
    await hmsRow2.getByRole("button", { name: "Import" }).click();
    const importChooser = await importChooserPromise;
    await importChooser.setFiles(exportPath);

    // Verify nodes were created
    await page.waitForTimeout(500);
    const nodeGroups = page.locator(".node-group");
    expect(await nodeGroups.count()).toBeGreaterThanOrEqual(2);
  });

  test("GeoJSON roundtrip", async ({ page }) => {
    // Export GeoJSON
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const gjRow = page.locator("text=GeoJSON").locator("..");
    await gjRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "project.geojson");
    await download.saveAs(exportPath);

    // Verify GeoJSON structure
    const gjText = fs.readFileSync(exportPath, "utf-8");
    const geojson = JSON.parse(gjText);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(3); // SC, Pond, Junction
    expect(geojson.features[0].properties.name).toBe("North Basin");
    expect(geojson.features[0].properties.type).toBe("subcatchment");
    expect(geojson.features[0].properties.cn).toBeDefined();
    expect(geojson.features[0].properties.area).toBeGreaterThan(0);

    // Import back
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await page.waitForTimeout(500);

    const importChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const gjRow2 = page.locator("text=GeoJSON").locator("..");
    await gjRow2.getByRole("button", { name: "Import" }).click();
    const importChooser = await importChooserPromise;
    await importChooser.setFiles(exportPath);

    // GeoJSON import creates subcatchments from all features
    await page.waitForTimeout(500);
    const nodeGroups = page.locator(".node-group");
    expect(await nodeGroups.count()).toBeGreaterThanOrEqual(3);

    // Verify subcatchment properties survived
    await nodeGroups.first().click();
    await expect(page.getByText("Sub-Areas")).toBeVisible();
  });

  test("HydroCAD .hcp roundtrip", async ({ page }) => {
    // Export HydroCAD
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const hcpRow = page.locator("text=HydroCAD").locator("..");
    await hcpRow.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const exportPath = path.join(TEMP_DIR, "project.hcp");
    await download.saveAs(exportPath);

    // Verify .hcp file structure
    const hcp = fs.readFileSync(exportPath, "utf-8");
    expect(hcp).toContain("[HydroCAD]");
    expect(hcp).toContain("[EVENT]");
    expect(hcp).toContain("[NODE]");
    expect(hcp).toContain("Type=Subcat");
    expect(hcp).toContain("Type=Pond");
    expect(hcp).toContain("North Basin");
    expect(hcp).toContain("[AREA]");
    expect(hcp).toContain("[DEVICE]");

    // Verify event depths are in feet (not inches)
    // 25-Year Storm is 6.0 inches = 0.5 feet
    expect(hcp).toContain("StormDepth=0.5");

    // Remember original node/link counts
    const origStatusText = await page.locator(".status-bar").textContent();
    const origNodeMatch = origStatusText!.match(/Nodes:\s*(\d+)/);
    const origLinkMatch = origStatusText!.match(/Links:\s*(\d+)/);
    const origNodeCount = parseInt(origNodeMatch![1]);
    const origLinkCount = parseInt(origLinkMatch![1]);

    // Import back into a new project
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New" }).click();
    await page.waitForTimeout(500);

    const importChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "↔ Import/Export" }).click();
    const hcpRow2 = page.locator("text=HydroCAD").locator("..");
    await hcpRow2.getByRole("button", { name: "Import" }).click();
    const importChooser = await importChooserPromise;
    await importChooser.setFiles(exportPath);

    // Wait and verify node count matches
    await page.waitForTimeout(500);
    const nodeGroups = page.locator(".node-group");
    const importedNodeCount = await nodeGroups.count();
    expect(importedNodeCount).toBe(origNodeCount);

    // Verify link count matches
    const newStatusText = await page.locator(".status-bar").textContent();
    const newLinkMatch = newStatusText!.match(/Links:\s*(\d+)/);
    const importedLinkCount = parseInt(newLinkMatch![1]);
    expect(importedLinkCount).toBe(origLinkCount);

    // Verify subcatchment data survived — click North Basin using JS dispatch
    await page.evaluate(() => {
      const node = document.querySelector('.node-group');
      if (node) node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });
    await page.waitForTimeout(300);

    // Property panel should show subcatchment properties
    const propPanel = page.locator(".property-panel");
    const propContent = await propPanel.textContent();
    expect(propContent).toContain("Sub-Areas");

    // Verify events were imported
    const eventSelector = page.locator(".event-selector");
    await expect(eventSelector).toBeVisible();
    const eventCount = await eventSelector.locator("option").count();
    expect(eventCount).toBe(4);

    // Run simulation to verify the project is functional
    await page.getByRole("button", { name: "▶ Run Simulation" }).click();
    await page.waitForTimeout(500);

    // Click the pond node via JS dispatch
    await page.evaluate(() => {
      const nodes = document.querySelectorAll('.node-group');
      if (nodes[1]) nodes[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });
    await page.waitForTimeout(300);
    await expect(page.getByText("Results")).toBeVisible();
    const peakFlow = await page.locator(".result-badge .value").first().textContent();
    const peakVal = parseFloat(peakFlow!);
    expect(peakVal).toBeGreaterThan(0);
  });
});
