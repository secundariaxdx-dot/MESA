import type { PriceCatalog, Product } from "@/domain/types";
import { BASE_PACKS, INGREDIENTS } from "@/data/ingredients";
import { getCountry, getSupermarket } from "@/data/geo";

/**
 * Arquitectura de proveedores de precios.
 *
 * Un PriceProvider entrega el catálogo de envases de un supermercado.
 * La v1 incluye únicamente DemoPriceProvider (datos ficticios, configurables
 * en data/ingredients.ts). Para conectar un catálogo real (API autorizada,
 * feed del distribuidor, scraping con permiso...) basta con implementar esta
 * interfaz y registrarla en PROVIDERS. El resto de la app no cambia.
 */
export interface PriceProvider {
  id: string;
  label: string;
  isDemo: boolean;
  supports(supermarketId: string): boolean;
  getCatalog(supermarketId: string): Promise<PriceCatalog>;
}

export const DEMO_REFERENCE_DATE = "2026-11-02";
export const DEMO_SOURCE = "Catálogo de demostración de MESA · precios ficticios";

/** Hash determinista pequeño (FNV-1a) para variar precios entre supermercados. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const UNIT_LABEL = { g: "kg", ml: "l", ud: "ud" } as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Supermercado de referencia: sus precios son exactamente los del catálogo base. */
const REFERENCE_MARKET = "mercadona";

function buildDemoCatalog(supermarketId: string): PriceCatalog {
  const market = getSupermarket(supermarketId);
  const country = getCountry(market.countryId);
  const products: Product[] = [];

  for (const ing of INGREDIENTS) {
    const base = BASE_PACKS[ing.id];
    if (!base) continue;
    base.packs.forEach((pack, idx) => {
      const h = hash(`${ing.id}:${supermarketId}:${idx}`);
      const isRef = supermarketId === REFERENCE_MARKET;
      const jitter = isRef ? 1 : 0.9 + (h % 21) / 100; // 0.90 – 1.10
      // Algunas cadenas tienen otro formato de envase (±25 %).
      let size = pack.size;
      if (!isRef && ing.unit !== "ud" && h % 6 === 0 && size >= 300) {
        size = Math.round((size * (h % 2 === 0 ? 0.75 : 1.25)) / 10) * 10;
      }
      const sizeFactor = size / pack.size;
      // Envases más pequeños salen algo más caros por kilo, y viceversa.
      const formatPremium = sizeFactor < 1 ? 1.06 : sizeFactor > 1 ? 0.96 : 1;
      const price = round2(pack.price * sizeFactor * formatPremium * jitter * market.priceFactor * country.priceLevel);
      const perUnitBase = ing.unit === "ud" ? price / size : (price / size) * 1000;
      products.push({
        id: `${supermarketId}:${ing.id}:${idx}`,
        name: base.productName,
        brand: "Marca propia",
        supermarketId,
        ingredientId: ing.id,
        category: ing.aisle,
        packSize: size,
        unit: ing.unit,
        packLabel: pack.label,
        price,
        pricePerUnit: round2(perUnitBase),
        pricePerUnitLabel: `/${UNIT_LABEL[ing.unit]}`,
        updatedAt: DEMO_REFERENCE_DATE,
        source: DEMO_SOURCE,
        // Disponibilidad desconocida en datos de demostración.
        available: null,
      });
    });
  }

  return {
    supermarketId,
    currency: country.currency,
    referenceDate: DEMO_REFERENCE_DATE,
    source: DEMO_SOURCE,
    isDemo: true,
    products,
  };
}

const cache = new Map<string, PriceCatalog>();

export const DemoPriceProvider: PriceProvider = {
  id: "demo",
  label: "Precios de demostración",
  isDemo: true,
  supports: () => true,
  async getCatalog(supermarketId) {
    return getCatalogSync(supermarketId);
  },
};

/** Lugar para registrar proveedores reales en el futuro (orden de prioridad). */
const PROVIDERS: PriceProvider[] = [DemoPriceProvider];

export function providerFor(supermarketId: string): PriceProvider {
  return PROVIDERS.find((p) => p.supports(supermarketId)) ?? DemoPriceProvider;
}

/** Acceso síncrono para el catálogo de demostración (cálculos en la UI). */
export function getCatalogSync(supermarketId: string): PriceCatalog {
  let c = cache.get(supermarketId);
  if (!c) {
    c = buildDemoCatalog(supermarketId);
    cache.set(supermarketId, c);
  }
  return c;
}
