import type { MyProduct, PantryItem, Profile, WeekPlan } from "@/domain/types";
import { ensureRemotePrices, providerFor } from "@/services/prices/provider";
import { shoppingSetup } from "./shoppingSetup";
import { getSupermarket } from "@/data/geo";
import { nextWeekStart } from "./dates";
import { compatibilityReport, generateWeek, PlanError } from "./planner";
import { buildShoppingList } from "./shopping";
import { expiringSoon } from "./pantry";

export const GENERATION_STAGES = [
  "Analizando tus preferencias",
  "Buscando recetas compatibles",
  "Ajustando las cantidades",
  "Comprobando los ingredientes",
  "Consultando los precios del supermercado",
  "Aprovechando tu despensa",
  "Calculando el coste de la compra",
] as const;

export interface StageInfo {
  index: number;
  label: string;
  detail?: string;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta la generación real por etapas. Cada etapa hace trabajo de verdad
 * (filtrado, catálogo, despensa, optimización) y comunica un detalle concreto;
 * la pausa mínima solo existe para que el usuario pueda leer el progreso.
 */
export async function generateStaged(
  input: { profile: Profile; pantry: PantryItem[]; previous?: WeekPlan | null; history?: WeekPlan[]; myProducts?: MyProduct[] },
  onStage: (s: StageInfo) => void,
  minStageMs = 380,
): Promise<{ plan: WeekPlan; checkoutTotal: number }> {
  const { profile, pantry } = input;
  const step = async (index: number, detail: string) => {
    onStage({ index, label: GENERATION_STAGES[index], detail });
    await pause(minStageMs);
  };

  await step(0, `${profile.days.length} días · ${profile.adults + profile.children} personas · ${profile.preferences.length} preferencias`);
  const report = compatibilityReport(profile);
  await step(1, `${report.compatible.length} de ${report.total} recetas cumplen tus restricciones`);
  if (!report.compatible.length) {
    throw new PlanError("Ninguna receta del catálogo cumple todas tus restricciones.", []);
  }
  const people = profile.adults + profile.children;
  await step(2, `Raciones para ${people} ${people === 1 ? "persona" : "personas"}${profile.children ? ` (${profile.children} niños)` : ""}`);
  await step(3, `${new Set(report.compatible.flatMap((r) => r.ingredients.map((i) => i.ingredientId))).size} ingredientes revisados`);
  // Precios reales publicados junto a la app (si los hay); si no, estimaciones.
  await ensureRemotePrices();
  const { ids, opts: shopping } = shoppingSetup(profile, profile.supermarketId, input.myProducts);
  const [catalog, ...extraCatalogs] = await Promise.all(ids.map((id) => providerFor(id).getCatalog(id)));
  const envases = [catalog, ...extraCatalogs].reduce((s, c) => s + c.products.length, 0);
  await step(
    4,
    `${envases} envases en ${ids.map((id) => getSupermarket(id).name).join(", ")}${catalog.isDemo ? " (precios estimados)" : ` · precios de su web del ${catalog.referenceDate.split("-").reverse().join("/")}`}`,
  );
  const usable = pantry.filter((p) => p.status === "ok").length;
  const soon = expiringSoon(pantry, 14).length;
  await step(
    5,
    usable
      ? `${usable} productos de tu despensa${profile.optimizer && soon ? ` · priorizando ${soon} que conviene usar pronto` : ""}`
      : "Tu despensa está vacía",
  );

  const seed = Math.floor(Math.random() * 1e9);
  // Variedad: no repetir lo de las últimas 3 semanas (actual + 2 del historial).
  const recentWeeks = [input.previous, ...(input.history ?? []).slice(0, 2)].filter(Boolean) as WeekPlan[];
  const avoid = [...new Set(recentWeeks.flatMap((w) => w.meals.map((m) => m.recipeId)))];
  const { plan, checkoutTotal } = generateWeek({ profile, pantry, catalog, extraCatalogs, shopping, seed, weekStart: nextWeekStart(), avoidRecipeIds: avoid });
  const total = buildShoppingList(plan, pantry, [catalog, ...extraCatalogs], shopping).checkoutTotal;
  await step(6, `Envases completos: ${total.toFixed(2).replace(".", ",")} €${profile.optimizer ? " · elegidos para gastarlos enteros" : ""}`);
  return { plan, checkoutTotal };
}
