import type { PantryItem, PriceCatalog, Recipe, ShoppingItem, ShoppingList, WeekPlan } from "@/domain/types";
import { getIngredient } from "@/data/ingredients";
import { getRecipe } from "@/data/recipes";
import { choosePacks, productsFor, SHORTFALL_TOLERANCE, unitPrice } from "./pricing";

export interface Need {
  qty: number;
  recipeIds: string[];
}

/** Cantidad de un ingrediente para una receta y nº de raciones. */
export function ingredientQty(perServing: number, servings: number, portionFactor = 1): number {
  return perServing * servings * portionFactor;
}

/**
 * Suma las necesidades de todas las comidas pendientes de cocinar.
 * Los ingredientes repetidos en varias recetas se agregan ANTES de elegir envases.
 */
export function computeNeeds(plan: WeekPlan): Map<string, Need> {
  const needs = new Map<string, Need>();
  for (const meal of plan.meals) {
    if (meal.kind !== "cook" || meal.status !== "planned") continue;
    const recipe = getRecipe(meal.recipeId);
    if (!recipe) continue;
    addRecipeNeeds(needs, recipe, meal.servings, plan.portionFactor);
  }
  return needs;
}

export function addRecipeNeeds(needs: Map<string, Need>, recipe: Recipe, servings: number, portionFactor = 1) {
  for (const ri of recipe.ingredients) {
    if (ri.optional) continue;
    const q = ingredientQty(ri.perServing, servings, portionFactor);
    const n = needs.get(ri.ingredientId) ?? { qty: 0, recipeIds: [] };
    n.qty += q;
    if (!n.recipeIds.includes(recipe.id)) n.recipeIds.push(recipe.id);
    needs.set(ri.ingredientId, n);
  }
}

/** Cantidad disponible en despensa (Infinity si está marcado "tengo suficiente"). */
export function pantryAvailable(pantry: PantryItem[], ingredientId: string): number {
  let total = 0;
  for (const p of pantry) {
    if (p.ingredientId !== ingredientId || p.status !== "ok") continue;
    if (p.quantity === null) return Infinity;
    total += p.quantity;
  }
  return total;
}

export function buildShoppingList(plan: WeekPlan, pantry: PantryItem[], catalog: PriceCatalog): ShoppingList {
  const needs = computeNeeds(plan);
  const toBuy: ShoppingItem[] = [];
  const covered: ShoppingItem[] = [];
  let checkoutTotal = 0;
  let consumedTotal = 0;
  let pantrySavings = 0;

  for (const [ingredientId, need] of needs) {
    const ing = getIngredient(ingredientId);
    const available = pantryAvailable(pantry, ingredientId);
    const fromPantry = Math.min(need.qty, available);
    const remaining = Math.max(0, need.qty - fromPantry);
    const up = unitPrice(catalog, ingredientId) ?? 0;
    const consumedCost = need.qty * up;
    consumedTotal += consumedCost;

    const base: ShoppingItem = {
      ingredientId,
      name: ing.name,
      icon: ing.icon,
      aisle: ing.aisle,
      unit: ing.unit,
      needed: need.qty,
      fromPantry,
      toBuy: remaining,
      packs: [],
      purchasedQty: 0,
      cost: 0,
      consumedCost,
      shortfall: 0,
      surplus: 0,
      recipeIds: need.recipeIds,
    };

    const products = productsFor(catalog, ingredientId);
    // Lo que costaría sin despensa, para calcular el ahorro.
    if (fromPantry > 0) {
      const full = choosePacks(need.qty, products, ing.unit);
      const part = choosePacks(remaining, products, ing.unit);
      pantrySavings += (full?.cost ?? 0) - (part?.cost ?? 0);
    }

    if (remaining <= 1e-6 || (ing.unit !== "ud" && (remaining < 0.5 || (fromPantry > 0 && remaining <= need.qty * SHORTFALL_TOLERANCE)))) {
      covered.push(base);
      continue;
    }
    const res = choosePacks(remaining, products, ing.unit);
    if (!res) {
      toBuy.push({ ...base, missingProduct: true });
      continue;
    }
    checkoutTotal += res.cost;
    toBuy.push({ ...base, packs: res.packs, purchasedQty: res.purchasedQty, cost: res.cost, shortfall: res.shortfall, surplus: res.surplus });
  }

  toBuy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  covered.sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    planId: plan.id,
    supermarketId: catalog.supermarketId,
    currency: catalog.currency,
    referenceDate: catalog.referenceDate,
    isDemoPrices: catalog.isDemo,
    toBuy,
    covered,
    checkoutTotal: Math.round(checkoutTotal * 100) / 100,
    consumedTotal: Math.round(consumedTotal * 100) / 100,
    pantrySavings: Math.round(pantrySavings * 100) / 100,
  };
}

/** Coste proporcional de consumir una receta (no lo que se paga en caja). */
export function recipeCost(recipe: Recipe, servings: number, catalog: PriceCatalog, portionFactor = 1) {
  const lines = recipe.ingredients.map((ri) => {
    const qty = ingredientQty(ri.perServing, servings, portionFactor);
    const up = unitPrice(catalog, ri.ingredientId);
    return { ingredientId: ri.ingredientId, qty, cost: up === null ? null : qty * up };
  });
  const total = lines.reduce((s, l) => s + (l.cost ?? 0), 0);
  return { lines, total, perServing: servings > 0 ? total / servings : 0 };
}

/** Coste en caja de una lista de recetas sueltas (para el optimizador). */
export function quickCheckoutTotal(plan: WeekPlan, pantry: PantryItem[], catalog: PriceCatalog): number {
  return buildShoppingList(plan, pantry, catalog).checkoutTotal;
}
