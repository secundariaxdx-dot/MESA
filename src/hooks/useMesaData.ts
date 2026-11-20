"use client";

import { useMemo } from "react";
import { useMesa } from "@/store/mesa";
import { catalogsFor, getCatalogSync } from "@/services/prices/provider";
import { shoppingSetup } from "@/engine/shoppingSetup";
import { buildShoppingList } from "@/engine/shopping";
import { wasteReport } from "@/engine/waste";
import { getCountry, getSupermarket } from "@/data/geo";

export function useCatalog() {
  const supermarketId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  return useMemo(() => getCatalogSync(supermarketId), [supermarketId]);
}

/**
 * Catálogos y opciones de compra: principal, adicionales si se reparte la
 * compra y supermercados de tus productos favoritos.
 */
export function useCatalogs() {
  const profile = useMesa((s) => s.profile);
  const myProducts = useMesa((s) => s.myProducts);
  const mainId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  return useMemo(() => {
    const { ids, opts } = shoppingSetup(profile, mainId, myProducts);
    const [catalog, ...extraCatalogs] = catalogsFor(ids);
    return { catalog, extraCatalogs, shopping: opts };
  }, [profile, mainId, myProducts]);
}

export function useShoppingList() {
  const plan = useMesa((s) => s.plan);
  const pantry = useMesa((s) => s.pantry);
  const { catalog, extraCatalogs, shopping } = useCatalogs();
  return useMemo(
    () => (plan ? buildShoppingList(plan, pantry, [catalog, ...extraCatalogs], shopping) : null),
    [plan, pantry, catalog, extraCatalogs, shopping],
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

/** Aprovechamiento de lo que se compra esta semana (sobrantes y lo que puede estropearse). */
export function useWasteReport() {
  const plan = useMesa((s) => s.plan);
  const pantry = useMesa((s) => s.pantry);
  const list = useShoppingList();
  const { catalog } = useCatalogs();
  return useMemo(() => (plan && list ? wasteReport(plan, list, pantry, catalog) : null), [plan, list, pantry, catalog]);
}
