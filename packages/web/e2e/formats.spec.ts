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
});
