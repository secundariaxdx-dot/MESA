"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CookedEntry, CookingProgress, PantryItem, Profile, PurchaseRecord, ShoppingList, WeekPlan } from "@/domain/types";
import { DEMO_PANTRY_STAPLES, DEMO_PROFILE, EMPTY_PROFILE } from "@/data/demo";
import { DEMO_RECIPE_IDS, getRecipe } from "@/data/recipes";
import { getCatalogSync } from "@/services/prices/provider";
import { storageAdapter } from "@/services/storage/adapter";
import { planFromRecipes, replaceRecipe } from "@/engine/planner";
import { addPurchaseToPantry, consumeFromPantry, newPantryItem, uid } from "@/engine/pantry";
import { addRecipeNeeds, type Need } from "@/engine/shopping";
import { nextWeekStart, todayISO } from "@/engine/dates";

export interface Settings {
  notifications: { timers: boolean; weekly: boolean; expiring: boolean };
  householdMeasures: boolean;
}

export type GenerationReason = "onboarding" | "otra" | "preferencias";

interface MesaState {
  hydrated: boolean;
  onboardingDone: boolean;
  profile: Profile;
  draft: Profile;
  draftStep: number;
  plan: WeekPlan | null;
  history: WeekPlan[];
  checked: Record<string, string[]>;
  pantry: PantryItem[];
  purchases: PurchaseRecord[];
  favorites: string[];
  cooked: CookedEntry[];
  cooking: Record<string, CookingProgress>;
  settings: Settings;
  generation: GenerationReason | null;

  setDraft(p: Partial<Profile>): void;
  setDraftStep(n: number): void;
  startOnboarding(fromScratch?: boolean): void;
  commitDraft(): void;
  loadDemo(): void;
  requestGeneration(reason: GenerationReason): void;
  setPlan(plan: WeekPlan): void;
  updateProfile(p: Partial<Profile>): void;
  swapMeal(mealId: string, recipeId: string): void;
  skipMeal(mealId: string): void;
  restoreMeal(mealId: string): void;
  markCooked(args: { mealId?: string; recipeId: string; servings: number; portionFactor?: number }): void;
  unmarkCooked(mealId: string): void;
  toggleChecked(ingredientId: string): void;
  completePurchase(list: ShoppingList): void;
  addPantry(item: PantryItem): void;
  updatePantry(id: string, patch: Partial<PantryItem>): void;
  removePantry(id: string): void;
  toggleHave(ingredientId: string): void;
  toggleFavorite(recipeId: string): void;
  saveCooking(p: CookingProgress): void;
  clearCooking(key: string): void;
  updateSettings(s: Partial<Settings>): void;
  importData(json: string): boolean;
  resetAll(): void;
}

const DEFAULT_SETTINGS: Settings = {
  notifications: { timers: true, weekly: false, expiring: true },
  householdMeasures: false,
};

const initialData = {
  onboardingDone: false,
  profile: EMPTY_PROFILE,
  draft: EMPTY_PROFILE,
  draftStep: 0,
  plan: null as WeekPlan | null,
  history: [] as WeekPlan[],
  checked: {} as Record<string, string[]>,
  pantry: [] as PantryItem[],
  purchases: [] as PurchaseRecord[],
  favorites: [] as string[],
  cooked: [] as CookedEntry[],
  cooking: {} as Record<string, CookingProgress>,
  settings: DEFAULT_SETTINGS,
  generation: null as GenerationReason | null,
};

function needsFor(recipeId: string, servings: number, portionFactor = 1): Map<string, Need> {
  const m = new Map<string, Need>();
  const r = getRecipe(recipeId);
  if (r) addRecipeNeeds(m, r, servings, portionFactor);
  return m;
}

export const useMesa = create<MesaState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initialData,

      setDraft: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      setDraftStep: (n) => set({ draftStep: n }),
      startOnboarding: (fromScratch = true) =>
        set((s) => ({ draft: fromScratch ? EMPTY_PROFILE : s.profile, draftStep: 0 })),
      commitDraft: () => set((s) => ({ profile: s.draft, onboardingDone: true })),

      loadDemo: () => {
        const pantry = DEMO_PANTRY_STAPLES.map((id) => newPantryItem(id, id, null));
        const plan = planFromRecipes(
          { profile: DEMO_PROFILE, pantry, catalog: getCatalogSync(DEMO_PROFILE.supermarketId), seed: 1, weekStart: nextWeekStart() },
          DEMO_RECIPE_IDS,
        );
        set({ ...initialData, hydrated: true, profile: DEMO_PROFILE, draft: DEMO_PROFILE, onboardingDone: true, pantry, plan });
      },

      requestGeneration: (reason) => set({ generation: reason }),

      setPlan: (plan) =>
        set((s) => ({
          plan,
          history: s.plan ? [s.plan, ...s.history].slice(0, 20) : s.history,
          generation: null,
        })),

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      swapMeal: (mealId, recipeId) =>
        set((s) => (s.plan ? { plan: replaceRecipe(s.plan, mealId, recipeId) } : {})),

      skipMeal: (mealId) =>
        set((s) => {
          if (!s.plan) return {};
          const target = s.plan.meals.find((m) => m.id === mealId);
          const meals = s.plan.meals.map((m) =>
            m.id === mealId || (target?.feedsMealId && m.id === target.feedsMealId) ? { ...m, status: "skipped" as const } : m,
          );
          return { plan: { ...s.plan, meals } };
        }),

      restoreMeal: (mealId) =>
        set((s) => {
          if (!s.plan) return {};
          const target = s.plan.meals.find((m) => m.id === mealId);
          const meals = s.plan.meals.map((m) =>
            m.id === mealId || (target?.feedsMealId && m.id === target.feedsMealId) ? { ...m, status: "planned" as const } : m,
          );
          return { plan: { ...s.plan, meals } };
        }),

      markCooked: ({ mealId, recipeId, servings, portionFactor }) =>
        set((s) => {
          const meal = mealId ? s.plan?.meals.find((m) => m.id === mealId) : undefined;
          if (meal?.status === "cooked") return {};
          // Las sobras ya se descontaron al cocinar la cena original.
          const consumes = !meal || meal.kind === "cook";
          const pf = portionFactor ?? (meal ? s.plan!.portionFactor : 1);
          const pantry = consumes ? consumeFromPantry(s.pantry, needsFor(recipeId, servings, pf)) : s.pantry;
          const plan =
            s.plan && meal ? { ...s.plan, meals: s.plan.meals.map((m) => (m.id === mealId ? { ...m, status: "cooked" as const } : m)) } : s.plan;
          const entry: CookedEntry = { id: uid("c"), recipeId, mealId, date: todayISO(), servings };
          const cooking = { ...s.cooking };
          delete cooking[mealId ?? recipeId];
          return { pantry, plan, cooked: [entry, ...s.cooked], cooking };
        }),

      unmarkCooked: (mealId) =>
        set((s) =>
          s.plan
            ? {
                plan: { ...s.plan, meals: s.plan.meals.map((m) => (m.id === mealId ? { ...m, status: "planned" as const } : m)) },
                cooked: s.cooked.filter((c) => c.mealId !== mealId),
              }
            : {},
        ),

      toggleChecked: (ingredientId) =>
        set((s) => {
          if (!s.plan) return {};
          const cur = s.checked[s.plan.id] ?? [];
          const next = cur.includes(ingredientId) ? cur.filter((x) => x !== ingredientId) : [...cur, ingredientId];
          return { checked: { ...s.checked, [s.plan.id]: next } };
        }),

      completePurchase: (list) =>
        set((s) => {
          if (!s.plan) return {};
          const record: PurchaseRecord = {
            id: uid("buy"),
            planId: s.plan.id,
            date: new Date().toISOString(),
            supermarketId: list.supermarketId,
            stores: list.stores.filter((st) => st.itemCount > 0),
            currency: list.currency,
            total: list.checkoutTotal,
            items: list.toBuy.map((i) => ({
              ingredientId: i.ingredientId,
              name: i.name,
              qty: i.purchasedQty,
              unit: i.unit,
              cost: i.cost,
              packs: i.packs.map((p) => `${p.count} × ${p.packLabel}`).join(" + "),
              supermarketId: i.supermarketId,
            })),
          };
          return {
            purchases: [record, ...s.purchases],
            pantry: addPurchaseToPantry(s.pantry, list),
            plan: { ...s.plan, purchaseId: record.id },
          };
        }),

      addPantry: (item) => set((s) => ({ pantry: [item, ...s.pantry] })),
      updatePantry: (id, patch) => set((s) => ({ pantry: s.pantry.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePantry: (id) => set((s) => ({ pantry: s.pantry.filter((p) => p.id !== id) })),
      toggleHave: (ingredientId) =>
        set((s) => {
          const has = s.pantry.some((p) => p.ingredientId === ingredientId && p.status === "ok");
          if (has) return { pantry: s.pantry.filter((p) => p.ingredientId !== ingredientId) };
          return { pantry: [newPantryItem(ingredientId, ingredientId, null, { source: "receta" }), ...s.pantry] };
        }),

      toggleFavorite: (recipeId) =>
        set((s) => ({
          favorites: s.favorites.includes(recipeId) ? s.favorites.filter((f) => f !== recipeId) : [...s.favorites, recipeId],
        })),

      saveCooking: (p) => set((s) => ({ cooking: { ...s.cooking, [p.key]: p } })),
      clearCooking: (key) =>
        set((s) => {
          const c = { ...s.cooking };
          delete c[key];
          return { cooking: c };
        }),

      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          const state = data.state ?? data;
          if (!state.profile || !Array.isArray(state.pantry)) return false;
          set({ ...initialData, ...state, hydrated: true });
          return true;
        } catch {
          return false;
        }
      },

      resetAll: () => set({ ...initialData, hydrated: true }),
    }),
    {
      name: "mesa-v1",
      version: 1,
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, generation, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
      // La hidratación desde localStorage es síncrona y puede ocurrir antes de
      // que `useMesa` esté asignado: diferimos la marca de hidratado.
      onRehydrateStorage: () => () => {
        queueMicrotask(() => useMesa.setState({ hydrated: true }));
      },
    },
  ),
);

export function exportState(): string {
  const s = useMesa.getState();
  return JSON.stringify(
    {
      app: "MESA",
      exportedAt: new Date().toISOString(),
      state: {
        onboardingDone: s.onboardingDone,
        profile: s.profile,
        plan: s.plan,
        history: s.history,
        checked: s.checked,
        pantry: s.pantry,
        purchases: s.purchases,
        favorites: s.favorites,
        cooked: s.cooked,
        cooking: s.cooking,
        settings: s.settings,
      },
    },
    null,
    2,
  );
}
