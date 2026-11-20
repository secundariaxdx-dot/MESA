import type { PantryItem, ShoppingList } from "@/domain/types";
import { findIngredient, getIngredient } from "@/data/ingredients";
import { addDays, daysBetween, todayISO } from "./dates";
import type { Need } from "./shopping";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function newPantryItem(ingredientId: string | null, name: string, quantity: number | null, opts: Partial<PantryItem> = {}): PantryItem {
  const ing = findIngredient(ingredientId);
  return {
    id: uid("p"),
    ingredientId,
    name: ing?.name ?? name,
    quantity,
    unit: ing?.unit ?? "ud",
    status: "ok",
    source: "manual",
    addedAt: todayISO(),
    ...opts,
  };
}

/** Añade a la despensa los envases comprados (con caducidad orientativa). */
export function addPurchaseToPantry(pantry: PantryItem[], list: ShoppingList, date = todayISO()): PantryItem[] {
  const added = list.toBuy
    .filter((i) => i.purchasedQty > 0)
    .map((i) =>
      i.custom
        ? // Producto propio (p. ej. guacamole): se guarda por nombre, sin caducidad conocida.
          newPantryItem(null, i.name, i.purchasedQty, { source: "compra", addedAt: date })
        : newPantryItem(i.ingredientId, i.name, i.purchasedQty, {
            source: "compra",
            addedAt: date,
            expiresAt: addDays(date, getIngredient(i.ingredientId).shelfLifeDays),
          }),
    );
  return [...pantry, ...added];
}

/**
 * Descuenta de la despensa lo que consume una receta cocinada.
 * Los productos marcados como "tengo suficiente" (cantidad null) no se tocan.
 * Se consume primero lo que caduca antes.
 */
export function consumeFromPantry(pantry: PantryItem[], needs: Map<string, Need>): PantryItem[] {
  let items = pantry.map((p) => ({ ...p }));
  for (const [ingredientId, need] of needs) {
    const lots = items
      .filter((p) => p.ingredientId === ingredientId && p.status === "ok")
      .sort((a, b) => (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999"));
    if (lots.some((l) => l.quantity === null)) continue;
    let left = need.qty;
    for (const lot of lots) {
      if (left <= 0) break;
      const take = Math.min(left, lot.quantity ?? 0);
      lot.quantity = (lot.quantity ?? 0) - take;
      left -= take;
      if ((lot.quantity ?? 0) <= 0.5) {
        lot.quantity = 0;
        lot.status = "agotado";
      }
    }
  }
  // Los lotes de compra agotados desaparecen; los manuales se quedan como "agotado".
  items = items.filter((p) => !(p.source === "compra" && p.status === "agotado"));
  return items;
}

export function expiringSoon(pantry: PantryItem[], withinDays = 3, today = todayISO()): PantryItem[] {
  return pantry
    .filter((p) => p.status === "ok" && p.expiresAt && daysBetween(today, p.expiresAt) <= withinDays)
    .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""));
}

export function daysLeft(p: PantryItem, today = todayISO()): number | null {
  return p.expiresAt ? daysBetween(today, p.expiresAt) : null;
}
