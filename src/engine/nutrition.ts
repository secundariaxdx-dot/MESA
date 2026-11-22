import type { MealSlot, NutritionProfile, PlannedMeal, Profile, Recipe, WeekPlan } from "@/domain/types";
import { getRecipe } from "@/data/recipes";

/**
 * Calorías y macros personales (estilo Fitia).
 *
 * - Metabolismo basal: ecuación de Mifflin-St Jeor.
 * - Gasto diario (TDEE) = basal × factor de actividad.
 * - Objetivo: perder (−15 % suave / −20 % normal), mantener, o ganar (+10 %).
 *   Límites prudentes: nunca por debajo de 1.200 kcal (mujer) / 1.500 kcal (hombre),
 *   ni por debajo del metabolismo basal; sin déficit para menores de 18 años.
 * - Macros: proteína según objetivo (g/kg), grasa 30 % de las kcal y el resto hidratos.
 *
 * Son estimaciones orientativas, no consejo médico.
 */

export const ACTIVITY: { id: NutritionProfile["activity"]; name: string; hint: string; factor: number }[] = [
  { id: "sedentaria", name: "Sedentaria", hint: "Trabajo sentado, casi sin ejercicio", factor: 1.2 },
  { id: "ligera", name: "Ligera", hint: "Caminas a diario o entrenas 1-3 días", factor: 1.375 },
  { id: "moderada", name: "Moderada", hint: "Entrenas 3-5 días a la semana", factor: 1.55 },
  { id: "alta", name: "Alta", hint: "Entrenas 6-7 días o trabajo físico", factor: 1.725 },
  { id: "muy-alta", name: "Muy alta", hint: "Deporte intenso a diario o doble sesión", factor: 1.9 },
];

export const GOALS: { id: NutritionProfile["goal"]; name: string; icon: string; hint: string }[] = [
  { id: "perder", name: "Perder peso", icon: "📉", hint: "Déficit moderado y mucha proteína" },
  { id: "mantener", name: "Mantener", icon: "⚖️", hint: "Comer lo que gastas" },
  { id: "ganar", name: "Ganar masa", icon: "💪", hint: "Ligero superávit y proteína alta" },
];

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  bmi: number;
  /** Avisos de seguridad o límites aplicados. */
  notes: string[];
}

export function isNutritionReady(n?: NutritionProfile): n is NutritionProfile {
  return Boolean(n?.enabled && n.weightKg > 0 && n.heightCm > 0 && n.age > 0);
}

export function nutritionTargets(n: NutritionProfile): NutritionTargets {
  const notes: string[] = [];
  const bmr = 10 * n.weightKg + 6.25 * n.heightCm - 5 * n.age + (n.sex === "hombre" ? 5 : -161);
  const factor = ACTIVITY.find((a) => a.id === n.activity)?.factor ?? 1.375;
  const tdee = bmr * factor;
  const minor = n.age < 18;
  let kcal = tdee;
  if (n.goal === "perder") {
    if (minor) notes.push("Por ser menor de 18 años no aplicamos déficit: calculamos para mantener. Consulta con un profesional.");
    else kcal = tdee * (n.pace === "suave" ? 0.85 : 0.8);
  } else if (n.goal === "ganar") {
    kcal = tdee * 1.1;
  }
  const floor = Math.max(n.sex === "hombre" ? 1500 : 1200, n.goal === "perder" && !minor ? bmr : 0);
  if (kcal < floor) {
    kcal = floor;
    notes.push(`Hemos limitado el objetivo a ${Math.round(floor)} kcal: por debajo no es recomendable sin supervisión.`);
  }
  const proteinPerKg = n.goal === "mantener" ? 1.6 : n.goal === "perder" ? 1.8 : 2;
  const protein = Math.min(proteinPerKg * n.weightKg, (kcal * 0.35) / 4);
  const fat = (kcal * 0.3) / 9;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  const bmi = n.weightKg / (n.heightCm / 100) ** 2;
  if (bmi < 18.5 && n.goal === "perder") notes.push("Tu IMC indica bajo peso: perder peso no es recomendable. Habla con un profesional.");
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal / 10) * 10,
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    bmi: Math.round(bmi * 10) / 10,
    notes,
  };
}

/** Reparto habitual de las calorías del día entre franjas. */
const SHARE: Record<MealSlot, number> = { desayuno: 0.22, comida: 0.35, merienda: 0.1, cena: 0.3 };

/** Calorías objetivo de cada franja (sobre el total del día). */
export function slotTarget(slot: MealSlot, dailyKcal: number): number {
  return dailyKcal * SHARE[slot];
}

/** Porción de las calorías del día que cubren las franjas planificadas. */
export function plannedShare(meals: Partial<Record<MealSlot, boolean>>): number {
  return (Object.keys(SHARE) as MealSlot[]).filter((s) => meals[s]).reduce((sum, s) => sum + SHARE[s], 0);
}

export const MIN_PORTION = 0.6;
export const MAX_PORTION = 1.7;

/** Ración personal (múltiplo de la ración estándar) para cubrir el objetivo de esa franja. */
export function personalPortion(recipe: Recipe, slot: MealSlot, dailyKcal: number): number {
  const kcal = recipe.nutrition?.kcal;
  if (!kcal) return 1;
  const f = slotTarget(slot, dailyKcal) / kcal;
  return Math.round(Math.min(MAX_PORTION, Math.max(MIN_PORTION, f)) * 20) / 20;
}

/**
 * Ajusta las raciones del plan a tus calorías: tu ración se escala y la del
 * resto de la casa no cambia. Afecta a las cantidades de la compra.
 */
export function withPortions(plan: WeekPlan, profile: Profile): WeekPlan {
  const n = profile.nutrition;
  if (!isNutritionReady(n)) {
    if (!plan.meals.some((m) => m.myPortion !== undefined)) return plan;
    return {
      ...plan,
      meals: plan.meals.map((m) => {
        const copy = { ...m };
        delete copy.myPortion;
        delete copy.portions;
        return copy;
      }),
    };
  }
  const t = nutritionTargets(n);
  const meals = plan.meals.map((m) => {
    const recipe = getRecipe(m.recipeId);
    if (!recipe) return m;
    // Las sobras usan la misma ración que la cena de la que salen.
    const source = m.leftoverOfMealId ? plan.meals.find((x) => x.id === m.leftoverOfMealId) : undefined;
    const myPortion = personalPortion(recipe, source?.slot ?? m.slot, t.kcal);
    const times = m.eatServings > 0 ? m.servings / m.eatServings : 1;
    const base = m.servings * plan.portionFactor;
    const portions = Math.max(0.5, base - times + myPortion * times);
    return { ...m, myPortion, portions: Math.round(portions * 100) / 100 };
  });
  return { ...plan, meals };
}

/** Raciones equivalentes que hay que cocinar (y comprar) para esta comida. */
export function mealPortions(meal: PlannedMeal, plan: Pick<WeekPlan, "portionFactor">): number {
  return meal.portions ?? meal.servings * plan.portionFactor;
}

export interface DayNutrition {
  dayIndex: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Lo que comerás tú cada día según el plan (solo franjas planificadas). */
export function dailyIntake(plan: WeekPlan): DayNutrition[] {
  const days = new Map<number, DayNutrition>();
  for (const m of plan.meals) {
    if (m.status === "skipped") continue;
    const r = getRecipe(m.recipeId);
    if (!r?.nutrition) continue;
    const f = m.myPortion ?? 1;
    const d = days.get(m.dayIndex) ?? { dayIndex: m.dayIndex, kcal: 0, protein: 0, carbs: 0, fat: 0 };
    d.kcal += r.nutrition.kcal * f;
    d.protein += r.nutrition.protein * f;
    d.carbs += r.nutrition.carbs * f;
    d.fat += r.nutrition.fat * f;
    days.set(m.dayIndex, d);
  }
  return [...days.values()].sort((a, b) => a.dayIndex - b.dayIndex);
}

/**
 * Puntuación de encaje de una receta con tus objetivos para una franja:
 * cercanía de calorías (para no forzar raciones extremas) y densidad de proteína.
 */
export function nutritionFit(recipe: Recipe, slot: MealSlot, n: NutritionProfile, t: NutritionTargets): number {
  const nut = recipe.nutrition;
  if (!nut) return 0;
  const target = slotTarget(slot, t.kcal);
  const ratio = target / nut.kcal;
  let s = -Math.abs(Math.log(ratio)) * 5;
  if (ratio < MIN_PORTION || ratio > MAX_PORTION) s -= 4;
  const proteinShare = (nut.protein * 4) / nut.kcal;
  // Proteína: siempre cuenta; más si quieres perder grasa o ganar músculo.
  s += (proteinShare - 0.18) * (n.goal === "mantener" ? 15 : 35);
  return s;
}
