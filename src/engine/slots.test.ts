import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { getRecipe } from "@/data/recipes";
import { getCatalogSync } from "@/services/prices/provider";
import { newPantryItem } from "./pantry";
import { generateWeek, isLightSlot } from "./planner";
import { checkRecipe } from "./compat";
import type { Profile } from "@/domain/types";

const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const catalog = getCatalogSync("mercadona");
const ctx = (profile: Profile, seed = 2) => ({ profile, pantry, catalog, seed, weekStart: "2026-11-23" });

describe("desayunos y meriendas", () => {
  const profile: Profile = { ...DEMO_PROFILE, days: [0, 1, 2, 3, 4, 5, 6], meals: { desayuno: true, comida: true, merienda: true, cena: true }, budget: 200 };
  const { plan } = generateWeek(ctx(profile));

  it("crea las cuatro franjas cada día, en orden", () => {
    expect(plan.meals).toHaveLength(28);
    for (let d = 0; d < 7; d++) {
      expect(plan.meals.filter((m) => m.dayIndex === d).map((m) => m.slot)).toEqual(["desayuno", "comida", "merienda", "cena"]);
    }
  });

  it("cada franja usa recetas pensadas para ella (sin cenas en el desayuno)", () => {
    for (const m of plan.meals) expect(getRecipe(m.recipeId)!.mealTypes).toContain(m.slot);
  });

  it("los desayunos varían y no se avisa por repetirlos", () => {
    const breakfasts = plan.meals.filter((m) => m.slot === "desayuno").map((m) => m.recipeId);
    expect(new Set(breakfasts).size).toBeGreaterThanOrEqual(4);
    expect(plan.warnings.some((w) => w.includes("repetido"))).toBe(false);
  });

  it("respeta alergias también en desayunos y meriendas", () => {
    const p: Profile = { ...profile, allergens: ["lacteos", "frutos-cascara"] };
    const { plan: pl } = generateWeek(ctx(p, 5));
    for (const m of pl.meals) expect(checkRecipe(getRecipe(m.recipeId)!, p)).toEqual([]);
    expect(pl.meals.filter((m) => isLightSlot(m.slot)).length).toBe(14);
  });

  it("si no hay ningún desayuno compatible, avisa y no pone cenas en su lugar", () => {
    const p: Profile = { ...profile, meals: { desayuno: true, cena: true, comida: false }, allergens: ["gluten", "huevos", "lacteos"] };
    const { plan: pl } = generateWeek(ctx(p, 7));
    for (const m of pl.meals) expect(getRecipe(m.recipeId)!.mealTypes).toContain(m.slot);
    const hasBreakfast = pl.meals.some((m) => m.slot === "desayuno");
    if (!hasBreakfast) expect(pl.warnings.join(" ")).toMatch(/desayuno/);
  });
});
