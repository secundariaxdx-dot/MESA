import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { DEMO_RECIPE_IDS } from "@/data/recipes";
import { getCatalogSync } from "@/services/prices/provider";
import { buildShoppingList } from "./shopping";
import { newPantryItem } from "./pantry";
import { generateWeek, planFromRecipes } from "./planner";
import { fateFor, wasteReport } from "./waste";
import { checkRecipe } from "./compat";
import { getRecipe } from "@/data/recipes";
import type { Profile } from "@/domain/types";

const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const catalog = getCatalogSync("mercadona");
const gen = (profile: Profile, seed: number, avoid?: string[]) => generateWeek({ profile, pantry, catalog, seed, weekStart: "2026-11-23", avoidRecipeIds: avoid }).plan;
const report = (profile: Profile, seed: number) => {
  const plan = gen(profile, seed);
  const list = buildShoppingList(plan, pantry, catalog);
  return { plan, list, w: wasteReport(plan, list, pantry, catalog) };
};

describe("aprovechamiento de envases", () => {
  it("clasifica sobrantes por lo que dura el alimento", () => {
    expect(fateFor(3)).toBe("riesgo"); // pan, carne fresca
    expect(fateFor(7)).toBe("riesgo"); // tomate
    expect(fateFor(21)).toBe("proxima"); // huevos
    expect(fateFor(365)).toBe("despensa"); // arroz, conservas
  });

  it("detecta lo que sobra en la semana de ejemplo", () => {
    const plan = planFromRecipes({ profile: DEMO_PROFILE, pantry, catalog, seed: 1, weekStart: "2026-11-23" }, DEMO_RECIPE_IDS);
    const list = buildShoppingList(plan, pantry, catalog);
    const w = wasteReport(plan, list, pantry, catalog);
    const tomate = w.lines.find((l) => l.ingredientId === "tomate")!;
    expect(tomate.fate).toBe("riesgo");
    expect(w.lines.find((l) => l.ingredientId === "cebolla")!.fate).toBe("despensa");
    expect(w.usedPct).toBeGreaterThan(0);
    expect(w.usedPct).toBeLessThanOrEqual(1);
  });

  it("cuenta lo que tienes en casa y caduca esta semana sin usarse", () => {
    const withMilk = [...pantry, newPantryItem("pechuga-pollo", "pollo", 500, { expiresAt: "2026-11-25" })];
    const plan = planFromRecipes({ profile: DEMO_PROFILE, pantry: withMilk, catalog, seed: 1, weekStart: "2026-11-23" }, DEMO_RECIPE_IDS);
    const w = wasteReport(plan, buildShoppingList(plan, withMilk, catalog), withMilk, catalog);
    expect(w.lines.find((l) => l.ingredientId === "pechuga-pollo" && l.source === "despensa")).toBeTruthy();
  });

  it("el modo aprovechamiento tira menos comida, sin pasarse del presupuesto ni saltarse restricciones", () => {
    let normal = 0;
    let optimized = 0;
    // El modo viene activado por defecto: lo apagamos explícitamente para comparar.
    const profile: Profile = { ...DEMO_PROFILE, optimizer: false, days: [0, 1, 2, 3, 4, 5, 6], meals: { desayuno: true, comida: true, cena: true }, budget: 120 };
    for (let seed = 1; seed <= 4; seed++) {
      normal += report(profile, seed).w.riskValue;
      const o = report({ ...profile, optimizer: true }, seed);
      optimized += o.w.riskValue;
      expect(o.list.checkoutTotal).toBeLessThanOrEqual(120);
      for (const m of o.plan.meals) expect(checkRecipe(getRecipe(m.recipeId)!, profile)).toEqual([]);
    }
    expect(optimized).toBeLessThan(normal * 0.6);
  });

  it("«Otra semana» sigue cambiando los platos con el modo activado", () => {
    const profile: Profile = { ...DEMO_PROFILE, optimizer: true };
    const a = gen(profile, 11);
    const b = gen(profile, 12, a.meals.map((m) => m.recipeId));
    const same = b.meals.filter((m) => a.meals.some((x) => x.recipeId === m.recipeId)).length;
    expect(same).toBeLessThanOrEqual(2);
  });

  it("la semana siguiente empieza por lo que sobró", () => {
    const profile: Profile = { ...DEMO_PROFILE, optimizer: true };
    const leftovers = [...pantry, newPantryItem("garbanzos", "garbanzos", 400, { expiresAt: "2026-12-01" }), newPantryItem("espinacas", "espinacas", 200, { expiresAt: "2026-11-25" })];
    const plan = generateWeek({ profile, pantry: leftovers, catalog, seed: 3, weekStart: "2026-11-23" }).plan;
    const usesThem = plan.meals.some((m) => getRecipe(m.recipeId)!.ingredients.some((i) => i.ingredientId === "garbanzos" || i.ingredientId === "espinacas"));
    expect(usesThem).toBe(true);
  });
});
