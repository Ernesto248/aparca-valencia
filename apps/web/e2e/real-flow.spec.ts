import { expect, test } from "@playwright/test";

test.skip(process.env.REAL_E2E !== "1", "Se ejecuta únicamente contra una beta desplegada");

test("completa el flujo principal con datos reales", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  await page.getByLabel("Destino en València").fill("Plaça de l'Ajuntament");
  await page.getByRole("button", { name: "Buscar destino" }).click();

  const candidate = page.getByText(/Plaça de l'Ajuntament, Ciutat Vella/i).first();
  await expect(candidate).toBeVisible();
  await candidate.click();

  const recommendation = page.getByRole("heading", { name: "AYUNTAMIENTO" }).first();
  await expect(recommendation).toBeVisible();
  await recommendation.click();
  if (testInfo.project.name === "mobile") {
    await expect(page.getByText("Zona resaltada en coral")).toBeVisible();
  } else {
    await expect(recommendation.locator("xpath=ancestor::button")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  }

  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: /Cómo llegar/i })
    .or(page.getByRole("link", { name: /Cómo llegar/i }))
    .first()
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(/google\.com\/maps\/dir/);
  expect(consoleErrors.filter((message) => message.includes("Worker failed to load"))).toEqual([]);
});
