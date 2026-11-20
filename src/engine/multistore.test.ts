import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { DEMO_RECIPE_IDS } from "@/data/recipes";
import { catalogsFor, getCatalogSync, storeIdsFor } from "@/services/prices/provider";
import { buildShoppingList } from "./shopping";
import { newPantryItem } from "./pantry";
import { generateWeek, planFromRecipes } from "./planner";
import type { PriceCatalog, Profile } from "@/domain/types";

const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const mercadona = getCatalogSync("mercadona");
const plan = planFromRecipes({ profile: DEMO_PROFILE, pantry, catalog: mercadona, seed: 1, weekStart: "2026-11-23" }, DEMO_RECIPE_IDS);
const multi = (ids: string[], minStoreSaving = 1) => buildShoppingList(plan, pantry, catalogsFor(ids), { minStoreSaving });

/** Catálogo ficticio con todo un 50 % más barato salvo lo que se indique. */
function discounted(base: PriceCatalog, id: string, factor: number): PriceCatalog {
  return { ...base, supermarketId: id, products: base.products.map((p) => ({ ...p, id: `${id}:${p.id}`, supermarketId: id, price: Math.round(p.price * factor * 100) / 100 })) };
}

describe("compra en varios supermercados", () => {
  it("un solo súper: igual que antes", () => {
    const one = buildShoppingList(plan, pantry, mercadona);
    expect(one.multiStore).toBe(false);
    expect(one.checkoutTotal).toBeCloseTo(45.64, 2);
    expect(one.stores).toEqual([{ supermarketId: "mercadona", total: 45.64, itemCount: one.toBuy.length }]);
  });

  it("repartir nunca cuesta más que todo en el principal", () => {
    for (const extra of ["lidl-es", "carrefour-es", "dia", "aldi-es", "alcampo"]) {
      const l = multi(["mercadona", extra]);
      expect(l.checkoutTotal).toBeLessThanOrEqual(l.singleStoreTotal + 1e-9);
      expect(l.singleStoreTotal).toBeCloseTo(45.64, 2);
    }
  });

  it("cada producto va al súper más barato entre los activos y el total cuadra", () => {
    const l = multi(["mercadona", "lidl-es", "aldi-es"], 0);
    for (const i of l.toBuy) {
      for (const alt of i.alternatives) expect(i.cost).toBeLessThanOrEqual(alt.cost + 0.001);
    }
    const sum = l.stores.reduce((s, st) => s + st.total, 0);
    expect(sum).toBeCloseTo(l.checkoutTotal, 2);
    expect(l.stores.reduce((s, st) => s + st.itemCount, 0)).toBe(l.toBuy.length);
    expect(l.stores[0].supermarketId).toBe("mercadona");
  });

  it("descarta un súper extra si el ahorro no compensa la parada", () => {
    const cheapish = discounted(mercadona, "lidl-es", 0.995); // ahorra céntimos
    const l = buildShoppingList(plan, pantry, [mercadona, cheapish], { minStoreSaving: 1 });
    expect(l.stores.map((s) => s.supermarketId)).toEqual(["mercadona"]);
    expect(l.skippedStores[0].supermarketId).toBe("lidl-es");
    expect(l.checkoutTotal).toBeCloseTo(45.64, 2);
  });

  it("si otro súper es mucho más barato, la compra se va allí", () => {
    const cheap = discounted(mercadona, "lidl-es", 0.5);
    const l = buildShoppingList(plan, pantry, [mercadona, cheap], { minStoreSaving: 1 });
    expect(l.stores.find((s) => s.supermarketId === "lidl-es")!.itemCount).toBe(l.toBuy.length);
    expect(l.checkoutTotal).toBeLessThan(l.singleStoreTotal * 0.6);
  });

  it("solo usa súper adicionales si el usuario reparte la compra y son del mismo país", () => {
    const base = { countryId: "es", supermarketId: "mercadona", extraSupermarkets: ["lidl-es", "tesco"] };
    expect(storeIdsFor({ ...base, multiStore: false })).toEqual(["mercadona"]);
    expect(storeIdsFor({ ...base, multiStore: true })).toEqual(["mercadona", "lidl-es"]);
  });

  it("el generador respeta el presupuesto con varios súper", () => {
    const profile: Profile = { ...DEMO_PROFILE, extraSupermarkets: ["lidl-es", "dia"], multiStore: true };
    const [catalog, ...extraCatalogs] = catalogsFor(storeIdsFor(profile));
    const { plan: p, checkoutTotal } = generateWeek({ profile, pantry, catalog, extraCatalogs, seed: 4, weekStart: "2026-11-23" });
    expect(p.meals).toHaveLength(5);
    expect(checkoutTotal).toBeLessThanOrEqual(53);
    const l = buildShoppingList(p, pantry, [catalog, ...extraCatalogs]);
    expect(l.checkoutTotal).toBeCloseTo(checkoutTotal, 2);
  });
});
