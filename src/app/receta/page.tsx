"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cookHref, recipeHref } from "@/lib/routes";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, ChefHat, Clock, Flame, Heart, Minus, Plus, RefreshCw, Refrigerator, Scale, Snowflake, Users, Utensils } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { Gate } from "@/components/layout/AppShell";
import { RecipeArt } from "@/components/recipe/RecipeArt";
import { BackButton, Button, Card, EmptyState, Pill, Toggle, cn } from "@/components/ui/primitives";
import { SwapSheet } from "@/components/week/SwapSheet";
import { AllergyWarning } from "@/components/profile/fields";
import { getRecipe } from "@/data/recipes";
import { getIngredient } from "@/data/ingredients";
import { allergenName, applianceName, DAYS, prefName } from "@/data/taxonomy";
import { useCatalog, useMarket } from "@/hooks/useMesaData";
import { recipeCost, ingredientQty, pantryAvailable } from "@/engine/shopping";
import { checkRecipe, recipeAllergens, recipeDiets } from "@/engine/compat";
import { formatMoney, formatQty, toHousehold } from "@/engine/units";
import { longDate } from "@/engine/dates";
import { toast } from "@/components/ui/Toast";

export default function RecetaPage() {
  return (
    <Gate>
      <Suspense fallback={null}>
        <Receta />
      </Suspense>
    </Gate>
  );
}

function Receta() {
  const params = useSearchParams();
  const recipeId = params.get("r") ?? "";
  const mealId = params.get("m") ?? undefined;
  const recipe = getRecipe(recipeId);
  const router = useRouter();
  const plan = useMesa((s) => s.plan);
  const profile = useMesa((s) => s.profile);
  const pantry = useMesa((s) => s.pantry);
  const favorites = useMesa((s) => s.favorites);
  const toggleFavorite = useMesa((s) => s.toggleFavorite);
  const toggleHave = useMesa((s) => s.toggleHave);
  const markCooked = useMesa((s) => s.markCooked);
  const settings = useMesa((s) => s.settings);
  const updateSettings = useMesa((s) => s.updateSettings);
  const cookingKey = mealId ?? recipeId;
  const progress = useMesa((s) => s.cooking[cookingKey]);
  const saveCooking = useMesa((s) => s.saveCooking);
  const catalog = useCatalog();
  const { currency } = useMarket();
  const meal = mealId ? plan?.meals.find((m) => m.id === mealId) : undefined;
  const defaultServings = meal?.servings ?? plan?.people ?? profile.adults + profile.children;
  const [servings, setServings] = useState(defaultServings);
  const [swapOpen, setSwapOpen] = useState(false);
  const household = settings.householdMeasures;
  const portionFactor = meal ? plan!.portionFactor : 1;

  const cost = useMemo(() => (recipe ? recipeCost(recipe, servings, catalog, portionFactor) : null), [recipe, servings, catalog, portionFactor]);
  if (!recipe || !cost) {
    return (
      <div className="p-6">
        <EmptyState icon="🔍" title="Receta no encontrada" text="Puede que ya no exista en el catálogo." action={<Button onClick={() => router.push("/recetas")}>Ver recetas</Button>} />
      </div>
    );
  }

  const fav = favorites.includes(recipe.id);
  const allergens = recipeAllergens(recipe);
  const incompat = checkRecipe(recipe, profile);
  const cooked = meal?.status === "cooked";
  const isLeftover = meal?.kind === "leftover";

  const startCooking = () => {
    if (!progress) {
      saveCooking({ key: cookingKey, recipeId: recipe.id, mealId, step: 0, servings, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), doneTasks: [] });
    }
    router.push(cookHref(recipe.id, mealId));
  };

  return (
    <div className="min-h-dvh bg-paper pb-36">
      <div className="relative">
        <RecipeArt recipe={recipe} variant="hero" className="h-[42vh] min-h-[280px] w-full lg:h-[46vh]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <BackButton light />
          <button
            aria-label={fav ? "Quitar de favoritas" : "Añadir a favoritas"}
            onClick={() => {
              toggleFavorite(recipe.id);
              toast(fav ? "Quitada de favoritas" : "Guardada en favoritas");
            }}
            className="grid size-10 place-items-center rounded-full bg-white/90 shadow-soft backdrop-blur"
          >
            <Heart className={cn("size-5", fav ? "fill-tomato text-tomato" : "text-ink")} />
          </button>
        </div>
      </div>

      <div className="relative mx-auto -mt-8 max-w-3xl rounded-t-[32px] bg-paper px-5 pt-6 sm:px-8">
        <div className="flex flex-wrap gap-1.5">
          {meal && (
            <Pill className="bg-cobalt text-white">
              {DAYS[meal.dayIndex].name} · {meal.slot === "cena" ? "Cena" : "Comida"}
              {isLeftover ? " · Sobras" : ""}
            </Pill>
          )}
          {recipe.categories.map((c) => (
            <Pill key={c}>{prefName(c)}</Pill>
          ))}
          {cooked && <Pill className="bg-leaf-50 text-leaf">✓ Cocinado</Pill>}
        </div>
        <h1 className="mt-3 text-[30px] font-extrabold leading-[1.08] sm:text-4xl">{recipe.name}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{recipe.description}</p>

        {incompat.length > 0 && (
          <div className={cn("mt-4 flex gap-2.5 rounded-2xl p-3.5 text-sm", incompat.some((i) => i.type === "allergen") ? "bg-tomato-50 text-tomato" : "bg-sun-50 text-ink-2")}>
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-bold">{incompat.some((i) => i.type === "allergen") ? "No apta para tu casa" : "No encaja con tus preferencias"}</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {incompat.map((i) => (
                  <li key={i.label}>{i.label}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Datos principales */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat icon={<Clock className="size-4" />} label="Tiempo total" value={`${recipe.totalTime} min`} sub={`${recipe.activeTime} min activos`} />
          <Stat icon={<Flame className="size-4" />} label="Dificultad" value={recipe.difficulty} />
          <div className="rounded-2xl bg-white p-3 shadow-soft">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Users className="size-4" /> Raciones
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <button aria-label="Menos raciones" onClick={() => setServings(Math.max(1, servings - 1))} className="grid size-8 place-items-center rounded-full bg-mist">
                <Minus className="size-4" />
              </button>
              <span className="font-display text-xl font-bold tabular" data-testid="servings">
                {servings}
              </span>
              <button aria-label="Más raciones" onClick={() => setServings(Math.min(20, servings + 1))} className="grid size-8 place-items-center rounded-full bg-cobalt text-white">
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <Stat label="Coste por ración" value={`≈ ${formatMoney(cost.perServing, currency)}`} sub={`≈ ${formatMoney(cost.total, currency)} en total`} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Coste aproximado de los ingredientes que consume la receta (proporcional), no lo que pagas en caja. {catalog.isDemo ? "Precios de demostración" : "Precios de referencia"} · {longDate(catalog.referenceDate)}.
          {meal?.feedsMealId && " Incluye las raciones para la comida de mañana."}
        </p>

        {/* Ingredientes */}
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-extrabold">Ingredientes</h2>
            <span className="text-xs text-muted">Toca para marcar «Lo tienes»</span>
          </div>
          <button
            onClick={() => updateSettings({ householdMeasures: !household })}
            className={cn("mb-3 flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition", household ? "border-cobalt bg-cobalt-50" : "border-line bg-white")}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-soft">
              <Scale className="size-5 text-cobalt" />
            </span>
            <span className="flex-1">
              <span className="block font-bold">¿Sin báscula ni medidores?</span>
              <span className="block text-xs text-muted">Ver cucharadas, vasos, tazas y unidades cuando haya equivalencia fiable</span>
            </span>
            <Toggle checked={household} onChange={(v) => updateSettings({ householdMeasures: v })} label="Medidas caseras" />
          </button>
          <Card className="divide-y divide-line">
            {recipe.ingredients.map((ri) => {
              const ing = getIngredient(ri.ingredientId);
              const qty = ingredientQty(ri.perServing, servings, portionFactor);
              const line = cost.lines.find((l) => l.ingredientId === ri.ingredientId);
              const avail = pantryAvailable(pantry, ri.ingredientId);
              const have = avail >= qty * 0.95;
              const partial = !have && avail > 0;
              const hh = household ? toHousehold(ing, qty) : null;
              return (
                <button key={ri.ingredientId} onClick={() => {
                  toggleHave(ri.ingredientId);
                  toast(have ? `${ing.name} quitado de tu despensa` : `${ing.name} marcado como «Lo tienes»`, "info");
                }} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mist/60" data-testid={`ing-${ri.ingredientId}`}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mist text-2xl">{ing.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{ing.name}</span>
                    <span className="block text-sm text-ink-2 tabular" data-testid={`qty-${ri.ingredientId}`}>
                      {household ? (
                        hh ? (
                          <>
                            {hh.text} <span className="text-xs text-faint">({formatQty(qty, ing.unit)})</span>
                          </>
                        ) : (
                          <>
                            {formatQty(qty, ing.unit)} <span className="text-xs text-faint">· sin equivalencia fiable</span>
                          </>
                        )
                      ) : (
                        formatQty(qty, ing.unit)
                      )}
                    </span>
                    {household && hh?.note && <span className="block text-[11px] text-faint">{hh.note}</span>}
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {have ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] font-bold text-leaf">
                        <Check className="size-3" strokeWidth={3} /> Lo tienes
                      </span>
                    ) : partial ? (
                      <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-bold text-[#9a6f00]">Tienes {formatQty(avail, ing.unit)}</span>
                    ) : (
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-faint">Comprar</span>
                    )}
                    <span className="text-xs text-muted tabular">{line?.cost != null ? `≈ ${formatMoney(line.cost, currency)}` : "—"}</span>
                  </span>
                </button>
              );
            })}
          </Card>
        </section>

        {/* Pasos */}
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-extrabold">Preparación</h2>
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cobalt text-sm font-bold text-white">{i + 1}</span>
                <div className="flex-1 pt-1">
                  <p className="text-[15px] leading-relaxed">{s.text}</p>
                  {s.timerMin && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cobalt"><Clock className="size-3.5" /> {s.timerMin} min</p>}
                  {s.tip && <p className="mt-1.5 rounded-xl bg-sun-50 px-3 py-2 text-xs text-ink-2">💡 {s.tip}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {recipe.utensils.map((u) => (
              <Pill key={u}>
                <Utensils className="size-3" /> {u}
              </Pill>
            ))}
            {recipe.appliances.map((g, i) => (
              <Pill key={i} className="bg-cobalt-50 text-cobalt">
                {g.map(applianceName).join(" o ")}
              </Pill>
            ))}
          </div>
        </section>

        {/* Conservación */}
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-extrabold">Cómo guardarlo</h2>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-cobalt-50 text-cobalt">
                <Refrigerator className="size-6" />
              </span>
              <div>
                <p className="font-bold">{recipe.storage.method}</p>
                <p className="text-sm text-muted">
                  {recipe.storage.method === "Consumir al momento"
                    ? "Mejor recién hecho"
                    : `Aguanta aproximadamente ${recipe.storage.days[0] === recipe.storage.days[1] ? recipe.storage.days[0] : `${recipe.storage.days[0]}-${recipe.storage.days[1]}`} días`}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-mist p-3">
                <dt className="text-xs text-muted">Recipiente</dt>
                <dd className="font-semibold">{recipe.storage.container}</dd>
              </div>
              <div className="rounded-xl bg-mist p-3">
                <dt className="flex items-center gap-1 text-xs text-muted">
                  <Snowflake className="size-3" /> Congelación
                </dt>
                <dd className="font-semibold">{recipe.storage.freezable ? `Sí, hasta ${recipe.storage.freezeMonths ?? 2} meses` : "No recomendada"}</dd>
              </div>
            </dl>
            {recipe.storage.notes && <p className="mt-3 text-sm text-ink-2">{recipe.storage.notes}</p>}
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              Tiempos orientativos con buena refrigeración (≤ 4 °C) y enfriado rápido. No son una garantía: ante cualquier duda de olor, aspecto o textura, no lo consumas.
            </p>
          </Card>
        </section>

        {/* Alérgenos */}
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-extrabold">Alérgenos</h2>
          <Card className="p-4">
            {allergens.length ? (
              <>
                <p className="text-sm text-muted">Detectados en los ingredientes declarados:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allergens.map((a) => (
                    <span key={a} className={cn("rounded-full px-3 py-1 text-sm font-semibold", profile.allergens.includes(a) ? "bg-tomato text-white" : "bg-tomato-50 text-tomato")}>
                      {allergenName(a)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">No hemos detectado alérgenos de declaración obligatoria en los ingredientes declarados. Esto no garantiza su ausencia: revisa los envases y las posibles trazas.</p>
            )}
            <AllergyWarning className="mt-3" />
            <p className="mt-3 text-xs text-muted">Apta para: {recipeDiets(recipe).map((d) => ({ omnivora: "todo el mundo", vegetariana: "vegetarianos", vegana: "veganos", pescetariana: "pescetarianos" })[d]).join(", ")}.</p>
          </Card>
        </section>

        {recipe.nutrition && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-extrabold">Por ración (aprox.)</h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["kcal", recipe.nutrition.kcal],
                ["proteína", `${recipe.nutrition.protein} g`],
                ["hidratos", `${recipe.nutrition.carbs} g`],
                ["grasa", `${recipe.nutrition.fat} g`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-white p-3 shadow-soft">
                  <p className="font-display text-lg font-bold">{v}</p>
                  <p className="text-[11px] text-muted">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-faint">Valores estimados a partir de tablas de composición; orientativos.</p>
          </section>
        )}
      </div>

      {/* Acciones */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-4 py-3 sm:flex">
          {meal && !cooked && (
            <Button variant="ghost" size="md" onClick={() => setSwapOpen(true)} className="px-2 text-sm sm:flex-none sm:px-5">
              <RefreshCw className="size-4" /> Cambiar este plato
            </Button>
          )}
          <Button
            variant={cooked ? "success" : "secondary"}
            size="md"
            className={cn("px-2 text-sm sm:flex-1", !(meal && !cooked) && "col-span-2")}
            disabled={cooked}
            onClick={() => {
              markCooked({ mealId, recipeId: recipe.id, servings, portionFactor });
              toast(isLeftover ? "¡Sobras aprovechadas!" : "¡Lo has cocinado! Despensa actualizada.");
            }}
          >
            <Check className="size-4" /> {cooked ? "Cocinado" : "Lo he cocinado"}
          </Button>
          <Button size="md" className="col-span-2 sm:flex-1" onClick={startCooking} data-testid="cocinar-ahora">
            <ChefHat className="size-4" /> {progress ? `Seguir (paso ${progress.step + 1})` : "Cocinar ahora"}
          </Button>
        </div>
      </div>

      {meal && (
        <SwapSheet
          mealId={swapOpen ? meal.id : null}
          onClose={() => setSwapOpen(false)}
          onSwapped={(id) => router.replace(recipeHref(id, meal.id))}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-3 shadow-soft">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold leading-tight tabular">{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </motion.div>
  );
}
