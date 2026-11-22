"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMesa } from "@/store/mesa";
import { Card, ProgressBar, cn } from "@/components/ui/primitives";
import { DAYS } from "@/data/taxonomy";
import { dailyIntake, isNutritionReady, nutritionTargets, plannedShare } from "@/engine/nutrition";
import { fmtNum } from "@/engine/units";

/** Calorías y macros que comerás cada día según el plan, frente a tu objetivo. */
export function NutritionCard() {
  const plan = useMesa((s) => s.plan);
  const profile = useMesa((s) => s.profile);
  const days = useMemo(() => (plan ? dailyIntake(plan) : []), [plan]);

  if (!plan) return null;
  if (!isNutritionReady(profile.nutrition)) {
    return (
      <Link href="/preferencias" className="block">
        <Card className="flex items-center gap-3 p-4 transition hover:ring-2 hover:ring-cobalt-100">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tomato-50 text-2xl">🔥</span>
          <span className="flex-1">
            <span className="block font-bold">Ajusta tu menú a tus calorías</span>
            <span className="block text-xs text-muted">Indica tu peso, altura y actividad y adaptamos tus raciones a tu objetivo.</span>
          </span>
        </Card>
      </Link>
    );
  }

  const t = nutritionTargets(profile.nutrition);
  const share = plannedShare(profile.meals);
  const goal = t.kcal * share;
  const avg = days.length ? days.reduce((s, d) => s + d.kcal, 0) / days.length : 0;
  const macro = (k: "protein" | "carbs" | "fat") => (days.length ? days.reduce((s, d) => s + d[k], 0) / days.length : 0);
  const max = Math.max(goal * 1.3, ...days.map((d) => d.kcal));

  return (
    <Card className="p-4" data-testid="tu-dia">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">🔥 Tu día</p>
          <p className="text-xs text-muted">
            Objetivo {fmtNum(t.kcal)} kcal{share < 0.9 ? ` · en el plan: ${Math.round(share * 100)} % (${fmtNum(Math.round(goal))} kcal)` : ""}
          </p>
        </div>
        <Link href="/preferencias" className="text-xs font-bold text-cobalt">
          Editar
        </Link>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular" data-testid="kcal-media">
        {fmtNum(Math.round(avg))} <span className="text-sm font-semibold text-muted">kcal de media por día en tu plan</span>
      </p>

      {/* Barras por día */}
      <div className="mt-3 flex h-24 items-end gap-1.5" aria-label="Calorías por día">
        {days.map((d) => {
          const off = Math.abs(d.kcal - goal) / goal;
          return (
            <div key={d.dayIndex} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex h-20 w-full items-end overflow-hidden rounded-lg bg-mist">
                <div className="absolute inset-x-0 border-t-2 border-dashed border-ink/30" style={{ bottom: `${(goal / max) * 100}%` }} />
                <div className={cn("w-full rounded-lg", off < 0.1 ? "bg-leaf" : off < 0.2 ? "bg-sun" : "bg-tomato")} style={{ height: `${(d.kcal / max) * 100}%` }} title={`${Math.round(d.kcal)} kcal`} />
              </div>
              <span className="text-[10px] font-bold text-faint">{DAYS[d.dayIndex].short}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-faint">La línea discontinua es tu objetivo para las comidas planificadas.</p>

      <div className="mt-3 space-y-2">
        {(
          [
            ["Proteína", "protein", t.protein],
            ["Hidratos", "carbs", t.carbs],
            ["Grasa", "fat", t.fat],
          ] as const
        ).map(([label, k, target]) => {
          const value = macro(k);
          const goalG = target * share;
          return (
            <div key={k}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold">{label}</span>
                <span className="tabular text-muted">
                  {Math.round(value)} / {Math.round(goalG)} g
                </span>
              </div>
              <ProgressBar value={goalG ? value / goalG : 0} tone={k === "protein" ? "cobalt" : k === "carbs" ? "sun" : "leaf"} className="mt-1 h-1.5" />
            </div>
          );
        })}
      </div>
      {macro("protein") < t.protein * share * 0.9 && (
        <p className="mt-3 rounded-xl bg-cobalt-50 px-3 py-2 text-xs text-ink-2" data-testid="consejo-proteina">
          💪 Te faltan unos <strong>{Math.round(t.protein * share - macro("protein"))} g de proteína</strong> al día. Lo completas fácil con un yogur natural (5 g), dos huevos cocidos (13 g) o 100 g de queso fresco (12 g).
        </p>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-faint">Valores orientativos por ración. Tu ración de cada plato se ajusta (y la compra con ella); la del resto de la casa no cambia.</p>
    </Card>
  );
}
