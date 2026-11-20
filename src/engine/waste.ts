import type { PantryItem, PriceCatalog, ShoppingList, WeekPlan } from "@/domain/types";
import { getIngredient } from "@/data/ingredients";
import { unitPrice } from "./pricing";
import { computeNeeds } from "./shopping";
import { addDays, daysBetween } from "./dates";

/**
 * Aprovechamiento de envases.
 *
 * Comprar envases completos deja sobrantes. Según lo que dura cada alimento:
 *  - riesgo   (≤ 7 días): o se usa esta semana o se estropea.
 *  - proxima  (8–21 días): aguanta; la semana siguiente se usa primero.
 *  - despensa (> 21 días): se queda en la despensa sin prisa.
 * También cuenta lo que ya tienes en casa y caduca durante la semana sin usarse.
 */
export type Fate = "riesgo" | "proxima" | "despensa";

export interface LeftoverLine {
  ingredientId: string;
  name: string;
  icon: string;
  unit: "g" | "ml" | "ud";
  qty: number;
  value: number;
  shelfLifeDays: number;
  fate: Fate;
  source: "compra" | "despensa";
}

export interface WasteReport {
  lines: LeftoverLine[];
  /** Valor de lo que probablemente se estropee. */
  riskValue: number;
  /** Valor de lo que se reserva para la semana siguiente. */
  nextWeekValue: number;
  /** Porcentaje (0–1) del dinero de la compra que se aprovecha. */
  usedPct: number;
}

/** Días que se da por bueno aprovechar en la misma semana. */
export const WEEK_DAYS = 7;
export const TWO_WEEKS = 21;

export function fateFor(shelfLifeDays: number): Fate {
  if (shelfLifeDays <= WEEK_DAYS) return "riesgo";
  if (shelfLifeDays <= TWO_WEEKS) return "proxima";
  return "despensa";
}

export function wasteReport(plan: WeekPlan, list: ShoppingList, pantry: PantryItem[], catalog: PriceCatalog): WasteReport {
  const lines: LeftoverLine[] = [];

  for (const i of list.toBuy) {
    if (i.custom || i.surplus <= 0 || i.purchasedQty <= 0) continue;
    if (i.unit !== "ud" && i.surplus < 5) continue;
    const ing = getIngredient(i.ingredientId);
    lines.push({
      ingredientId: i.ingredientId,
      name: i.name,
      icon: i.icon,
      unit: i.unit,
      qty: i.surplus,
      value: (i.cost * i.surplus) / i.purchasedQty,
      shelfLifeDays: ing.shelfLifeDays,
      fate: fateFor(ing.shelfLifeDays),
      source: "compra",
    });
  }

  // Lo que tienes en casa y caduca antes de que acabe la semana, si el menú no lo usa.
  const needs = computeNeeds(plan);
  const weekEnd = addDays(plan.weekStart, 6);
  const expiring = new Map<string, number>();
  for (const p of pantry) {
    if (p.status !== "ok" || !p.ingredientId || p.quantity === null || p.quantity <= 0 || !p.expiresAt) continue;
    if (daysBetween(p.expiresAt, weekEnd) < 0) continue; // caduca después de esta semana
    expiring.set(p.ingredientId, (expiring.get(p.ingredientId) ?? 0) + p.quantity);
  }
  for (const [ingredientId, qty] of expiring) {
    const unused = qty - (needs.get(ingredientId)?.qty ?? 0);
    if (unused <= 0.5) continue;
    const ing = getIngredient(ingredientId);
    lines.push({
      ingredientId,
      name: ing.name,
      icon: ing.icon,
      unit: ing.unit,
      qty: unused,
      value: unused * (unitPrice(catalog, ingredientId) ?? 0),
      shelfLifeDays: ing.shelfLifeDays,
      fate: "riesgo",
      source: "despensa",
    });
  }

  const riskValue = lines.filter((l) => l.fate === "riesgo").reduce((s, l) => s + l.value, 0);
  const nextWeekValue = lines.filter((l) => l.fate === "proxima").reduce((s, l) => s + l.value, 0);
  const spent = Math.max(0.01, list.checkoutTotal);
  lines.sort((a, b) => ["riesgo", "proxima", "despensa"].indexOf(a.fate) - ["riesgo", "proxima", "despensa"].indexOf(b.fate) || b.value - a.value);
  return {
    lines,
    riskValue: Math.round(riskValue * 100) / 100,
    nextWeekValue: Math.round(nextWeekValue * 100) / 100,
    usedPct: Math.max(0, Math.min(1, 1 - riskValue / spent)),
  };
}

/** Coste "real" que usa el optimizador: lo que pagas más lo que acabaría en la basura. */
export function wastePenalty(r: WasteReport): number {
  return r.riskValue + 0.35 * r.nextWeekValue;
}
