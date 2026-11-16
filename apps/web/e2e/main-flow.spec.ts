import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/data/status", (route) =>
    route.fulfill({ json: { source: "valencia_arcgis_197", available: true, last_successful_sync: new Date().toISOString(), records: 282248, zones: 12000, stale: false, warning: null } })
  );
  await page.route("**/api/v1/geocode**", (route) =>
    route.fulfill({ json: [{ display_name: "Avinguda del Cid 75, València", latitude: 39.469, longitude: -0.405, type: "house", importance: 0.7 }] })
  );
  await page.route("**/api/v1/parking/nearby**", (route) =>
    route.fulfill({ json: { type: "FeatureCollection", features: [], meta: { count: 0 } } })
  );
  await page.route("**/api/v1/parking/predictions**", (route) =>
    route.fulfill({ json: { type: "FeatureCollection", features: [{ type: "Feature", id: "00000000-0000-0000-0000-000000000001", geometry: { type: "LineString", coordinates: [[-0.405, 39.469], [-0.4048, 39.4692]] }, properties: { street_name: "Avinguda del Cid", latitude: 39.4691, longitude: -0.4049, distance_meters: 120, occupancy_percent: 38, probability_level: "high", horizon_hours: 1, imported_at: new Date().toISOString() } }], meta: { count: 1, available: true } } })
  );
});

test("busca un destino y muestra la predicción de ocupación", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Destino en València").fill("Avinguda del Cid 75");
  await page.getByRole("button", { name: "Buscar destino" }).click();
  await expect(page.getByText("Avinguda del Cid").first()).toBeVisible();
  await expect(page.getByText("Probabilidad alta")).toBeVisible();
  await expect(page.getByText(/Ocupación prevista:/)).toHaveText(/38%/);
  await expect(page.getByRole("button", { name: /Cómo llegar/i })).toBeVisible();
});
