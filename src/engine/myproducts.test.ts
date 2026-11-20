import { describe, expect, it } from "vitest";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE } from "@/data/demo";
import { DEMO_RECIPE_IDS } from "@/data/recipes";
import { catalogsFor, getCatalogSync } from "@/services/prices/provider";
import { buildShoppingList } from "./shopping";
import { addPurchaseToPantry, newPantryItem } from "./pantry";
import { planFromRecipes } from "./planner";
import { shoppingSetup } from "./shoppingSetup";
import type { MyProduct, Profile } from "@/domain/types";

const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
const plan = planFromRecipes({ profile: DEMO_PROFILE, pantry, catalog: getCatalogSync("mercadona"), seed: 1, weekStart: "2026-11-23" }, DEMO_RECIPE_IDS);
const mk = (p: Partial<MyProduct>): MyProduct => ({ id: "x", name: "x", supermarketId: "mercadona", ingredientId: null, price: null, quantity: 1, aisle: "fruta-verdura", inList: true, createdAt: "2026-11-20", ...p });
const listFor = (profile: Profile, mine: MyProduct[]) => {
  const { ids, opts } = shoppingSetup(profile, profile.supermarketId, mine);
  return buildShoppingList(plan, pantry, catalogsFor(ids), opts);
};

describe("mis productos", () => {
  it("un producto propio (guacamole de Mercadona) va a la lista y suma al total", () => {
    const base = listFor(DEMO_PROFILE, []);
    const l = listFor(DEMO_PROFILE, [mk({ id: "g", name: "Guacamole", price: 2.35, quantity: 2 })]);
    const g = l.toBuy.find((i) => i.ingredientId === "fav:g")!;
    expect(g.supermarketId).toBe("mercadona");
    expect(g.cost).toBeCloseTo(4.7);
    expect(l.checkoutTotal).toBeCloseTo(base.checkoutTotal + 4.7, 2);
  });

  it("si no está en la lista esta semana, no aparece", () => {
    const l = listFor(DEMO_PROFILE, [mk({ id: "g", name: "Guacamole", price: 2.35, inList: false })]);
    expect(l.toBuy.some((i) => i.custom)).toBe(false);
  });

  it("un producto propio de otro súper añade esa parada aunque no repartas la compra", () => {
    const l = listFor(DEMO_PROFILE, [mk({ id: "h", name: "Hummus de la casa", supermarketId: "lidl-es", price: 1.5 })]);
    expect(l.stores.map((s) => s.supermarketId)).toEqual(["mercadona", "lidl-es"]);
    expect(l.stores[1].itemCount).toBe(1);
    // el resto sigue todo en Mercadona
    expect(l.toBuy.filter((i) => !i.custom).every((i) => i.supermarketId === "mercadona")).toBe(true);
  });

  it("un ingrediente favorito se compra siempre en su súper, aunque sea más caro", () => {
    const profile: Profile = { ...DEMO_PROFILE, extraSupermarkets: ["dia", "eroski"], multiStore: true };
    const free = listFor(profile, []);
    const atunWhere = free.toBuy.find((i) => i.ingredientId === "atun")!.supermarketId;
    const forced = atunWhere === "eroski" ? "mercadona" : "eroski";
    const l = listFor(profile, [mk({ id: "a", name: "Atún", ingredientId: "atun", supermarketId: forced })]);
    const atun = l.toBuy.find((i) => i.ingredientId === "atun")!;
    expect(atun.supermarketId).toBe(forced);
    expect(atun.pinned).toBe(true);
    // la poda nunca elimina un súper con favoritos
    expect(l.stores.some((s) => s.supermarketId === forced)).toBe(true);
  });

  it("al registrar la compra, el producto propio pasa a la despensa por nombre", () => {
    const l = listFor(DEMO_PROFILE, [mk({ id: "g", name: "Guacamole", price: 2.35, quantity: 1 })]);
    const p = addPurchaseToPantry(pantry, l, "2026-11-22");
    expect(p.find((x) => x.name === "Guacamole")).toMatchObject({ ingredientId: null, quantity: 1 });
  });

  it("los productos de otro país se ignoran", () => {
    const l = listFor(DEMO_PROFILE, [mk({ id: "t", name: "Tea", supermarketId: "tesco", price: 1 })]);
    expect(l.toBuy.some((i) => i.custom)).toBe(false);
  });
});
