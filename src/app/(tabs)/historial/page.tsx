"use client";

import Link from "next/link";
import { useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { BackButton, Card, EmptyState } from "@/components/ui/primitives";
import { getRecipe } from "@/data/recipes";
import { getSupermarket, getCountry } from "@/data/geo";
import { shortDate, addDays } from "@/engine/dates";
import { formatMoney } from "@/engine/units";
import { RecipeArt } from "@/components/recipe/RecipeArt";

export default function Historial() {
  const plan = useMesa((s) => s.plan);
  const history = useMesa((s) => s.history);
  const purchases = useMesa((s) => s.purchases);
  const cooked = useMesa((s) => s.cooked);
  const weeks = [...(plan ? [plan] : []), ...history];

  return (
    <>
      <PageHeader title="Historial" left={<BackButton href="/ajustes" />} />
      <div className="space-y-8 px-4 sm:px-6">
        <section>
          <h2 className="mb-3 text-lg font-bold">Semanas</h2>
          {!weeks.length ? (
            <EmptyState icon="🗓️" title="Sin semanas" text="Tus planificaciones aparecerán aquí." />
          ) : (
            <div className="space-y-3">
              {weeks.map((w, i) => {
                const currency = getCountry(w.countryId).currency;
                const cookedN = w.meals.filter((m) => m.status === "cooked").length;
                return (
                  <Card key={w.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">
                          Semana del {shortDate(w.weekStart)} al {shortDate(addDays(w.weekStart, 6))} {i === 0 && plan ? <span className="ml-1 rounded-full bg-cobalt-50 px-2 py-0.5 text-xs text-cobalt">Actual</span> : null}
                        </p>
                        <p className="text-sm text-muted">
                          {getSupermarket(w.supermarketId).name} · {w.meals.length} platos · {cookedN} cocinados · estimado {formatMoney(w.estimatedTotal, currency)}
                        </p>
                      </div>
                    </div>
                    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                      {[...new Set(w.meals.map((m) => m.recipeId))].map((id) => {
                        const r = getRecipe(id);
                        return r ? (
                          <Link key={id} href={`/receta/${id}`} className="w-28 shrink-0">
                            <RecipeArt recipe={r} variant="thumb" className="aspect-square w-full rounded-xl" />
                            <p className="mt-1 line-clamp-2 text-xs font-semibold">{r.name}</p>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section id="compras">
          <h2 className="mb-3 text-lg font-bold">Compras</h2>
          {!purchases.length ? (
            <EmptyState icon="🧾" title="Sin compras registradas" text="Pulsa «Ya he comprado» en tu lista para guardarlas aquí." />
          ) : (
            <div className="space-y-3">
              {purchases.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-bold">
                      {getSupermarket(p.supermarketId).name} · {new Date(p.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="font-display text-lg font-bold tabular">{formatMoney(p.total, p.currency)}</p>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-cobalt">{p.items.length} productos</summary>
                    <ul className="mt-2 divide-y divide-line">
                      {p.items.map((i) => (
                        <li key={i.ingredientId} className="flex justify-between py-1.5">
                          <span>
                            {i.name} <span className="text-xs text-muted">({i.packs})</span>
                          </span>
                          <span className="tabular">{formatMoney(i.cost, p.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="cocinadas">
          <h2 className="mb-3 text-lg font-bold">Recetas cocinadas</h2>
          {!cooked.length ? (
            <EmptyState icon="👩‍🍳" title="Aún nada" text="Marca tus platos como cocinados para llevar la cuenta." />
          ) : (
            <Card className="divide-y divide-line">
              {cooked.map((c) => (
                <Link key={c.id} href={`/receta/${c.recipeId}`} className="flex justify-between px-4 py-3 text-sm hover:bg-mist/60">
                  <span className="font-semibold">{getRecipe(c.recipeId)?.name}</span>
                  <span className="text-muted">
                    {shortDate(c.date)} · {c.servings} rac.
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
