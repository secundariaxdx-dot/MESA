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

/** Precios reales descargados de la web del súper (si existen para ese súper). */
export const RemotePriceProvider: PriceProvider = {
  id: "web",
  label: "Precios de la web del supermercado",
  isDemo: false,
  supports: (supermarketId) => remote.has(supermarketId),
  async getCatalog(supermarketId) {
    await ensureRemotePrices();
    return getCatalogSync(supermarketId);
  },
};

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
const PROVIDERS: PriceProvider[] = [RemotePriceProvider, DemoPriceProvider];

export function providerFor(supermarketId: string): PriceProvider {
  return PROVIDERS.find((p) => p.supports(supermarketId)) ?? DemoPriceProvider;
}

/** Acceso síncrono para el catálogo de demostración (cálculos en la UI). */
export function getCatalogSync(supermarketId: string): PriceCatalog {
  const real = remote.get(supermarketId);
  if (real) return real;
  let c = cache.get(supermarketId);
  if (!c) {
    c = buildDemoCatalog(supermarketId);
    cache.set(supermarketId, c);
  }
  return c;
}

/**
 * Supermercados con los que se calcula la compra: el principal y, si el
 * usuario reparte la compra, los adicionales del mismo país (misma moneda).
 */
export function storeIdsFor(
  profile: { supermarketId: string; extraSupermarkets: string[]; multiStore?: boolean; countryId: string },
  mainId = profile.supermarketId,
): string[] {
  const main = getSupermarket(mainId);
  if (!profile.multiStore) return [mainId];
  const extras = profile.extraSupermarkets.filter((id) => id !== mainId && getSupermarket(id).countryId === main.countryId);
  return [mainId, ...new Set(extras)];
}

export function catalogsFor(ids: string[]): PriceCatalog[] {
  return ids.map(getCatalogSync);
}

/** Ahorro mínimo para que compense ir a otro supermercado (≈ 1 € ajustado al país). */
export function minStoreSavingFor(supermarketId: string): number {
  const level = getCountry(getSupermarket(supermarketId).countryId).priceLevel;
  return Math.max(1, Math.round(level));
}

// ───────────────────────── Precios reales (descargados) ─────────────────────────
// Un proceso diario (scripts/prices/fetch.mjs en GitHub Actions) publica
// prices/index.json y prices/<súper>.json junto a la app. Aquí se cargan y se
// combinan con el catálogo de demostración: lo que no se encuentre en la web
// del súper conserva un precio estimado, marcado como tal.

export interface RemoteCatalogFile {
  supermarketId: string;
  currency: PriceCatalog["currency"];
  referenceDate: string;
  fetchedAt: string;
  source: string;
  coverage: { matched: number; total: number; missing: string[] };
  products: { id: string; ingredientId: string; name: string; packLabel: string; packSize: number; unit: "g" | "ml" | "ud"; price: number; url?: string }[];
}

export interface RemoteIndexEntry {
  supermarketId: string;
  referenceDate: string;
  fetchedAt: string;
  source: string;
  coverage: { matched: number; total: number; missing: string[] };
  file: string;
}

const remote = new Map<string, PriceCatalog>();
const listeners = new Set<() => void>();
let version = 0;

export function pricesVersion() {
  return version;
}

export function subscribePrices(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Registra un catálogo real y lo combina con estimaciones para lo que falte. */
export function registerRemoteCatalog(file: RemoteCatalogFile) {
  const known = new Map(INGREDIENTS.map((i) => [i.id, i]));
  const demo = buildDemoCatalog(file.supermarketId);
  const real: Product[] = file.products
    .filter((p) => known.has(p.ingredientId) && known.get(p.ingredientId)!.unit === p.unit && p.price > 0 && p.packSize > 0)
    .map((p) => {
      const ing = known.get(p.ingredientId)!;
      const perUnit = ing.unit === "ud" ? p.price / p.packSize : (p.price / p.packSize) * 1000;
      return {
        id: p.id,
        name: p.name,
        brand: "",
        supermarketId: file.supermarketId,
        ingredientId: p.ingredientId,
        category: ing.aisle,
        packSize: p.packSize,
        unit: ing.unit,
        packLabel: p.packLabel,
        price: p.price,
        pricePerUnit: Math.round(perUnit * 100) / 100,
        pricePerUnitLabel: `/${UNIT_LABEL[ing.unit]}`,
        updatedAt: file.referenceDate,
        source: file.source,
        available: true,
        url: p.url,
      };
    });
  const covered = new Set(real.map((p) => p.ingredientId));
  const estimated = demo.products.filter((p) => !covered.has(p.ingredientId)).map((p) => ({ ...p, estimated: true }));
  remote.set(file.supermarketId, {
    supermarketId: file.supermarketId,
    currency: file.currency,
    referenceDate: file.referenceDate,
    source: file.source,
    isDemo: false,
    fetchedAt: file.fetchedAt,
    coverage: { matched: covered.size, total: INGREDIENTS.length, missing: INGREDIENTS.filter((i) => !covered.has(i.id)).map((i) => i.id) },
    products: [...real, ...estimated],
  });
  version++;
  listeners.forEach((l) => l());
}

let loading: Promise<RemoteIndexEntry[]> | null = null;
let settled = false;

/** true cuando ya se intentó cargar los precios reales (con o sin éxito). */
export function pricesSettled() {
  return settled;
}
let loadedIndex: RemoteIndexEntry[] = [];

export function remoteIndex(): RemoteIndexEntry[] {
  return loadedIndex;
}

/**
 * Carga los precios reales publicados junto a la app (una sola vez por sesión).
 * Si no hay precios reales o falla la red, la app sigue con los de demostración.
 */
export function ensureRemotePrices(): Promise<RemoteIndexEntry[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  if (!loading) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    loading = (async () => {
      try {
        const res = await fetch(`${base}/prices/index.json`, { cache: "no-cache" });
        if (!res.ok) return [] as RemoteIndexEntry[];
        const index = (await res.json()) as { catalogs?: RemoteIndexEntry[] };
        const entries = index.catalogs ?? [];
        await Promise.all(
          entries.map(async (e) => {
            try {
              const r = await fetch(`${base}/prices/${e.file}`, { cache: "no-cache" });
              if (r.ok) registerRemoteCatalog((await r.json()) as RemoteCatalogFile);
            } catch {
              /* ese súper sigue con estimaciones */
            }
          }),
        );
        loadedIndex = entries;
        return entries;
      } catch {
        return [];
      } finally {
        settled = true;
        version++;
        listeners.forEach((l) => l());
      }
    })();
  }
  return loading;
}
