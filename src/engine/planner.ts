import type { MealSlot, PantryItem, PlannedMeal, PriceCatalog, Profile, Recipe, WeekPlan } from "@/domain/types";
import { getIngredient } from "@/data/ingredients";
import { getRecipe, RECIPES } from "@/data/recipes";
import { checkRecipe, type Incompat, type IncompatType } from "./compat";
import { SLOTS, slotName } from "@/data/taxonomy";
import { addDays } from "./dates";
import { uid, expiringSoon } from "./pantry";
import { buildShoppingList, recipeCost, type ShoppingOptions } from "./shopping";

/** Total en caja considerando todos los supermercados del contexto. */
type ShopCtx = Pick<PlanContext, "pantry" | "catalog" | "extraCatalogs" | "minStoreSaving" | "shopping">;

function listOf(plan: WeekPlan, ctx: ShopCtx) {
  const catalogs = [ctx.catalog, ...(ctx.extraCatalogs ?? [])];
  return buildShoppingList(plan, ctx.pantry, catalogs, { ...ctx.shopping, minStoreSaving: ctx.minStoreSaving ?? ctx.shopping?.minStoreSaving });
}

function checkoutOf(plan: WeekPlan, ctx: ShopCtx): number {
  return listOf(plan, ctx).checkoutTotal;
}
import { formatMoney } from "./units";
import { wastePenalty, wasteReport } from "./waste";
import { dailyIntake, isNutritionReady, nutritionFit, nutritionTargets, plannedShare, withPortions } from "./nutrition";

/**
 * Motor de planificación determinista (dado un seed).
 * 1. Filtra restricciones duras (alergias, dieta, carnes, exclusiones, aparatos, franja).
 * 2. Rellena las franjas con un greedy puntuado (preferencias, coste, ingredientes
 *    compartidos, despensa, variedad).
 * 3. Optimiza el coste en caja (envases completos, descontando despensa)
 *    sustituyendo platos hasta entrar en presupuesto o agotar opciones.
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function peopleOf(profile: Pick<Profile, "adults" | "children">) {
  const people = Math.max(1, profile.adults + profile.children);
  const portionFactor = (profile.adults + 0.6 * profile.children) / people;
  return { people, portionFactor: Math.round(portionFactor * 100) / 100 };
}

export interface PlanContext {
  profile: Profile;
  pantry: PantryItem[];
  catalog: PriceCatalog;
  /** Supermercados adicionales cuando la compra se reparte. */
  extraCatalogs?: PriceCatalog[];
  minStoreSaving?: number;
  /** Favoritos y productos propios (ver engine/shoppingSetup.ts). */
  shopping?: ShoppingOptions;
  seed: number;
  weekStart: string;
  /** Recetas a evitar (p. ej. las de la semana anterior). */
  avoidRecipeIds?: string[];
}

export interface CompatibilityReport {
  total: number;
  compatible: Recipe[];
  excluded: Record<IncompatType, number>;
}

export function compatibilityReport(profile: Profile): CompatibilityReport {
  const excluded: Record<IncompatType, number> = { allergen: 0, diet: 0, meat: 0, dislike: 0, appliance: 0, meal: 0 };
  const compatible: Recipe[] = [];
  for (const r of RECIPES) {
    const inc = checkRecipe(r, profile);
    if (!inc.length) compatible.push(r);
    const types = new Set(inc.map((i) => i.type));
    types.forEach((t) => excluded[t]++);
  }
  return { total: RECIPES.length, compatible, excluded };
}

export class PlanError extends Error {
  constructor(
    message: string,
    public suggestions: string[],
  ) {
    super(message);
  }
}

interface Slot {
  dayIndex: number;
  date: string;
  slot: MealSlot;
  leftoverFrom?: number; // índice del slot de cena que la alimenta
  feeds?: boolean;
}

/** Desayuno y merienda: franjas ligeras, donde repetir es normal. */
export const isLightSlot = (slot: MealSlot) => slot === "desayuno" || slot === "merienda";

function buildSlots(profile: Profile, weekStart: string, available: Set<MealSlot> = new Set(SLOTS.map((s) => s.id))): Slot[] {
  const days = [...profile.days].sort((a, b) => a - b);
  const slots: Slot[] = [];
  const useLeftovers = profile.leftovers === "aprovechar" && profile.meals.comida && profile.meals.cena;
  const dinnerIndexByDay = new Map<number, number>();
  for (const d of days) {
    const date = addDays(weekStart, d);
    for (const { id } of SLOTS) {
      if (!profile.meals[id] || !available.has(id)) continue;
      if (id === "comida") {
        const prevDinner = dinnerIndexByDay.get(d - 1);
        if (useLeftovers && prevDinner !== undefined) {
          slots[prevDinner].feeds = true;
          slots.push({ dayIndex: d, date, slot: "comida", leftoverFrom: prevDinner });
          continue;
        }
      }
      if (id === "cena") dinnerIndexByDay.set(d, slots.length);
      slots.push({ dayIndex: d, date, slot: id });
    }
  }
  return slots;
}

function mainProtein(r: Recipe): string {
  for (const ri of r.ingredients) {
    const m = getIngredient(ri.ingredientId).meat;
    if (m?.length) return m[0];
  }
  if (r.ingredients.some((ri) => ["lentejas", "garbanzos"].includes(ri.ingredientId))) return "legumbre";
  if (r.ingredients.some((ri) => ri.ingredientId === "huevo")) return "huevo";
  return "verdura";
}

const LEGUMES = new Set(["lentejas", "garbanzos"]);

function scoreRecipe(
  r: Recipe,
  slot: Slot,
  ctx: PlanContext,
  chosen: Recipe[],
  prev: Recipe | undefined,
  costPerServing: number,
  targetCps: number,
  pantryIds: Set<string>,
  expiringIds: Set<string>,
  rng: () => number,
): number {
  const { profile } = ctx;
  let s = 0;
  s += r.categories.filter((c) => profile.preferences.includes(c)).length * 3.5;
  if (slot.slot === "cena" && r.totalTime <= 30) s += 1.5;
  if (slot.slot === "comida" && r.categories.includes("cuchara")) s += 1;
  if (isLightSlot(slot.slot) && r.totalTime <= 10) s += 1;

  if (profile.cheapest) {
    s -= costPerServing * 6;
    if (r.ingredients.some((ri) => LEGUMES.has(ri.ingredientId))) s += 2.5;
  } else {
    const ratio = costPerServing / Math.max(0.5, targetCps);
    s -= Math.max(0, ratio - 1) * 8 + costPerServing * 0.6;
  }

  const chosenIngredients = new Set(chosen.flatMap((c) => c.ingredients.map((i) => i.ingredientId)));
  let shared = 0;
  for (const ri of r.ingredients) {
    const ing = getIngredient(ri.ingredientId);
    if (ing.staple) continue;
    if (chosenIngredients.has(ri.ingredientId)) shared++;
    if (pantryIds.has(ri.ingredientId)) s += 1.5;
    if (expiringIds.has(ri.ingredientId)) s += ctx.profile.optimizer ? 6 : 4;
  }
  s += Math.min(shared, 4) * 1.5;

  if (ctx.avoidRecipeIds?.includes(r.id)) s -= 10;
  // Variedad: se compara con platos de la misma clase (desayunos/meriendas vs. comidas/cenas).
  const sameKind = chosen.filter((c) => c.mealTypes.some(isLightSlot) === isLightSlot(slot.slot));
  const protein = mainProtein(r);
  s -= sameKind.filter((c) => mainProtein(c) === protein).length * (isLightSlot(slot.slot) ? 1 : 2.5);
  s -= sameKind.filter((c) => c.id === r.id).length * 6;
  if (prev && mainProtein(prev) === protein && !isLightSlot(slot.slot)) s -= 1.5;
  if (slot.feeds && !r.leftoverFriendly) s -= 100;
  // Calorías y proteína: platos que encajan con tu objetivo sin forzar raciones extremas.
  if (isNutritionReady(ctx.profile.nutrition)) {
    s += nutritionFit(r, slot.slot, ctx.profile.nutrition, nutritionTargets(ctx.profile.nutrition));
  }
  s += rng() * 6;
  return s;
}

function makePlanShell(ctx: PlanContext): WeekPlan {
  const { people, portionFactor } = peopleOf(ctx.profile);
  return {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    weekStart: ctx.weekStart,
    supermarketId: ctx.profile.supermarketId,
    countryId: ctx.profile.countryId,
    budget: ctx.profile.budget,
    people,
    portionFactor,
    meals: [],
    warnings: [],
    seed: ctx.seed,
    estimatedTotal: 0,
  };
}

function slotsToMeals(slots: Slot[], recipes: Recipe[], people: number): PlannedMeal[] {
  const ids = slots.map(() => uid("m"));
  return slots.map((s, i) => {
    const isLeftover = s.leftoverFrom !== undefined;
    const recipe = isLeftover ? recipes[s.leftoverFrom!] : recipes[i];
    const feeds = s.feeds ? slots.findIndex((x) => x.leftoverFrom === i) : -1;
    return {
      id: ids[i],
      date: s.date,
      dayIndex: s.dayIndex,
      slot: s.slot,
      kind: isLeftover ? "leftover" : "cook",
      recipeId: recipe.id,
      servings: isLeftover ? people : feeds >= 0 ? people * 2 : people,
      eatServings: people,
      feedsMealId: feeds >= 0 ? ids[feeds] : undefined,
      leftoverOfMealId: isLeftover ? ids[s.leftoverFrom!] : undefined,
      status: "planned",
    } satisfies PlannedMeal;
  });
}

export interface GenerateResult {
  plan: WeekPlan;
  report: CompatibilityReport;
  checkoutTotal: number;
}

export function generateWeek(ctx: PlanContext): GenerateResult {
  const { profile, catalog, pantry } = ctx;
  const rng = mulberry32(ctx.seed);
  const report = compatibilityReport(profile);
  const plan = makePlanShell(ctx);

  const wanted = SLOTS.filter((s) => profile.meals[s.id]).map((s) => s.id);
  if (!profile.days.length || !wanted.length) {
    throw new PlanError("No hay días o comidas seleccionadas.", ["Marca al menos un día y una franja (desayuno, comida, merienda o cena)."]);
  }
  if (!report.compatible.length) {
    throw new PlanError("Ninguna receta del catálogo cumple todas tus restricciones.", suggestionsFor(report));
  }
  // Franjas sin ninguna receta compatible: se omiten con aviso (nunca se rellenan con platos de otra franja).
  const available = new Set(wanted.filter((slot) => report.compatible.some((r) => r.mealTypes.includes(slot))));
  if (!available.size) {
    throw new PlanError("Ninguna receta compatible encaja en las franjas elegidas.", suggestionsFor(report));
  }
  const missing = wanted.filter((w) => !available.has(w));
  if (missing.length) {
    plan.warnings.push(`No hay recetas de ${missing.map((m) => slotName(m).toLowerCase()).join(" ni ")} compatibles con tus restricciones, así que esa franja queda sin planificar.`);
  }

  const slots = buildSlots(profile, ctx.weekStart, available);
  const { people, portionFactor } = peopleOf(profile);
  const totalServings = slots.reduce((s, sl) => s + (sl.leftoverFrom !== undefined ? 0 : sl.feeds ? people * 2 : people), 0);
  const targetCps = profile.budget / Math.max(1, totalServings) / 1.3;

  const cpsCache = new Map<string, number>();
  const cps = (r: Recipe) => {
    if (!cpsCache.has(r.id)) cpsCache.set(r.id, recipeCost(r, 1, catalog, portionFactor).total);
    return cpsCache.get(r.id)!;
  };
  const pantryIds = new Set(pantry.filter((p) => p.status === "ok" && p.ingredientId && !getIngredient(p.ingredientId).staple).map((p) => p.ingredientId!));
  // En modo aprovechamiento, lo que caduca en las próximas 2 semanas tiene prioridad.
  const expiringIds = new Set(expiringSoon(pantry, profile.optimizer ? 14 : 3).map((p) => p.ingredientId!).filter(Boolean));

  const chosen: Recipe[] = new Array(slots.length);
  const chosenList: Recipe[] = [];
  let repeats = 0;
  slots.forEach((slot, i) => {
    if (slot.leftoverFrom !== undefined) {
      chosen[i] = chosen[slot.leftoverFrom];
      return;
    }
    let pool = report.compatible.filter((r) => r.mealTypes.includes(slot.slot) && !chosenList.includes(r));
    if (!pool.length) {
      pool = report.compatible.filter((r) => r.mealTypes.includes(slot.slot));
      // Repetir desayuno o merienda es lo normal: solo avisamos en comidas y cenas.
      if (!isLightSlot(slot.slot)) repeats++;
    }
    const prev = chosenList[chosenList.length - 1];
    const ranked = pool
      .map((r) => ({ r, s: scoreRecipe(r, slot, ctx, chosenList, prev, cps(r), targetCps, pantryIds, expiringIds, rng) }))
      .sort((a, b) => b.s - a.s);
    chosen[i] = ranked[0].r;
    chosenList.push(ranked[0].r);
  });

  // Si una cena que alimenta sobras no admite sobras, la comida pasa a cocinarse aparte.
  slots.forEach((s, i) => {
    if (s.feeds && !chosen[i].leftoverFriendly) {
      s.feeds = false;
      const lunchIdx = slots.findIndex((x) => x.leftoverFrom === i);
      if (lunchIdx >= 0) {
        delete slots[lunchIdx].leftoverFrom;
        const alt = report.compatible.find((r) => r.mealTypes.includes("comida") && !chosenList.includes(r)) ?? report.compatible[0];
        chosen[lunchIdx] = alt;
        chosenList.push(alt);
      }
    }
  });

  plan.meals = withPortions({ ...plan, meals: slotsToMeals(slots, chosen, people) }, profile).meals;
  let total = checkoutOf(plan, ctx);

  // Optimización de presupuesto: sustituciones que más reducen el coste en caja.
  for (let iter = 0; iter < 40 && total > profile.budget; iter++) {
    let best: { mealIdx: number; recipe: Recipe; total: number } | null = null;
    plan.meals.forEach((m, mi) => {
      if (m.kind !== "cook") return;
      const used = new Set(plan.meals.map((x) => x.recipeId));
      for (const r of report.compatible) {
        if (used.has(r.id) || !r.mealTypes.includes(m.slot)) continue;
        if (m.feedsMealId && !r.leftoverFriendly) continue;
        const trial = swapIn(plan, m.id, r.id, ctx.profile);
        const t = checkoutOf(trial, ctx);
        if (t < total - 0.05 && (!best || t < best.total)) best = { mealIdx: mi, recipe: r, total: t };
      }
    });
    if (!best) break;
    const b = best as { mealIdx: number; recipe: Recipe; total: number };
    plan.meals = swapIn(plan, plan.meals[b.mealIdx].id, b.recipe.id, ctx.profile).meals;
    total = b.total;
  }

  if (profile.optimizer) {
    total = optimizeWaste(plan, ctx, report.compatible, total).total;
  }

  if (repeats > 0) {
    plan.warnings.push(`Solo hay ${report.compatible.length} recetas compatibles con tus restricciones, así que hemos repetido ${repeats} ${repeats === 1 ? "plato" : "platos"}.`);
  }
  if (total > profile.budget) {
    plan.warnings.push(
      `No hemos encontrado una semana dentro de ${formatMoney(profile.budget, catalog.currency)} sin saltarnos tus restricciones. La combinación más ajustada cuesta ${formatMoney(total, catalog.currency)} en caja.`,
    );
  }
  plan.estimatedTotal = total;
  return { plan, report, checkoutTotal: total };
}

export function suggestionsFor(report: CompatibilityReport): string[] {
  const s: string[] = [];
  if (report.excluded.dislike) s.push(`Revisa los alimentos que no te gustan (descartan ${report.excluded.dislike} recetas).`);
  if (report.excluded.meat) s.push(`Marca más tipos de carne o pescado (descartan ${report.excluded.meat} recetas).`);
  if (report.excluded.appliance) s.push(`Indica si tienes más electrodomésticos (descartan ${report.excluded.appliance} recetas).`);
  if (report.excluded.diet) s.push(`Tu dieta descarta ${report.excluded.diet} recetas del catálogo actual.`);
  if (report.excluded.allergen) s.push(`Las alergias descartan ${report.excluded.allergen} recetas. Las alergias nunca se ignoran.`);
  return s;
}

/** Cambia un plato y recalcula las raciones ajustadas a calorías. */
export function swapIn(plan: WeekPlan, mealId: string, recipeId: string, profile: Profile): WeekPlan {
  return withPortions(replaceRecipe(plan, mealId, recipeId), profile);
}

/** Sustituye la receta de UNA comida sin tocar el resto de la semana. */
export function replaceRecipe(plan: WeekPlan, mealId: string, recipeId: string): WeekPlan {
  const meals = plan.meals.map((m) => ({ ...m }));
  const meal = meals.find((m) => m.id === mealId);
  if (!meal) return plan;
  const recipe = getRecipe(recipeId);
  if (meal.kind === "leftover") {
    // La comida deja de ser sobras: se cocina aparte y la cena vuelve a su ración normal.
    const dinner = meals.find((m) => m.id === meal.leftoverOfMealId);
    if (dinner) {
      dinner.servings = dinner.eatServings;
      dinner.feedsMealId = undefined;
    }
    meal.kind = "cook";
    meal.leftoverOfMealId = undefined;
    meal.servings = meal.eatServings;
  }
  meal.recipeId = recipeId;
  meal.status = "planned";
  if (meal.feedsMealId) {
    const lunch = meals.find((m) => m.id === meal.feedsMealId);
    if (recipe?.leftoverFriendly && lunch) {
      lunch.recipeId = recipeId;
    } else if (lunch) {
      // La nueva receta no admite sobras: la comida se queda sin plato (se puede elegir).
      meal.servings = meal.eatServings;
      meal.feedsMealId = undefined;
      lunch.kind = "cook";
      lunch.leftoverOfMealId = undefined;
      lunch.servings = lunch.eatServings;
    }
  }
  return { ...plan, meals };
}

export interface Alternative {
  recipe: Recipe;
  checkoutDelta: number;
  score: number;
  sharedIngredients: number;
}

/** Alternativas compatibles para cambiar un plato, con su impacto en la caja. */
export function findAlternatives(plan: WeekPlan, mealId: string, ctx: Omit<PlanContext, "seed" | "weekStart">, limit = 8): Alternative[] {
  const meal = plan.meals.find((m) => m.id === mealId);
  if (!meal) return [];
  const report = compatibilityReport(ctx.profile);
  const base = checkoutOf(plan, ctx);
  const used = new Set(plan.meals.map((m) => m.recipeId));
  const others = plan.meals.filter((m) => m.id !== mealId).map((m) => getRecipe(m.recipeId)!).filter(Boolean);
  const otherIngredients = new Set(others.flatMap((r) => r.ingredients.map((i) => i.ingredientId)));
  return report.compatible
    .filter((r) => !used.has(r.id) && r.mealTypes.includes(meal.slot))
    .map((r) => {
      const trial = swapIn(plan, mealId, r.id, ctx.profile);
      const t = checkoutOf(trial, ctx);
      const shared = r.ingredients.filter((ri) => !getIngredient(ri.ingredientId).staple && otherIngredients.has(ri.ingredientId)).length;
      const prefs = r.categories.filter((c) => ctx.profile.preferences.includes(c)).length;
      return { recipe: r, checkoutDelta: Math.round((t - base) * 100) / 100, sharedIngredients: shared, score: prefs * 5 + shared * 1.5 - Math.max(0, t - base) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Construye un plan con recetas concretas (semana de demostración). */
export function planFromRecipes(ctx: PlanContext, recipeIds: string[]): WeekPlan {
  const plan = makePlanShell(ctx);
  const slots = buildSlots({ ...ctx.profile, leftovers: "distintos" }, ctx.weekStart);
  const recipes = slots.map((_, i) => getRecipe(recipeIds[i % recipeIds.length])!);
  plan.meals = withPortions({ ...plan, meals: slotsToMeals(slots, recipes, plan.people) }, ctx.profile).meals;
  plan.estimatedTotal = checkoutOf(plan, ctx);
  return plan;
}

export function explainIncompat(list: Incompat[]): string {
  return list.map((i) => i.label).join(" · ");
}


/**
 * Modo aprovechamiento: búsqueda local que cambia platos para que los envases
 * comprados se gasten (y lo que tienes en casa no caduque), sin pasarse del
 * presupuesto y manteniendo tus preferencias.
 * Objetivo = lo que pagas + lo que acabaría en la basura − afinidad con tus gustos.
 */
export function optimizeWaste(plan: WeekPlan, ctx: PlanContext, compatible: Recipe[], startTotal: number) {
  const prefValue = (r: Recipe) => r.categories.filter((c) => ctx.profile.preferences.includes(c)).length * 0.6;
  const evaluate = (p: WeekPlan) => {
    const list = listOf(p, ctx);
    const waste = wastePenalty(wasteReport(p, list, ctx.pantry, ctx.catalog));
    const cooked = p.meals.filter((m) => m.kind === "cook").map((m) => getRecipe(m.recipeId)!);
    const prefs = cooked.reduce((sum, r) => sum + prefValue(r), 0);
    // Variedad: no repetir la semana anterior ni la misma proteína en comidas y cenas.
    const repeatedFromLastWeek = cooked.filter((r) => ctx.avoidRecipeIds?.includes(r.id)).length * 3.5;
    const mains = cooked.filter((r) => !r.mealTypes.some(isLightSlot));
    const proteins = mains.map(mainProtein);
    const sameProtein = (proteins.length - new Set(proteins).size) * 0.5;
    // Nutrición: falta de proteína (≈ 10 céntimos por gramo) y desvío de calorías del día.
    let nutrition = 0;
    if (isNutritionReady(ctx.profile.nutrition)) {
      const t = nutritionTargets(ctx.profile.nutrition);
      const share = plannedShare(ctx.profile.meals);
      for (const d of dailyIntake(p)) {
        nutrition += Math.max(0, t.protein * share - d.protein) * 0.1;
        nutrition += (Math.abs(d.kcal - t.kcal * share) / (t.kcal * share)) * 2;
      }
    }
    return { total: list.checkoutTotal, score: list.checkoutTotal + waste - prefs + repeatedFromLastWeek + sameProtein + nutrition };
  };
  let current = evaluate(plan);
  const limit = Math.max(ctx.profile.budget, startTotal);
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (const meal of plan.meals) {
      if (meal.kind !== "cook" || meal.status !== "planned") continue;
      const used = new Set(plan.meals.map((m) => m.recipeId));
      // Candidatos: los que comparten ingredientes con la semana (aprovechan envases) primero.
      const weekIngredients = new Set(plan.meals.flatMap((m) => getRecipe(m.recipeId)!.ingredients.map((i) => i.ingredientId)));
      const candidates = compatible
        .filter((r) => r.mealTypes.includes(meal.slot) && !used.has(r.id) && !(meal.feedsMealId && !r.leftoverFriendly))
        .map((r) => ({ r, share: r.ingredients.filter((i) => weekIngredients.has(i.ingredientId) && !getIngredient(i.ingredientId).staple).length + prefValue(r) }))
        .sort((a, b) => b.share - a.share)
        .slice(0, 12);
      let best: { recipe: Recipe; result: ReturnType<typeof evaluate> } | null = null;
      for (const { r } of candidates) {
        const trial = swapIn(plan, meal.id, r.id, ctx.profile);
        const result = evaluate(trial);
        if (result.total > limit + 1e-9) continue;
        if (result.score < (best?.result.score ?? current.score) - 0.1) best = { recipe: r, result };
      }
      if (best) {
        plan.meals = swapIn(plan, meal.id, best.recipe.id, ctx.profile).meals;
        current = best.result;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return current;
}
