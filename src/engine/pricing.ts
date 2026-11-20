import type { PackChoice, PriceCatalog, Product } from "@/domain/types";

/**
 * Motor de envases completos.
 * Dada una necesidad (en unidad base) y los envases disponibles de un
 * supermercado, elige la combinación más barata que la cubra. Se admite una
 * pequeña tolerancia (por defecto 5 %) cuando un envase "casi" llega, como
 * ocurre en la vida real con 450 g de brócoli y un paquete de 440 g.
 */

export const SHORTFALL_TOLERANCE = 0.05;

export interface PackResult {
  packs: PackChoice[];
  purchasedQty: number;
  cost: number;
  shortfall: number;
  surplus: number;
}

export function productsFor(catalog: PriceCatalog, ingredientId: string): Product[] {
  return catalog.products.filter((p) => p.ingredientId === ingredientId && p.available !== false);
}

/** Precio por unidad base más barato (para costes proporcionales). */
export function unitPrice(catalog: PriceCatalog, ingredientId: string): number | null {
  const ps = productsFor(catalog, ingredientId);
  if (!ps.length) return null;
  return Math.min(...ps.map((p) => p.price / p.packSize));
}

export function choosePacks(need: number, products: Product[], unit: "g" | "ml" | "ud" = "g"): PackResult | null {
  if (need <= 0) return { packs: [], purchasedQty: 0, cost: 0, shortfall: 0, surplus: 0 };
  if (!products.length) return null;
  const ps = [...products].sort((a, b) => a.packSize - b.packSize).slice(0, 3);
  // Las unidades contadas (huevos, panes) no admiten tolerancia.
  const minAccept = unit === "ud" ? Math.ceil(need - 1e-9) : need * (1 - SHORTFALL_TOLERANCE);

  const maxCounts = ps.map((p) => Math.ceil(need / p.packSize) + 1);
  let best: { counts: number[]; cost: number; qty: number } | null = null;

  const counts = new Array(ps.length).fill(0);
  const visit = (i: number) => {
    if (i === ps.length) {
      const qty = counts.reduce((s, c, k) => s + c * ps[k].packSize, 0);
      if (qty < minAccept || qty === 0) return;
      const cost = counts.reduce((s, c, k) => s + c * ps[k].price, 0);
      if (
        !best ||
        cost < best.cost - 0.001 ||
        // Mismo coste: preferir cubrir del todo, luego menos sobrante.
        (Math.abs(cost - best.cost) <= 0.001 &&
          ((qty >= need && best.qty < need) || (qty >= need === best.qty >= need && qty < best.qty)))
      ) {
        best = { counts: [...counts], cost, qty };
      }
      return;
    }
    for (let c = 0; c <= maxCounts[i]; c++) {
      counts[i] = c;
      visit(i + 1);
    }
    counts[i] = 0;
  };
  visit(0);
  if (!best) return null;
  const b = best as { counts: number[]; cost: number; qty: number };

  const packs: PackChoice[] = b.counts
    .map((c, k) => ({ c, p: ps[k] }))
    .filter(({ c }) => c > 0)
    .map(({ c, p }) => ({
      productId: p.id,
      productName: p.name,
      packSize: p.packSize,
      packLabel: p.packLabel,
      unitPrice: p.price,
      count: c,
    }));

  return {
    packs,
    purchasedQty: b.qty,
    cost: Math.round(b.cost * 100) / 100,
    shortfall: Math.max(0, need - b.qty),
    surplus: Math.max(0, b.qty - need),
  };
}
