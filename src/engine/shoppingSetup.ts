import type { MyProduct, Profile } from "@/domain/types";
import { getSupermarket } from "@/data/geo";
import { minStoreSavingFor, storeIdsFor } from "@/services/prices/provider";
import type { ShoppingOptions } from "./shopping";

/**
 * Qué supermercados y opciones usar para calcular la compra:
 *  - general: el principal (+ adicionales si se reparte la compra)
 *  - pinned: ingredientes que te gustan de un súper concreto
 *  - extras: productos propios que van a la lista cada semana
 * Solo se tienen en cuenta supermercados del mismo país (misma moneda).
 */
export function shoppingSetup(profile: Profile, mainId: string, myProducts: MyProduct[] = []): { ids: string[]; opts: ShoppingOptions } {
  const country = getSupermarket(mainId).countryId;
  const general = storeIdsFor(profile, mainId);
  const mine = myProducts.filter((p) => getSupermarket(p.supermarketId).countryId === country);
  const pinned: Record<string, string> = {};
  for (const p of mine) if (p.ingredientId) pinned[p.ingredientId] = p.supermarketId;
  const extras = mine
    .filter((p) => !p.ingredientId && p.inList)
    .map((p) => ({ id: p.id, name: p.name, supermarketId: p.supermarketId, price: p.price, quantity: p.quantity, aisle: p.aisle }));
  const ids = [...new Set([...general, ...Object.values(pinned)])];
  return { ids, opts: { general, pinned, extras, minStoreSaving: minStoreSavingFor(mainId) } };
}
