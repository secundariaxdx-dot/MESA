"use client";

import { recipeHref } from "@/lib/routes";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Clock, RefreshCw, Undo2, Users, XCircle } from "lucide-react";
import type { PlannedMeal } from "@/domain/types";
import { getRecipe } from "@/data/recipes";
import { prefName, slotName } from "@/data/taxonomy";
import { RecipeArt } from "@/components/recipe/RecipeArt";
import { cn } from "@/components/ui/primitives";
import { useMesa } from "@/store/mesa";
import { useCatalog, useMarket } from "@/hooks/useMesaData";
import { recipeCost } from "@/engine/shopping";
import { formatMoney } from "@/engine/units";
import { toast } from "@/components/ui/Toast";

export function MealCard({ meal, onSwap }: { meal: PlannedMeal; onSwap(id: string): void }) {
  const recipe = getRecipe(meal.recipeId);
  const plan = useMesa((s) => s.plan)!;
  const markCooked = useMesa((s) => s.markCooked);
  const unmarkCooked = useMesa((s) => s.unmarkCooked);
  const skipMeal = useMesa((s) => s.skipMeal);
  const restoreMeal = useMesa((s) => s.restoreMeal);
  const catalog = useCatalog();
  const { currency } = useMarket();
  if (!recipe) return null;

  const cost = meal.kind === "cook" ? recipeCost(recipe, meal.servings, catalog, plan.portionFactor).total : 0;
  const leftoverSource = meal.leftoverOfMealId ? plan.meals.find((m) => m.id === meal.leftoverOfMealId) : undefined;
  const skipped = meal.status === "skipped";
  const cooked = meal.status === "cooked";
  const category = recipe.categories.map(prefName)[0];

  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("group relative overflow-hidden rounded-[var(--radius-card)] bg-white shadow-soft", skipped && "opacity-60")}>
      <Link href={recipeHref(recipe.id, meal.id)} className="flex gap-3.5 p-3 pr-14">
        <div className="relative shrink-0">
          <RecipeArt recipe={recipe} className="size-[92px] rounded-2xl sm:size-24" />
          {cooked && (
            <span className="absolute inset-0 grid place-items-center rounded-2xl bg-leaf/75 text-white">
              <Check className="size-8" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cobalt">
            {slotName(meal.slot)} · {meal.kind === "leftover" ? "Sobras" : category ?? recipe.cuisine}
          </p>
          <h3 className={cn("mt-0.5 line-clamp-2 font-display text-[17px] font-bold leading-snug", skipped && "line-through")}>{recipe.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
            {meal.kind === "leftover" ? (
              <span>De la cena del día anterior · sin cocinar</span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {recipe.totalTime} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {meal.servings} raciones{meal.feedsMealId ? ` (${meal.eatServings} para mañana)` : ""}
                </span>
                <span className="font-semibold text-ink-2 tabular" title="Coste proporcional de los ingredientes que consume la receta">
                  ≈ {formatMoney(cost, currency)}
                </span>
              </>
            )}
          </div>
          {leftoverSource && leftoverSource.status === "skipped" && <p className="mt-1 text-xs text-tomato">La cena de origen está desprogramada.</p>}
        </div>
      </Link>

      {/* Marcar como cocinado */}
      {!skipped && (
        <button
          aria-label={cooked ? "Desmarcar como cocinado" : "Marcar como cocinado"}
          onClick={() => {
            if (cooked) {
              unmarkCooked(meal.id);
              toast("Marcado como pendiente", "info");
            } else {
              markCooked({ mealId: meal.id, recipeId: recipe.id, servings: meal.servings });
              toast(meal.kind === "cook" ? "¡Hecho! Hemos descontado los ingredientes de tu despensa." : "¡Sobras aprovechadas!");
            }
          }}
          className={cn(
            "absolute right-3 top-3 grid size-9 place-items-center rounded-full border-2 transition active:scale-90",
            cooked ? "border-leaf bg-leaf text-white" : "border-line bg-white text-faint hover:border-leaf hover:text-leaf",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </button>
      )}

      <div className="flex border-t border-line text-xs font-semibold">
        {skipped ? (
          <button onClick={() => restoreMeal(meal.id)} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-cobalt hover:bg-cobalt-50">
            <Undo2 className="size-4" /> Volver a programar
          </button>
        ) : (
          <>
            <button onClick={() => onSwap(meal.id)} disabled={cooked} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-ink-2 hover:bg-mist disabled:opacity-40">
              <RefreshCw className="size-4" /> Cambiar
            </button>
            <span className="w-px bg-line" />
            <button
              disabled={cooked}
              onClick={() => {
                skipMeal(meal.id);
                toast(meal.feedsMealId ? "Plato desprogramado (y sus sobras)" : "Plato desprogramado", "info", { label: "Deshacer", onClick: () => restoreMeal(meal.id) });
              }}
              className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-ink-2 hover:bg-mist disabled:opacity-40"
            >
              <XCircle className="size-4" /> Quitar
            </button>
          </>
        )}
      </div>
    </motion.article>
  );
}
