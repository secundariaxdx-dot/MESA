"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useMesa } from "@/store/mesa";
import { catalogsFor, ensureRemotePrices, getCatalogSync, pricesVersion, subscribePrices } from "@/services/prices/provider";
import { shoppingSetup } from "@/engine/shoppingSetup";
import { buildShoppingList } from "@/engine/shopping";
import { wasteReport } from "@/engine/waste";
import { getCountry, getSupermarket } from "@/data/geo";

/** Se incrementa cuando llegan precios reales: fuerza a recalcular la compra. */
export function usePricesVersion() {
  const v = useSyncExternalStore(subscribePrices, pricesVersion, () => 0);
  useEffect(() => {
    ensureRemotePrices();
  }, []);
  return v;
}

export function useCatalog() {
  const supermarketId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  const v = usePricesVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getCatalogSync(supermarketId), [supermarketId, v]);
}

/**
 * Catálogos y opciones de compra: principal, adicionales si se reparte la
 * compra y supermercados de tus productos favoritos.
 */
export function useCatalogs() {
  const profile = useMesa((s) => s.profile);
  const myProducts = useMesa((s) => s.myProducts);
  const mainId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  const v = usePricesVersion();
  return useMemo(() => {
    const { ids, opts } = shoppingSetup(profile, mainId, myProducts);
    const [catalog, ...extraCatalogs] = catalogsFor(ids);
    return { catalog, extraCatalogs, shopping: opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, mainId, myProducts, v]);
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

/** Texto de origen de los precios de una lista: reales (web del súper) o estimados. */
export function priceSourceText(list: { realPriceStores: string[]; stores: { supermarketId: string; itemCount: number }[]; referenceDate: string; isDemoPrices: boolean }): string {
  const used = list.stores.filter((s) => s.itemCount > 0).map((s) => s.supermarketId);
  const real = used.filter((id) => list.realPriceStores.includes(id));
  const estimated = used.filter((id) => !list.realPriceStores.includes(id));
  const [y, m, d] = list.referenceDate.split("-");
  if (!real.length) return "Precios estimados (no oficiales): aún no hay precios descargados de este supermercado";
  return `Precios de la web de ${storeNames(real)} del ${d}/${m}/${y}${estimated.length ? ` · ${storeNames(estimated)}: estimados` : ""}`;
}
