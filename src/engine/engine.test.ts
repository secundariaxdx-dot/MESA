import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { DEMO_RECIPE_IDS, getRecipe, RECIPES } from "@/data/recipes";
import { INGREDIENTS, BASE_PACKS } from "@/data/ingredients";
import { getCatalogSync } from "@/services/prices/provider";
import { choosePacks, productsFor } from "./pricing";
import { buildShoppingList, computeNeeds } from "./shopping";
import { consumeFromPantry, addPurchaseToPantry, newPantryItem } from "./pantry";
import { checkRecipe, recipeAllergens, recipeDiets } from "./compat";
import { findAlternatives, generateWeek, planFromRecipes, replaceRecipe } from "./planner";
import { toHousehold } from "./units";
import { getIngredient } from "@/data/ingredients";
import type { Profile } from "@/domain/types";

const catalog = getCatalogSync("mercadona");
const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const ctx = (profile: Profile, seed = 1) => ({ profile, pantry, catalog, seed, weekStart: "2026-11-23" });

describe("catálogo", () => {
  it("todas las recetas usan ingredientes existentes con envases", () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    for (const r of RECIPES) for (const ri of r.ingredients) {
      expect(ids.has(ri.ingredientId), `${r.id} → ${ri.ingredientId}`).toBe(true);
      expect(BASE_PACKS[ri.ingredientId].packs.length).toBeGreaterThan(0);
    }
  });
  it("los pasos solo referencian ingredientes de la receta", () => {
    for (const r of RECIPES) {
      const own = new Set(r.ingredients.map((i) => i.ingredientId));
      for (const s of r.steps) for (const id of s.ingredientIds ?? []) expect(own.has(id), `${r.id} paso → ${id}`).toBe(true);
    }
  });
});

describe("envases completos", () => {
  it("450 g de brócoli → 1 paquete de 440 g (con pequeña falta)", () => {
    const r = choosePacks(450, productsFor(catalog, "brocoli"), "g")!;
    expect(r.packs).toHaveLength(1);
    expect(r.packs[0].count).toBe(1);
    expect(r.cost).toBeCloseTo(1.19);
    expect(r.shortfall).toBe(10);
  });
  it("240 g de cebolla → malla de 1 kg por 1,50 €", () => {
    const r = choosePacks(240, productsFor(catalog, "cebolla"), "g")!;
    expect(r.packs[0].packSize).toBe(1000);
    expect(r.cost).toBeCloseTo(1.5);
  });
  it("huevos: sin tolerancia y combinación eficiente", () => {
    const r = choosePacks(13, productsFor(catalog, "huevo"), "ud")!;
    expect(r.purchasedQty).toBeGreaterThanOrEqual(13);
    expect(r.cost).toBeCloseTo(2.55 + 1.35);
  });
});

describe("semana de demostración", () => {
  const plan = planFromRecipes(ctx(DEMO_PROFILE), DEMO_RECIPE_IDS);
  const list = buildShoppingList(plan, pantry, catalog);
  it("5 cenas de lunes a viernes para 3 personas", () => {
    expect(plan.meals).toHaveLength(5);
    expect(plan.meals.every((m) => m.slot === "cena" && m.servings === 3)).toBe(true);
  });
  it("coste en caja ≈ 45,64 € y menor que el presupuesto", () => {
    expect(list.checkoutTotal).toBeCloseTo(45.64, 2);
    expect(list.checkoutTotal).toBeLessThan(53);
  });
  it("suma ingredientes repetidos (cebolla, huevo, ajo)", () => {
    const needs = computeNeeds(plan);
    expect(needs.get("cebolla")!.qty).toBeCloseTo(3 * 40 + 3 * 60);
    expect(needs.get("huevo")!.qty).toBeCloseTo(3 + 3 + 6);
    expect(list.toBuy.filter((i) => i.ingredientId === "cebolla")).toHaveLength(1);
  });
  it("descuenta despensa: aceite y sal aparecen como 'lo tienes'", () => {
    expect(list.covered.map((c) => c.ingredientId)).toEqual(expect.arrayContaining(["aceite", "sal", "pimienta"]));
    expect(list.toBuy.find((i) => i.ingredientId === "aceite")).toBeUndefined();
    const noPantry = buildShoppingList(plan, [], catalog);
    expect(noPantry.checkoutTotal).toBeGreaterThan(list.checkoutTotal);
  });
  it("compra → despensa → cocinar descuenta", () => {
    let p = addPurchaseToPantry(pantry, list, "2026-11-22");
    const after = buildShoppingList(plan, p, catalog);
    expect(after.toBuy).toHaveLength(0);
    const needs = new Map();
    const chuletas = getRecipe("chuletas-cerdo-ajillo")!;
    for (const ri of chuletas.ingredients) needs.set(ri.ingredientId, { qty: ri.perServing * 3, recipeIds: [] });
    p = consumeFromPantry(p, needs);
    const brocoli = p.filter((x) => x.ingredientId === "brocoli");
    expect(brocoli).toHaveLength(0); // 440 g comprados, 450 consumidos → agotado
    const patata = p.find((x) => x.ingredientId === "patata")!;
    expect(patata.quantity).toBe(2000 - 600);
  });
});

describe("restricciones", () => {
  it("las alergias descartan recetas siempre", () => {
    const profile: Profile = { ...DEMO_PROFILE, allergens: ["huevos", "pescado"] };
    const { plan } = generateWeek(ctx(profile));
    for (const m of plan.meals) {
      const r = getRecipe(m.recipeId)!;
      expect(recipeAllergens(r)).not.toContain("huevos");
      expect(recipeAllergens(r)).not.toContain("pescado");
    }
  });
  it("vegana solo usa recetas veganas", () => {
    const profile: Profile = { ...DEMO_PROFILE, diet: "vegana", appliances: ["fuegos", "batidora"] };
    const { plan } = generateWeek(ctx(profile));
    for (const m of plan.meals) expect(recipeDiets(getRecipe(m.recipeId)!)).toContain("vegana");
  });
  it("lo que no marcas no entra (sin cerdo)", () => {
    const profile: Profile = { ...DEMO_PROFILE, meats: ["pollo", "pescado"] };
    for (let seed = 1; seed < 6; seed++) {
      const { plan } = generateWeek(ctx(profile, seed));
      for (const m of plan.meals) expect(checkRecipe(getRecipe(m.recipeId)!, profile)).toEqual([]);
    }
  });
  it("sin olla a presión no aparece la ternera exprés", () => {
    expect(checkRecipe(getRecipe("ternera-guisada")!, DEMO_PROFILE).some((i) => i.type === "appliance")).toBe(true);
  });
  it("sin recetas compatibles lanza error con sugerencias", () => {
    const profile: Profile = { ...DEMO_PROFILE, diet: "vegana", allergens: ["gluten", "soja", "sesamo", "apio", "mostaza"], dislikes: ["ajo", "cebolla", "pepino", "pimiento"] };
    expect(() => generateWeek(ctx(profile))).toThrow();
  });
});

describe("generador", () => {
  it("respeta días, franjas y presupuesto", () => {
    const profile: Profile = { ...DEMO_PROFILE, days: [1, 3, 6], meals: { comida: true, cena: true }, leftovers: "distintos" };
    const { plan, checkoutTotal } = generateWeek(ctx(profile));
    expect(plan.meals).toHaveLength(6);
    expect(new Set(plan.meals.map((m) => m.dayIndex))).toEqual(new Set([1, 3, 6]));
    expect(checkoutTotal).toBeLessThanOrEqual(53);
  });
  it("aprovechar sobras: la cena alimenta la comida siguiente con raciones dobles", () => {
    const profile: Profile = { ...DEMO_PROFILE, meals: { comida: true, cena: true }, leftovers: "aprovechar", budget: 90 };
    const { plan } = generateWeek(ctx(profile));
    const leftovers = plan.meals.filter((m) => m.kind === "leftover");
    expect(leftovers.length).toBeGreaterThan(0);
    for (const l of leftovers) {
      const dinner = plan.meals.find((m) => m.id === l.leftoverOfMealId)!;
      expect(dinner.servings).toBe(6);
      expect(dinner.recipeId).toBe(l.recipeId);
      expect(getRecipe(dinner.recipeId)!.leftoverFriendly).toBe(true);
    }
  });
  it("otra semana no repite exactamente las mismas recetas", () => {
    const a = generateWeek(ctx(DEMO_PROFILE, 11)).plan;
    const b = generateWeek({ ...ctx(DEMO_PROFILE, 12), avoidRecipeIds: a.meals.map((m) => m.recipeId) }).plan;
    expect(b.meals.map((m) => m.recipeId)).not.toEqual(a.meals.map((m) => m.recipeId));
  });
  it("cambiar un plato no modifica el resto", () => {
    const { plan } = generateWeek(ctx(DEMO_PROFILE, 3));
    const target = plan.meals[2];
    const alts = findAlternatives(plan, target.id, { profile: DEMO_PROFILE, pantry, catalog });
    expect(alts.length).toBeGreaterThan(0);
    const next = replaceRecipe(plan, target.id, alts[0].recipe.id);
    next.meals.forEach((m, i) => {
      if (i === 2) expect(m.recipeId).toBe(alts[0].recipe.id);
      else expect(m.recipeId).toBe(plan.meals[i].recipeId);
    });
  });
});

describe("medidas caseras", () => {
  it("convierte solo con equivalencias definidas", () => {
    expect(toHousehold(getIngredient("aceite"), 30)?.text).toMatch(/cucharadas/);
    expect(toHousehold(getIngredient("harina"), 125)?.text).toMatch(/taza/);
    expect(toHousehold(getIngredient("bacalao"), 450)).toBeNull();
  });
});
