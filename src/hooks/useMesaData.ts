"use client";

import { useMemo } from "react";
import { useMesa } from "@/store/mesa";
import { getCatalogSync } from "@/services/prices/provider";
import { buildShoppingList } from "@/engine/shopping";
import { getCountry, getSupermarket } from "@/data/geo";

export function useCatalog() {
  const supermarketId = useMesa((s) => s.plan?.supermarketId ?? s.profile.supermarketId);
  return useMemo(() => getCatalogSync(supermarketId), [supermarketId]);
}

export function useShoppingList() {
  const plan = useMesa((s) => s.plan);
  const pantry = useMesa((s) => s.pantry);
  const catalog = useCatalog();
  return useMemo(() => (plan ? buildShoppingList(plan, pantry, catalog) : null), [plan, pantry, catalog]);
}

export function useMarket() {
  const profile = useMesa((s) => s.profile);
  const plan = useMesa((s) => s.plan);
  const market = getSupermarket(plan?.supermarketId ?? profile.supermarketId);
  const country = getCountry(market.countryId);
  return { market, country, currency: country.currency };
}
