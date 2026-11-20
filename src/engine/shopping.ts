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

export interface ShoppingOptions {
  /**
   * Ahorro mínimo (en la moneda del país) para que compense ir a un
   * supermercado adicional. Por debajo, sus productos vuelven al resto.
   */
  minStoreSaving?: number;
  /**
   * Supermercados donde puede ir cualquier producto (el principal y, si se
   * reparte la compra, los adicionales). Por defecto, todos los catálogos.
   */
  general?: string[];
  /** Ingrediente → supermercado favorito: se compra siempre allí. */
  pinned?: Record<string, string>;
  /** Productos propios del usuario que van a la lista (p. ej. «guacamole de Mercadona»). */
  extras?: ExtraProduct[];
}

export interface ExtraProduct {
  id: string;
  name: string;
  supermarketId: string;
  price: number | null;
  quantity: number;
  aisle: ShoppingItem["aisle"];
}

type Option = { supermarketId: string; packs: ReturnType<typeof choosePacks> & object };

/**
 * Construye la lista de la compra con envases completos.
 *
 * Con un catálogo: todo en ese supermercado.
 * Con varios (el primero es el principal): cada producto va al supermercado
 * donde sus envases salen más baratos. Después se descarta cualquier
 * supermercado adicional cuyo ahorro total no llegue a `minStoreSaving`
 * (no compensa la parada) y sus productos se reasignan.
 */
export function buildShoppingList(
  plan: WeekPlan,
  pantry: PantryItem[],
  catalogOrCatalogs: PriceCatalog | PriceCatalog[],
  opts: ShoppingOptions = {},
): ShoppingList {
  const catalogs = Array.isArray(catalogOrCatalogs) ? catalogOrCatalogs : [catalogOrCatalogs];
  const main = catalogs[0];
  const general = new Set(opts.general ?? catalogs.map((c) => c.supermarketId));
  general.add(main.supermarketId);
  const pinned = opts.pinned ?? {};
  const extras = (opts.extras ?? []).filter((e) => e.quantity > 0);
  const minSaving = opts.minStoreSaving ?? 1;
  const needs = computeNeeds(plan);
  const covered: ShoppingItem[] = [];
  const pending: { base: Omit<ShoppingItem, "supermarketId" | "alternatives">; options: Option[]; pin?: string }[] = [];
  let pantrySavings = 0;

  for (const [ingredientId, need] of needs) {
    const ing = getIngredient(ingredientId);
    const available = pantryAvailable(pantry, ingredientId);
    const fromPantry = Math.min(need.qty, available);
    const remaining = Math.max(0, need.qty - fromPantry);

    const base: Omit<ShoppingItem, "supermarketId" | "alternatives"> = {
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
      consumedCost: need.qty * (unitPrice(main, ingredientId) ?? 0),
      shortfall: 0,
      surplus: 0,
      recipeIds: need.recipeIds,
    };

    const mainProducts = productsFor(main, ingredientId);
    // Lo que costaría sin despensa (en el súper principal), para calcular el ahorro.
    if (fromPantry > 0) {
      const full = choosePacks(need.qty, mainProducts, ing.unit);
      const part = choosePacks(remaining, mainProducts, ing.unit);
      pantrySavings += (full?.cost ?? 0) - (part?.cost ?? 0);
    }

    if (remaining <= 1e-6 || (ing.unit !== "ud" && (remaining < 0.5 || (fromPantry > 0 && remaining <= need.qty * SHORTFALL_TOLERANCE)))) {
      covered.push({ ...base, supermarketId: main.supermarketId, alternatives: [] });
      continue;
    }
    const options: Option[] = [];
    for (const c of catalogs) {
      const res = choosePacks(remaining, productsFor(c, ingredientId), ing.unit);
      if (res) options.push({ supermarketId: c.supermarketId, packs: res });
    }
    const pin = pinned[ingredientId];
    pending.push({ base, options, pin: pin && options.some((o) => o.supermarketId === pin) ? pin : undefined });
  }

  // Los productos favoritos fijan su supermercado: ese súper nunca se descarta.
  const locked = new Set<string>([
    ...pending.filter((p) => p.pin).map((p) => p.pin!),
    ...extras.map((e) => e.supermarketId),
  ]);
  const extrasCost = extras.reduce((sum, e) => sum + (e.price ?? 0) * e.quantity, 0);

  // Lo que costaría todo en el principal (referencia para el ahorro).
  let singleStoreTotal = extrasCost;
  for (const p of pending) {
    const at = p.pin ?? main.supermarketId;
    singleStoreTotal += p.options.find((o) => o.supermarketId === at)?.packs.cost ?? 0;
  }

  // Asignación: el más barato entre los supermercados activos (empate → el principal).
  const active = new Set([...general].filter((id) => catalogs.some((c) => c.supermarketId === id)));
  const order = catalogs.map((c) => c.supermarketId);
  const pick = (options: Option[], pin?: string) => {
    if (pin) return options.find((o) => o.supermarketId === pin);
    let best: Option | undefined;
    for (const o of options) {
      if (!active.has(o.supermarketId)) continue;
      if (!best || o.packs.cost < best.packs.cost - 0.001) best = o;
    }
    return best;
  };
  const skippedStores: ShoppingList["skippedStores"] = [];
  if (active.size > 1) {
    // Poda: quitamos el supermercado adicional que menos ahorra mientras no llegue al mínimo.
    for (;;) {
      let worst: { id: string; saving: number } | null = null;
      for (const id of order.slice(1)) {
        if (!active.has(id) || locked.has(id)) continue;
        let saving = 0;
        let used = false;
        for (const p of pending) {
          if (p.pin) continue;
          const chosen = pick(p.options);
          if (chosen?.supermarketId !== id) continue;
          used = true;
          active.delete(id);
          const fallback = pick(p.options);
          active.add(id);
          saving += (fallback?.packs.cost ?? Infinity) - chosen.packs.cost;
        }
        if (!used) continue;
        if (!worst || saving < worst.saving) worst = { id, saving };
      }
      if (!worst || worst.saving >= minSaving) break;
      active.delete(worst.id);
      skippedStores.push({ supermarketId: worst.id, saving: Math.round(worst.saving * 100) / 100 });
    }
  }

  const toBuy: ShoppingItem[] = [];
  let checkoutTotal = 0;
  for (const { base, options, pin } of pending) {
    const chosen = pick(options, pin);
    const alternatives = options
      .filter((o) => o.supermarketId !== chosen?.supermarketId)
      .map((o) => ({ supermarketId: o.supermarketId, cost: o.packs.cost }));
    if (!chosen) {
      toBuy.push({ ...base, missingProduct: true, supermarketId: main.supermarketId, alternatives });
      continue;
    }
    const r = chosen.packs;
    checkoutTotal += r.cost;
    const catalog = catalogs.find((c) => c.supermarketId === chosen.supermarketId)!;
    toBuy.push({
      ...base,
      consumedCost: base.needed * (unitPrice(catalog, base.ingredientId) ?? 0),
      packs: r.packs,
      purchasedQty: r.purchasedQty,
      cost: r.cost,
      shortfall: r.shortfall,
      surplus: r.surplus,
      supermarketId: chosen.supermarketId,
      alternatives,
      pinned: Boolean(pin),
    });
  }

  for (const e of extras) {
    const cost = Math.round((e.price ?? 0) * e.quantity * 100) / 100;
    checkoutTotal += cost;
    toBuy.push({
      ingredientId: `fav:${e.id}`,
      name: e.name,
      icon: "⭐",
      aisle: e.aisle,
      unit: "ud",
      needed: e.quantity,
      fromPantry: 0,
      toBuy: e.quantity,
      packs: [{ productId: e.id, productName: e.name, packSize: 1, packLabel: "ud", unitPrice: e.price ?? 0, count: e.quantity }],
      purchasedQty: e.quantity,
      cost,
      consumedCost: cost,
      shortfall: 0,
      surplus: 0,
      recipeIds: [],
      supermarketId: e.supermarketId,
      alternatives: [],
      pinned: true,
      custom: true,
      priceUnknown: e.price === null,
    });
  }

  toBuy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  covered.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const storeIds = [...new Set([...order, ...extras.map((e) => e.supermarketId)])];
  const stores = storeIds
    .map((id) => {
      const items = toBuy.filter((i) => i.supermarketId === id);
      return { supermarketId: id, total: Math.round(items.reduce((s, i) => s + i.cost, 0) * 100) / 100, itemCount: items.length };
    })
    .filter((s, i) => s.itemCount > 0 || i === 0);
  const consumedTotal = [...toBuy, ...covered].reduce((s, i) => s + i.consumedCost, 0);

  return {
    planId: plan.id,
    supermarketId: main.supermarketId,
    currency: main.currency,
    referenceDate: main.referenceDate,
    isDemoPrices: catalogs.some((c) => c.isDemo),
    realPriceStores: catalogs.filter((c) => !c.isDemo).map((c) => c.supermarketId),
    toBuy,
    covered,
    checkoutTotal: Math.round(checkoutTotal * 100) / 100,
    consumedTotal: Math.round(consumedTotal * 100) / 100,
    pantrySavings: Math.round(pantrySavings * 100) / 100,
    multiStore: storeIds.length > 1,
    stores,
    singleStoreTotal: Math.round(singleStoreTotal * 100) / 100,
    skippedStores,
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


