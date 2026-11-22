import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { getCatalogSync } from "@/services/prices/provider";
import { newPantryItem } from "./pantry";
import { generateWeek, swapIn, findAlternatives } from "./planner";
import { buildShoppingList, computeNeeds } from "./shopping";
import { dailyIntake, nutritionTargets, plannedShare, withPortions } from "./nutrition";
import type { NutritionProfile, Profile } from "@/domain/types";

const ana: NutritionProfile = { enabled: true, sex: "mujer", age: 30, weightKg: 60, heightCm: 165, activity: "ligera", goal: "perder", pace: "suave" };
const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const catalog = getCatalogSync("mercadona");
const base: Profile = { ...DEMO_PROFILE, adults: 1, days: [0, 1, 2, 3, 4, 5, 6], meals: { desayuno: true, comida: true, merienda: true, cena: true }, budget: 120 };
const gen = (profile: Profile, seed = 3) => generateWeek({ profile, pantry, catalog, seed, weekStart: "2026-11-23" }).plan;

describe("calorías y macros", () => {
  it("Mifflin-St Jeor, actividad y déficit suave (cálculo a mano)", () => {
    const t = nutritionTargets(ana);
    // 10·60 + 6,25·165 − 5·30 − 161 = 1320,25 kcal
    expect(t.bmr).toBe(1320);
    expect(t.tdee).toBe(Math.round(1320.25 * 1.375));
    expect(t.kcal).toBe(Math.round((1320.25 * 1.375 * 0.85) / 10) * 10);
    expect(t.protein).toBe(Math.round(1.8 * 60));
    expect(t.protein * 4 + t.fat * 9 + t.carbs * 4).toBeGreaterThan(t.kcal - 15);
    expect(t.bmi).toBeCloseTo(22, 0);
  });

  it("nunca baja de los mínimos prudentes ni aplica déficit a menores", () => {
    const tiny = nutritionTargets({ ...ana, weightKg: 45, heightCm: 150, age: 60, activity: "sedentaria", pace: "normal" });
    expect(tiny.kcal).toBeGreaterThanOrEqual(1200);
    expect(tiny.notes.join(" ")).toMatch(/limitado/);
    const teen = nutritionTargets({ ...ana, age: 16 });
    expect(teen.kcal).toBe(Math.round(teen.tdee / 10) * 10);
    expect(teen.notes.join(" ")).toMatch(/menor de 18/);
  });

  it("ganar masa sube calorías y proteína", () => {
    const t = nutritionTargets({ ...ana, sex: "hombre", weightKg: 75, heightCm: 180, goal: "ganar", activity: "moderada" });
    expect(t.kcal).toBeGreaterThan(t.tdee);
    expect(t.protein).toBe(150);
  });

  it("la semana se ajusta a tu objetivo diario (con las 4 franjas)", () => {
    const profile: Profile = { ...base, nutrition: ana };
    const t = nutritionTargets(ana);
    const plan = gen(profile);
    const days = dailyIntake(plan);
    expect(days).toHaveLength(7);
    for (const d of days) {
      expect(Math.abs(d.kcal - t.kcal) / t.kcal).toBeLessThan(0.12);
    }
    const avgProtein = days.reduce((s, d) => s + d.protein, 0) / days.length;
    expect(avgProtein).toBeGreaterThan(t.protein * 0.6);
  });

  it("sin ajuste de calorías, las raciones son las estándar", () => {
    const plan = gen(base);
    expect(plan.meals.every((m) => m.myPortion === undefined && m.portions === undefined)).toBe(true);
  });

  it("tu ración ajustada cambia las cantidades de la compra; la del resto de la casa no", () => {
    const big: NutritionProfile = { ...ana, sex: "hombre", weightKg: 90, heightCm: 188, activity: "alta", goal: "ganar" };
    const profile: Profile = { ...base, adults: 2, meals: { comida: false, cena: true }, nutrition: big };
    const plan = gen(profile, 5);
    const standard = withPortions(plan, { ...profile, nutrition: undefined });
    for (const m of plan.meals) {
      expect(m.myPortion).toBeGreaterThan(1);
      expect(m.portions).toBeCloseTo(2 - 1 + m.myPortion!, 2);
    }
    const sum = (p: typeof plan) => [...computeNeeds(p).values()].reduce((s, n) => s + n.qty, 0);
    expect(sum(plan)).toBeGreaterThan(sum(standard));
    expect(buildShoppingList(plan, pantry, catalog).checkoutTotal).toBeGreaterThanOrEqual(buildShoppingList(standard, pantry, catalog).checkoutTotal);
  });

  it("cambiar un plato recalcula tu ración", () => {
    const profile: Profile = { ...base, nutrition: ana };
    const plan = gen(profile);
    const meal = plan.meals.find((m) => m.slot === "cena")!;
    const alt = findAlternatives(plan, meal.id, { profile, pantry, catalog })[0].recipe;
    const next = swapIn(plan, meal.id, alt.id, profile);
    const swapped = next.meals.find((m) => m.id === meal.id)!;
    expect(swapped.recipeId).toBe(alt.id);
    expect(swapped.myPortion).toBeGreaterThan(0);
  });

  it("las franjas planificadas cubren su parte del día", () => {
    expect(plannedShare({ cena: true })).toBeCloseTo(0.3);
    expect(plannedShare({ desayuno: true, comida: true, merienda: true, cena: true })).toBeCloseTo(0.97);
  });
});
