// Recorrido completo de la "definición de éxito" de MESA.
// Uso: npm run build && npm start (puerto 3000) y luego: node e2e/success-path.mjs [baseUrl] [carpetaCapturas]
import { createRequire } from "node:module";
// Playwright puede estar instalado globalmente (NODE_PATH) o como dependencia del proyecto.
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.argv[3];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let n = 0;
const shot = async (name) => {
  if (!SHOTS) return;
  await page.waitForTimeout(600); // deja terminar las animaciones
  await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png` });
};
const step = (t) => console.log("✓", t);
const cont = () => page.getByRole("button", { name: /Continuar/ }).click();

await page.goto(`${BASE}/`);
await page.waitForURL(/\/bienvenida\/?$/);
await shot("bienvenida");
await page.getByRole("button", { name: /Empezar desde cero/ }).click();
await page.waitForURL(/\/onboarding\/?$/);
step("1. Entrar en la aplicación");

await page.getByRole("button", { name: /España/ }).click();
await page.getByRole("button", { name: /Mercadona/ }).first().click();
await shot("paso-super");
await cont();
step("2. España y Mercadona");

await page.getByRole("button", { name: "Añadir Adultos" }).click();
await page.getByText("personas en casa").waitFor();
if ((await page.locator("span.font-display.text-\\[96px\\]").innerText()) !== "3") throw new Error("No son 3 personas");
await shot("paso-personas");
await cont();
step("3. Tres personas");

// Días: L-V por defecto; comprobamos y probamos a quitar/poner un día.
await page.getByRole("button", { name: "Sábado", exact: true }).click();
await page.getByRole("button", { name: "Sábado", exact: true }).click();
await page.getByRole("button", { name: "Lunes a viernes" }).click();
await shot("paso-dias");
await cont();
step("4. Lunes a viernes");

// Volver atrás y comprobar que se mantiene la respuesta.
await page.getByRole("button", { name: "Volver" }).click();
if ((await page.getByRole("button", { name: "Lunes", exact: true }).getAttribute("aria-pressed")) !== "true") throw new Error("Respuesta no persistente al volver");
await cont();

await shot("paso-comidas");
await cont();
step("5. Cenas");
await cont(); // sobras

await page.getByLabel("Presupuesto semanal").fill("53");
await page.getByText("53 €").first().waitFor();
await shot("paso-presupuesto");
await cont();
step("6. Presupuesto 53 €");

await page.getByRole("button", { name: /Rápidas/ }).click();
await page.getByRole("button", { name: /De toda la vida/ }).click();
await shot("paso-preferencias");
await cont();
step("7. Preferencias");

await cont(); // dieta: como de todo
await shot("paso-carnes");
await cont(); // carnes
await page.getByRole("button", { name: /Champiñones/ }).click();
await cont();
// Sin alergias: sin marcar nada, el botón de abajo permite seguir.
const noAllergy = page.getByRole("button", { name: /No hay alergias · Continuar/ });
if (await noAllergy.isDisabled()) throw new Error("No se puede continuar sin alergias");
await shot("paso-alergias");
await noAllergy.click();
step("8. Restricciones alimentarias");

for (const a of ["Horno", "Microondas", "Batidora"]) await page.getByRole("button", { name: a, exact: true }).first().click();
await shot("paso-cocina");
await cont();
step("9. Electrodomésticos");

await shot("propuesta-valor");
await page.getByRole("button", { name: /Hacer mi semana/ }).click();
await page.waitForURL(/\/generando\/?$/);
await page.waitForTimeout(900);
await shot("generando");
await page.waitForURL(/\/semana\/?$/, { timeout: 20000 });
step("10. Crear la planificación");

await page.getByText("Tu menú").waitFor();
await page.locator("article").first().waitFor({ timeout: 5000 });
const meals = await page.locator("article").count();
if (meals !== 5) throw new Error(`Esperaba 5 cenas, hay ${meals}`);
const total1 = await page.getByTestId("checkout-total").innerText();
await shot("semana");
step(`11-12. Menú semanal (5 cenas) · importe en caja ${total1}`);

// Despensa: añadir aceite y sal.
await page.goto(`${BASE}/despensa`);
for (const item of ["Aceite de oliva", "Sal"]) {
  await page.getByRole("button", { name: /Añadir/ }).first().click();
  await page.getByPlaceholder("Busca un ingrediente").fill(item);
  await page.locator("ul button").filter({ has: page.getByText(item, { exact: true }) }).first().click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
}
await shot("despensa");

await page.goto(`${BASE}/lista`);
await page.getByText("Lo tienes en casa").waitFor();
const total2 = await page.getByTestId("list-total").innerText();
await shot("lista");
step(`13-15. Lista por envases completos · ${total2} tras descontar despensa`);
if (!(await page.getByText(/Comprar 1 .*aprox\./).first().isVisible())) throw new Error("No se muestran envases");

// Compra repartida entre varios supermercados.
const euros = (t) => Number(t.replace(/[^\d,]/g, "").replace(",", "."));
await page.getByRole("button", { name: "Añadir", exact: true }).click();
await page.getByRole("checkbox", { name: "También voy a DIA" }).click();
await page.getByRole("checkbox", { name: "También voy a Lidl" }).click();
await page.getByRole("button", { name: "Guardar", exact: true }).click();
await page.getByTestId("modo-repartir").waitFor();
const totalMulti = await page.getByTestId("list-total").innerText();
if (euros(totalMulti) > euros(total2)) throw new Error(`Repartir sale más caro: ${totalMulti} > ${total2}`);
const stores = await page.getByTestId("list-stores").innerText();
await shot("lista-varios-super");
step(`    Varios supermercados: ${stores} · ${totalMulti} (antes ${total2})`);
await page.getByRole("radio", { name: /Todo en Mercadona/ }).click();
if ((await page.getByTestId("list-total").innerText()) !== total2) throw new Error("Volver a un súper no restaura el total");
await page.getByTestId("modo-repartir").click();
await page.getByText("en el carro").first().waitFor();

const boxes = page.getByRole("checkbox", { name: /^Marcar / });
await boxes.nth(0).click();
await boxes.nth(1).click();
const cart = await page.getByTestId("cart-count").innerText();
if (!cart.startsWith("2 de")) throw new Error(`Contador del carro incorrecto: ${cart}`);
await shot("lista-marcada");
step(`16. Artículos marcados (${cart})`);
await page.getByTestId("ya-he-comprado").click();
await page.getByRole("button", { name: /Registrar/ }).click();
await page.waitForURL(/\/semana\/?$/);
await page.getByText("Compra registrada").first().waitFor();
step("    Compra registrada");

await page.locator("article a").first().click();
await page.waitForURL(/\/receta\/?\?r=/);
await page.getByText("Ingredientes").first().waitFor();
const firstQty = page.locator("[data-testid^=qty-]").first();
const before = await firstQty.innerText();
await page.getByRole("button", { name: "Más raciones" }).click();
const after = await firstQty.innerText();
if (before === after) throw new Error("Las cantidades no cambian con las raciones");
step(`17-18. Receta abierta · raciones cambiadas (${before} → ${after})`);
await shot("receta");
await page.getByRole("switch", { name: "Medidas caseras" }).click();
await page.getByText(/cucharad|unidad|vaso|taza|diente|pizca/).first().waitFor();
await page.getByText("Cómo guardarlo").scrollIntoViewIfNeeded();
await shot("receta-caseras-conservacion");
step("19-20. Medidas caseras y conservación");

await page.getByTestId("cocinar-ahora").click();
await page.waitForURL(/\/cocinar\/?\?r=/);
await shot("cocina-paso1");
const s1 = await page.getByTestId("step-text").innerText();
await page.getByTestId("next-step").click();
await page.getByTestId("prev-step").click();
if ((await page.getByTestId("step-text").innerText()) !== s1) throw new Error("No vuelve al paso anterior");
while (await page.getByTestId("next-step").isVisible().catch(() => false)) await page.getByTestId("next-step").click();
await shot("cocina-ultimo");
await page.getByTestId("finish").click();
await page.getByText("¡BUEN PROVECHO!").waitFor();
await shot("buen-provecho");
step("21-22. Cocinar paso a paso y terminar");

await page.getByRole("button", { name: /Volver a mi semana/ }).click();
await page.waitForURL(/\/semana\/?$/);
await page.getByText("1 de 5 cocinados").waitFor();
await page.reload();
await page.getByText("1 de 5 cocinados").waitFor();
step("    Persistencia tras recargar");

for (const tab of ["Recetas", "Preferencias", "Ajustes", "Semana"]) {
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: tab }).click();
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}
step("    Navegación entre las cuatro pestañas");

// Mis productos: el guacamole de Mercadona, cada semana en la lista.
await page.goto(`${BASE}/lista`);
const beforeFav = euros(await page.getByTestId("list-total").innerText());
await page.getByTestId("mis-productos").click();
await page.waitForURL(/\/productos\/?$/);
await page.getByTestId("nuevo-producto").click();
await page.getByLabel("Nombre del producto").fill("Guacamole");
await page.getByRole("button", { name: "Mercadona" }).click();
await page.getByLabel("Precio").fill("2,35");
await page.getByRole("button", { name: "Guardar", exact: true }).click();
await page.getByText("Guacamole").first().waitFor();
await shot("mis-productos");
await page.goto(`${BASE}/lista`);
await page.getByText("Guacamole").first().waitFor();
const afterFav = euros(await page.getByTestId("list-total").innerText());
if (Math.abs(afterFav - beforeFav - 2.35) > 0.011) throw new Error(`El guacamole no suma bien: ${beforeFav} → ${afterFav}`);
await shot("lista-con-guacamole");
step(`    Mis productos: guacamole de Mercadona en la lista (${beforeFav} → ${afterFav} €)`);

// Desayunos y meriendas desde Preferencias.
await page.goto(`${BASE}/preferencias`);
await page.getByRole("button", { name: /Franjas del día/ }).click();
await page.getByRole("dialog").getByRole("button", { name: /Desayuno/ }).click();
await page.getByRole("dialog").getByRole("button", { name: /Merienda/ }).click();
await page.getByRole("button", { name: "Guardar", exact: true }).click();
await page.getByRole("button", { name: /Regenerar mi semana/ }).click();
await page.waitForURL(/\/semana\/?$/, { timeout: 20000 });
await page.getByText("Tu menú").waitFor();
const slotsText = await page.locator("article").allInnerTexts();
const nBreakfast = slotsText.filter((t) => /DESAYUNO/i.test(t)).length;
const nSnack = slotsText.filter((t) => /MERIENDA/i.test(t)).length;
if (nBreakfast !== 5 || nSnack !== 5) throw new Error(`Esperaba 5 desayunos y 5 meriendas: ${nBreakfast}/${nSnack}`);
await shot("semana-desayunos");
step(`    Desayunos y meriendas: ${slotsText.length} platos (${nBreakfast} desayunos, ${nSnack} meriendas)`);

await page.goto(`${BASE}/recetas`);
await shot("recetas");
await page.goto(`${BASE}/preferencias`);
await shot("preferencias");
await page.goto(`${BASE}/ajustes`);
await shot("ajustes");

await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${BASE}/semana`);
await page.getByText("Tu menú").waitFor();
await shot("semana-escritorio");

if (errors.length) {
  console.log("Errores de consola:", errors);
  process.exitCode = 1;
}
await browser.close();
console.log("Recorrido completo OK");
