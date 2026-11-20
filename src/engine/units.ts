import type { BaseUnit, CurrencyCode, HouseholdUnit, Ingredient } from "@/domain/types";

export function formatMoney(n: number, currency: CurrencyCode = "EUR"): string {
  const locale = currency === "EUR" ? "es-ES" : currency === "NOK" ? "nb-NO" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Redondeo amable para cantidades de cocina. */
export function roundQty(qty: number, unit: BaseUnit): number {
  if (unit === "ud") {
    if (qty < 1) return Math.max(0.5, Math.round(qty * 2) / 2);
    return Math.round(qty * 2) / 2;
  }
  if (qty < 2) return Math.round(qty * 10) / 10;
  if (qty < 20) return Math.round(qty);
  if (qty < 200) return Math.round(qty / 5) * 5;
  return Math.round(qty / 10) * 10;
}

export function formatQty(qty: number, unit: BaseUnit): string {
  const q = roundQty(qty, unit);
  if (unit === "ud") return `${fmtNum(q)} ud`;
  if (q >= 1000) return `${fmtNum(Math.round(q / 100) / 10)} ${unit === "g" ? "kg" : "l"}`;
  return `${fmtNum(q)} ${unit}`;
}

/** Tamaño de envase: "aprox. 1 kg", "440 g". */
export function formatPack(size: number, unit: BaseUnit): string {
  if (unit === "ud") return `${size} ud`;
  if (size >= 1000) return `${fmtNum(size / 1000)} ${unit === "g" ? "kg" : "l"}`;
  return `${size} ${unit}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
}

const HH_NAMES: Record<HouseholdUnit, [string, string]> = {
  cda: ["cucharada", "cucharadas"],
  cdita: ["cucharadita", "cucharaditas"],
  vaso: ["vaso", "vasos"],
  taza: ["taza", "tazas"],
  ud: ["unidad", "unidades"],
  diente: ["diente", "dientes"],
  pizca: ["pizca", "pizcas"],
  puñado: ["puñado", "puñados"],
  rebanada: ["rebanada", "rebanadas"],
  lata: ["lata", "latas"],
  chorrito: ["chorrito", "chorritos"],
};

function fraction(n: number): string {
  const whole = Math.floor(n);
  const rest = n - whole;
  const frac = rest < 0.125 ? "" : rest < 0.375 ? "¼" : rest < 0.625 ? "½" : rest < 0.875 ? "¾" : "";
  const w = rest >= 0.875 ? whole + 1 : whole;
  if (w === 0) return frac || "¼";
  return frac ? `${w} ${frac}` : `${w}`;
}

export interface HouseholdResult {
  text: string;
  note?: string;
}

/**
 * Convierte una cantidad a medida casera SOLO si el ingrediente tiene una
 * equivalencia razonable definida. Nunca inventa equivalencias universales.
 */
export function toHousehold(ing: Ingredient, qty: number): HouseholdResult | null {
  if (ing.unit === "ud") {
    const q = roundQty(qty, "ud");
    return { text: `${fraction(q)} ${q > 1 ? "unidades" : "unidad"}` };
  }
  const measures = ing.household ?? [];
  if (!measures.length) return null;
  // Elegimos la medida que da un número "manejable" (entre ¼ y 8).
  let best: { m: (typeof measures)[number]; n: number; score: number } | null = null;
  for (const m of measures) {
    const n = qty / m.amount;
    if (m.unit === "pizca" && n <= 4) return { text: n <= 1.5 ? "una pizca" : `${Math.round(n)} pizcas`, note: m.note };
    if (n < 0.2 || n > 10) continue;
    const quarters = Math.round(n * 4) / 4;
    const err = Math.abs(quarters - n) / Math.max(n, 0.25);
    const score = err + (n > 6 ? 0.3 : 0) + (n < 0.5 ? 0.2 : 0);
    if (!best || score < best.score) best = { m, n, score };
  }
  if (!best) return null;
  const q = Math.max(0.25, Math.round(best.n * 4) / 4);
  const [sing, plur] = HH_NAMES[best.m.unit];
  return { text: `${q <= 1 ? "" : "aprox. "}${fraction(q)} ${q > 1 ? plur : sing}`.trim(), note: best.m.note };
}
