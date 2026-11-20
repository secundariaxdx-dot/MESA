"use client";

import { useMemo } from "react";
import { Clock, Repeat2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { RecipeArt } from "@/components/recipe/RecipeArt";
import { useMesa } from "@/store/mesa";
import { useCatalogs, useMarket } from "@/hooks/useMesaData";
import { findAlternatives } from "@/engine/planner";
import { formatMoney } from "@/engine/units";
import { getRecipe } from "@/data/recipes";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/primitives";

export function SwapSheet({ mealId, onClose, onSwapped }: { mealId: string | null; onClose(): void; onSwapped?(recipeId: string): void }) {
  const plan = useMesa((s) => s.plan);
  const profile = useMesa((s) => s.profile);
  const pantry = useMesa((s) => s.pantry);
  const swapMeal = useMesa((s) => s.swapMeal);
  const { catalog, extraCatalogs, minStoreSaving } = useCatalogs();
  const { currency } = useMarket();
  const meal = plan?.meals.find((m) => m.id === mealId);

  const alts = useMemo(
    () => (plan && mealId ? findAlternatives(plan, mealId, { profile, pantry, catalog, extraCatalogs, minStoreSaving }, 10) : []),
    [plan, mealId, profile, pantry, catalog, extraCatalogs, minStoreSaving],
  );
  const current = meal ? getRecipe(meal.recipeId) : undefined;

  return (
    <Sheet open={Boolean(mealId)} onClose={onClose} title="Cambiar este plato">
      {current && (
        <p className="mb-4 text-sm text-muted">
          Sustituye <strong className="text-ink">{current.name}</strong>. El resto de la semana no cambia. Todas las opciones respetan tus alergias y restricciones.
        </p>
      )}
      {meal?.kind === "leftover" && (
        <p className="mb-4 rounded-xl bg-sun-50 px-3 py-2 text-xs text-ink-2">Esta comida eran sobras. Si eliges otro plato, se cocinará aparte y la cena anterior volverá a su ración normal.</p>
      )}
      {!alts.length ? (
        <p className="rounded-2xl bg-mist p-4 text-sm text-muted">No hay más recetas compatibles con tus restricciones para esta franja. Prueba a ajustar tus preferencias.</p>
      ) : (
        <ul className="space-y-2.5">
          {alts.map((a) => (
            <li key={a.recipe.id}>
              <button
                onClick={() => {
                  if (!mealId) return;
                  swapMeal(mealId, a.recipe.id);
                  toast(`Cambiado por ${a.recipe.name}`);
                  onSwapped?.(a.recipe.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-soft transition hover:ring-2 hover:ring-cobalt-100 active:scale-[0.99]"
              >
                <RecipeArt recipe={a.recipe} variant="thumb" className="size-16 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.recipe.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {a.recipe.totalTime} min
                    </span>
                    {a.sharedIngredients > 0 && (
                      <span className="inline-flex items-center gap-1 text-leaf">
                        <Repeat2 className="size-3.5" /> {a.sharedIngredients} ingredientes compartidos
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-bold tabular", a.checkoutDelta > 0.004 ? "bg-tomato-50 text-tomato" : "bg-leaf-50 text-leaf")}>
                  {a.checkoutDelta > 0.004 ? "+" : a.checkoutDelta < -0.004 ? "−" : "±"}
                  {formatMoney(Math.abs(a.checkoutDelta), currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-center text-xs text-faint">La cifra indica cómo cambia lo que pagas en caja.</p>
    </Sheet>
  );
}
