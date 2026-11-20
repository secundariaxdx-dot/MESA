"use client";

import { useMemo } from "react";
import { useMesa } from "@/store/mesa";
import { catalogsFor, getCatalogSync, minStoreSavingFor, storeIdsFor } from "@/services/prices/provider";
import { buildShoppingList } from "@/engine/shopping";
import { getCountry, getSupermarket } from "@/data/geo";

export function useCatalog() {
  const supermarketId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  return useMemo(() => getCatalogSync(supermarketId), [supermarketId]);
}

/** Supermercados con los que se calcula la compra (principal primero). */
export function useStoreIds() {
  const profile = useMesa((s) => s.profile);
  const mainId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  const key = storeIdsFor(profile, mainId).join("|");
  return useMemo(() => key.split("|"), [key]);
}

/** Catálogo principal + adicionales cuando la compra se reparte, y el umbral de ahorro. */
export function useCatalogs() {
  const ids = useStoreIds();
  return useMemo(() => {
    const [catalog, ...extraCatalogs] = catalogsFor(ids);
    return { catalog, extraCatalogs, minStoreSaving: minStoreSavingFor(ids[0]) };
  }, [ids]);
}

export function useShoppingList() {
  const plan = useMesa((s) => s.plan);
  const pantry = useMesa((s) => s.pantry);
  const { catalog, extraCatalogs, minStoreSaving } = useCatalogs();
  return useMemo(
    () => (plan ? buildShoppingList(plan, pantry, [catalog, ...extraCatalogs], { minStoreSaving }) : null),
    [plan, pantry, catalog, extraCatalogs, minStoreSaving],
  );
}

export function useMarket() {
  const profile = useMesa((s) => s.profile);
  const plan = useMesa((s) => s.plan);
  const market = getSupermarket(plan?.supermarketId ?? profile.supermarketId);
  const country = getCountry(market.countryId);
  return { market, country, currency: country.currency };
}

/** "Mercadona", "Mercadona y Lidl", "Mercadona, Lidl y DIA". */
export function storeNames(ids: string[]): string {
  const names = ids.map((id) => getSupermarket(id).name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
