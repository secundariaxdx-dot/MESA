import type { PantryItem, Recipe } from "@/domain/types";
import { RECIPES } from "@/data/recipes";
import { getIngredient } from "@/data/ingredients";

/**
 * Capa de IA opcional. MESA funciona entera sin IA: el proveedor local usa
 * reglas sobre el catálogo. Si el servidor tiene ANTHROPIC_API_KEY, el
 * proveedor remoto llama a /api/ai (Claude) para ideas más creativas.
 */
export interface LeftoverIdea {
  title: string;
  detail: string;
  recipeId?: string;
}

export interface MesaAI {
  id: "local" | "claude";
  leftoverIdeas(items: PantryItem[]): Promise<LeftoverIdea[]>;
}

export const localAI: MesaAI = {
  id: "local",
  async leftoverIdeas(items) {
    const ids = new Set(items.map((i) => i.ingredientId).filter(Boolean) as string[]);
    const scored = RECIPES.map((r) => ({ r, hits: r.ingredients.filter((ri) => ids.has(ri.ingredientId) && !getIngredient(ri.ingredientId).staple) }))
      .filter((x) => x.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length)
      .slice(0, 4);
    return scored.map(({ r, hits }) => ({
      title: r.name,
      detail: `Aprovecha ${hits.map((h) => getIngredient(h.ingredientId).name.toLowerCase()).join(", ")}.`,
      recipeId: r.id,
    }));
  },
};

export const claudeAI: MesaAI = {
  id: "claude",
  async leftoverIdeas(items) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task: "leftovers",
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, expiresAt: i.expiresAt })),
      }),
    });
    if (!res.ok) throw new Error("IA no disponible");
    const data = (await res.json()) as { ideas: LeftoverIdea[] };
    return data.ideas;
  },
};

export async function aiAvailable(): Promise<boolean> {
  try {
    const r = await fetch("/api/ai", { method: "GET" });
    if (!r.ok) return false;
    return Boolean(((await r.json()) as { enabled: boolean }).enabled);
  } catch {
    return false;
  }
}

export function recipesUsing(ingredientIds: string[], limit = 6): Recipe[] {
  const ids = new Set(ingredientIds);
  return RECIPES.map((r) => ({ r, n: r.ingredients.filter((ri) => ids.has(ri.ingredientId)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((x) => x.r);
}
