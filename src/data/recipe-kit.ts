import type { ApplianceId, Difficulty, MealSlot, Nutrition, PreferenceId, Recipe, RecipeStep, StorageInfo } from "@/domain/types";

/**
 * Formato compacto para escribir recetas. Cantidades por ración de adulto en
 * la unidad base del ingrediente (g, ml o ud). Dietas y alérgenos se derivan
 * de los ingredientes (engine/compat.ts).
 */
export type Ing = [string, number] | [string, number, string];

export interface RecipeDef {
  id: string;
  name: string;
  description: string;
  art: string[];
  palette: [string, string];
  cuisine: string;
  categories: PreferenceId[];
  meals?: MealSlot[];
  ing: Ing[];
  time: number;
  active: number;
  difficulty?: Difficulty;
  steps: RecipeStep[];
  utensils: string[];
  appliances: ApplianceId[][];
  tags?: string[];
  storage: StorageInfo;
  leftover?: boolean;
  nutrition?: Nutrition;
}

export const fridge = (container: string, days: [number, number], freezable = false, freezeMonths?: number, notes?: string): StorageInfo => ({
  method: "Nevera",
  container,
  days,
  freezable,
  freezeMonths,
  notes,
});

export const now = (notes: string): StorageInfo => ({
  method: "Consumir al momento",
  container: "—",
  days: [0, 1],
  freezable: false,
  notes,
});

export function toRecipe(r: RecipeDef): Recipe {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    art: r.art,
    palette: r.palette,
    cuisine: r.cuisine,
    categories: r.categories,
    mealTypes: r.meals ?? ["comida", "cena"],
    ingredients: r.ing.map(([ingredientId, perServing, note]) => ({ ingredientId, perServing, note })),
    totalTime: r.time,
    activeTime: r.active,
    difficulty: r.difficulty ?? "Fácil",
    baseServings: 2,
    steps: r.steps,
    utensils: r.utensils,
    appliances: r.appliances,
    tags: r.tags ?? [],
    storage: r.storage,
    leftoverFriendly: r.leftover ?? false,
    nutrition: r.nutrition,
  };
}
