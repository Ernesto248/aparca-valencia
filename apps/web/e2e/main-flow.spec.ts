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
  await page.route("**/api/v1/parking/recommendations**", (route) =>
    route.fulfill({ json: { destination: { latitude: 39.469, longitude: -0.405 }, radius_meters: 500, warning: "Sin disponibilidad confirmada", items: [{ id: "00000000-0000-0000-0000-000000000001", street_name: "Avinguda del Cid", latitude: 39.4692, longitude: -0.404, distance_meters: 120, evidence_count: 18, strategy: "heuristic_v0", ranking_score: 0.82, availability_probability: null, availability_status: "unknown", confidence: "unvalidated", explanation: "A 120 m del destino y respaldada por 18 geometrías del inventario municipal.", data_source: "valencia_arcgis_197", imported_at: null }] } })
  );
});

test("busca un destino y muestra una recomendación transparente", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Destino en València").fill("Avinguda del Cid 75");
  await page.getByRole("button", { name: "Buscar destino" }).click();
  await expect(page.getByText("Avinguda del Cid").first()).toBeVisible();
  await expect(page.getByText(/disponibilidad de plazas no está confirmada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Cómo llegar/i })).toBeVisible();
});
