"use client";

import { recipeHref } from "@/lib/routes";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Chip, EmptyState, Toggle, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { RecipeArt } from "@/components/recipe/RecipeArt";
import { RECIPES } from "@/data/recipes";
import { DIETS, prefName } from "@/data/taxonomy";
import { useCatalog, useMarket } from "@/hooks/useMesaData";
import { recipeCost } from "@/engine/shopping";
import { checkRecipe, normalize, recipeDiets } from "@/engine/compat";
import { formatMoney } from "@/engine/units";
import { getIngredient } from "@/data/ingredients";
import type { DietId, Difficulty, Recipe } from "@/domain/types";

type Collection = "todas" | "favoritas" | "desayunos" | "rapidas" | "economicas" | "tradicional" | "cuchara" | "verdura" | "proteina" | "freidora" | "aprovechamiento" | "takeaway" | "ligeras";

const COLLECTIONS: { id: Collection; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "favoritas", label: "♥ Favoritas" },
  { id: "desayunos", label: "☕ Desayunos y meriendas" },
  { id: "rapidas", label: "⚡ Rápidas" },
  { id: "economicas", label: "💶 Económicas" },
  { id: "tradicional", label: "🍳 Tradicionales" },
  { id: "cuchara", label: "🍲 De cuchara" },
  { id: "verdura", label: "🥦 Mucha verdura" },
  { id: "proteina", label: "💪 Proteicas" },
  { id: "freidora", label: "🌀 Freidora de aire" },
  { id: "aprovechamiento", label: "♻️ Aprovechamiento" },
  { id: "takeaway", label: "🌯 Take-away" },
  { id: "ligeras", label: "🥗 Ligeras" },
];

export default function Recetas() {
  const profile = useMesa((s) => s.profile);
  const favorites = useMesa((s) => s.favorites);
  const pantry = useMesa((s) => s.pantry);
  const catalog = useCatalog();
  const { currency } = useMarket();
  const [q, setQ] = useState("");
  const [col, setCol] = useState<Collection>("todas");
  const [onlyMine, setOnlyMine] = useState(true);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [diet, setDiet] = useState<DietId | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const enriched = useMemo(() => {
    const pantryIds = new Set(pantry.filter((p) => p.status === "ok" && p.ingredientId).map((p) => p.ingredientId!));
    const rows = RECIPES.map((r) => ({
      r,
      cps: recipeCost(r, 1, catalog).total,
      incompat: checkRecipe(r, profile),
      usesPantry: r.ingredients.filter((ri) => pantryIds.has(ri.ingredientId) && !getIngredient(ri.ingredientId).staple).length,
    }));
    const sorted = [...rows].sort((a, b) => a.cps - b.cps);
    const cheapCut = sorted[Math.floor(sorted.length / 3)]?.cps ?? 0;
    return rows.map((x) => ({ ...x, cheap: x.cps <= cheapCut }));
  }, [catalog, profile, pantry]);

  const filtersCount = [maxTime, maxCost, difficulty, diet].filter((x) => x !== null).length;

  const results = enriched.filter(({ r, cps, incompat, cheap, usesPantry }) => {
    if (onlyMine && incompat.length) return false;
    if (q && !normalize(`${r.name} ${r.description} ${r.ingredients.map((i) => getIngredient(i.ingredientId).name).join(" ")}`).includes(normalize(q))) return false;
    if (maxTime && r.totalTime > maxTime) return false;
    if (maxCost && cps > maxCost) return false;
    if (difficulty && r.difficulty !== difficulty) return false;
    if (diet && !recipeDiets(r).includes(diet)) return false;
    switch (col) {
      case "favoritas":
        return favorites.includes(r.id);
      case "desayunos":
        return r.mealTypes.includes("desayuno") || r.mealTypes.includes("merienda");
      case "rapidas":
        return r.totalTime <= 30;
      case "economicas":
        return cheap;
      case "freidora":
        return r.tags.includes("freidora");
      case "aprovechamiento":
        return r.tags.includes("aprovechamiento") || usesPantry > 0;
      case "todas":
        return true;
      default:
        return r.categories.includes(col);
    }
  });

  return (
    <>
      <PageHeader title="Recetas" subtitle={`${RECIPES.length} recetas en el catálogo · las mismas que usa tu semana`} />
      <div className="px-4 sm:px-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca recetas o ingredientes" className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-10 text-base outline-none focus:border-cobalt" aria-label="Buscar recetas" />
            {q && (
              <button aria-label="Borrar búsqueda" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint">
                <X className="size-4" />
              </button>
            )}
          </div>
          <button onClick={() => setFiltersOpen(true)} aria-label="Filtros" className={cn("relative grid size-12 place-items-center rounded-2xl", filtersCount ? "bg-cobalt text-white" : "bg-white text-ink ring-1 ring-line")}>
            <SlidersHorizontal className="size-5" />
            {filtersCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sun text-[11px] font-bold text-ink">{filtersCount}</span>}
          </button>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {COLLECTIONS.map((c) => (
            <Chip key={c.id} active={col === c.id} onClick={() => setCol(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-soft">
          <span className="text-sm font-medium">Solo recetas compatibles con mi casa</span>
          <Toggle checked={onlyMine} onChange={setOnlyMine} label="Solo compatibles" />
        </div>

        <p className="mb-3 mt-5 text-sm font-semibold text-muted">{results.length} recetas</p>
        {!results.length ? (
          <EmptyState icon="🍽️" title="Sin resultados" text={col === "favoritas" ? "Marca recetas con el corazón para verlas aquí." : "Prueba con otra búsqueda o quita algún filtro."} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {results.map(({ r, cps, incompat }) => (
              <RecipeTile key={r.id} recipe={r} cps={cps} fav={favorites.includes(r.id)} incompat={incompat.map((i) => i.label)} allergy={incompat.some((i) => i.type === "allergen")} currency={currency} />
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              block
              onClick={() => {
                setMaxTime(null);
                setMaxCost(null);
                setDifficulty(null);
                setDiet(null);
              }}
            >
              Limpiar
            </Button>
            <Button block onClick={() => setFiltersOpen(false)}>
              Ver {results.length} recetas
            </Button>
          </div>
        }
      >
        <FilterGroup label="Tiempo máximo">
          {[15, 30, 45].map((t) => (
            <Chip key={t} active={maxTime === t} onClick={() => setMaxTime(maxTime === t ? null : t)}>
              {t} min
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Coste por ración">
          {[1, 1.5, 2.5].map((c) => (
            <Chip key={c} active={maxCost === c} onClick={() => setMaxCost(maxCost === c ? null : c)}>
              hasta {formatMoney(c, currency)}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Dificultad">
          {(["Fácil", "Media", "Elaborada"] as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
              {d}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Dieta">
          {DIETS.filter((d) => d.id !== "omnivora").map((d) => (
            <Chip key={d.id} active={diet === d.id} onClick={() => setDiet(diet === d.id ? null : d.id)}>
              {d.icon} {d.name}
            </Chip>
          ))}
        </FilterGroup>
      </Sheet>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function RecipeTile({ recipe, cps, fav, incompat, allergy, currency }: { recipe: Recipe; cps: number; fav: boolean; incompat: string[]; allergy: boolean; currency: "EUR" | "NOK" | "GBP" | "USD" }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link href={recipeHref(recipe.id)} className="group block overflow-hidden rounded-[var(--radius-card)] bg-white shadow-soft transition hover:shadow-lift">
        <div className="relative">
          <RecipeArt recipe={recipe} className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]" />
          {fav && (
            <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90">
              <Heart className="size-4 fill-tomato text-tomato" />
            </span>
          )}
          {incompat.length > 0 && (
            <span className={cn("absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold", allergy ? "bg-tomato text-white" : "bg-sun text-ink")} title={incompat.join(" · ")}>
              {allergy ? "No apta (alergia)" : "No encaja contigo"}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cobalt">{recipe.categories.slice(0, 2).map(prefName).join(" · ")}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5em] font-display text-[15px] font-bold leading-tight">{recipe.name}</h3>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {recipe.totalTime} min
            </span>
            <span className="font-semibold text-ink-2 tabular">≈ {formatMoney(cps, currency)}/rac.</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
