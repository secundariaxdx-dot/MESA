import type { AllergenId, DietId, MeatType, Profile, Recipe } from "@/domain/types";
import { getIngredient } from "@/data/ingredients";
import { allergenName, applianceName, DISLIKES, MEATS } from "@/data/taxonomy";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function recipeAllergens(recipe: Recipe): AllergenId[] {
  const set = new Set<AllergenId>();
  for (const ri of recipe.ingredients) for (const a of getIngredient(ri.ingredientId).allergens) set.add(a);
  return [...set];
}

export function recipeMeats(recipe: Recipe): MeatType[] {
  const set = new Set<MeatType>();
  for (const ri of recipe.ingredients) for (const m of getIngredient(ri.ingredientId).meat ?? []) set.add(m);
  return [...set];
}

/** Dietas compatibles derivadas de los ingredientes. */
export function recipeDiets(recipe: Recipe): DietId[] {
  const origins = new Set(recipe.ingredients.flatMap((ri) => getIngredient(ri.ingredientId).animal ?? []));
  const diets: DietId[] = ["omnivora"];
  const hasMeat = origins.has("carne");
  const hasSea = origins.has("pescado") || origins.has("marisco");
  if (!hasMeat) diets.push("pescetariana");
  if (!hasMeat && !hasSea) diets.push("vegetariana");
  if (origins.size === 0) diets.push("vegana");
  return diets;
}

export type IncompatType = "allergen" | "diet" | "meat" | "dislike" | "appliance" | "meal";

export interface Incompat {
  type: IncompatType;
  label: string;
}

/** Ingredientes de la receta que el usuario no quiere, con el motivo. */
export function dislikedIngredients(recipe: Recipe, profile: Pick<Profile, "dislikes" | "customDislikes">) {
  const out: { ingredientId: string; reason: string }[] = [];
  const custom = profile.customDislikes.map(normalize).filter(Boolean);
  for (const ri of recipe.ingredients) {
    const ing = getIngredient(ri.ingredientId);
    const key = (ing.dislikeKeys ?? []).find((k) => profile.dislikes.includes(k));
    if (key) {
      out.push({ ingredientId: ing.id, reason: DISLIKES.find((d) => d.id === key)?.name ?? key });
      continue;
    }
    const n = normalize(ing.name);
    const c = custom.find((c) => n.includes(c) || c.includes(n));
    if (c) out.push({ ingredientId: ing.id, reason: c });
  }
  return out;
}

/**
 * Comprueba todas las restricciones. Las alergias son SIEMPRE obligatorias.
 * Devuelve la lista de motivos de incompatibilidad (vacía = compatible).
 */
export function checkRecipe(recipe: Recipe, profile: Profile): Incompat[] {
  const out: Incompat[] = [];

  const allergens = recipeAllergens(recipe).filter((a) => profile.allergens.includes(a));
  for (const a of allergens) out.push({ type: "allergen", label: `Contiene ${allergenName(a).toLowerCase()} (alergia)` });

  const diets = recipeDiets(recipe);
  if (!diets.includes(profile.diet)) {
    out.push({ type: "diet", label: `No es apta para dieta ${profile.diet}` });
  } else if (profile.diet !== "vegana" && profile.diet !== "vegetariana") {
    const notAllowed = recipeMeats(recipe).filter((m) => !profile.meats.includes(m));
    for (const m of notAllowed) out.push({ type: "meat", label: `Lleva ${MEATS.find((x) => x.id === m)?.name.toLowerCase() ?? m}, que no has marcado` });
  }

  for (const d of dislikedIngredients(recipe, profile)) {
    out.push({ type: "dislike", label: `Lleva ${getIngredient(d.ingredientId).name.toLowerCase()}, que no te gusta` });
  }

  const have = new Set(["fuegos", ...profile.appliances]);
  for (const group of recipe.appliances) {
    if (!group.some((a) => have.has(a))) {
      out.push({ type: "appliance", label: `Necesita ${group.map(applianceName).join(" o ").toLowerCase()}` });
    }
  }
  return out;
}

export function isCompatible(recipe: Recipe, profile: Profile): boolean {
  return checkRecipe(recipe, profile).length === 0;
}

export function hasAllergyConflict(recipe: Recipe, profile: Profile): boolean {
  return recipeAllergens(recipe).some((a) => profile.allergens.includes(a));
}
