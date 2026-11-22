"use client";

import { motion } from "framer-motion";
import { Info, Minus, Plus } from "lucide-react";
import type { NutritionProfile } from "@/domain/types";
import { ACTIVITY, GOALS, isNutritionReady, nutritionTargets, plannedShare } from "@/engine/nutrition";
import { cn, SelectCard } from "@/components/ui/primitives";
import { fmtNum } from "@/engine/units";
import type { FieldProps } from "./fields";

export const DEFAULT_NUTRITION: NutritionProfile = {
  enabled: false,
  sex: "mujer",
  age: 30,
  weightKg: 65,
  heightCm: 165,
  activity: "ligera",
  goal: "mantener",
  pace: "suave",
};

export const HEALTH_NOTE =
  "Cálculo orientativo con la ecuación de Mifflin-St Jeor. No sustituye el consejo de un profesional sanitario. Si estás embarazada, en lactancia, tienes alguna enfermedad o antecedentes de trastornos de la conducta alimentaria, consulta antes con un profesional.";

/** Datos personales y objetivo para ajustar las raciones a tus calorías. */
export function NutritionField({ value, onChange }: FieldProps) {
  const n = { ...DEFAULT_NUTRITION, ...value.nutrition };
  const set = (p: Partial<NutritionProfile>) => onChange({ nutrition: { ...n, ...p } });
  const ready = isNutritionReady(n);
  const t = ready ? nutritionTargets(n) : null;

  return (
    <div className="space-y-5">
      <button
        role="switch"
        aria-checked={n.enabled}
        aria-label="Ajustar a mis calorías"
        onClick={() => set({ enabled: !n.enabled })}
        className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition", n.enabled ? "border-cobalt bg-cobalt-50" : "border-line bg-white")}
      >
        <span className="text-2xl">🔥</span>
        <span className="flex-1">
          <span className="block font-bold">Ajustar mis raciones a mis calorías</span>
          <span className="block text-xs text-muted">Calculamos lo que gastas al día y adaptamos tu ración de cada plato (y la compra) a tu objetivo.</span>
        </span>
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", n.enabled ? "bg-cobalt" : "bg-line")}>
          <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", n.enabled ? "right-1" : "left-1")} />
        </span>
      </button>

      {n.enabled && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5">
            {(["mujer", "hombre"] as const).map((sex) => (
              <SelectCard key={sex} selected={n.sex === sex} onClick={() => set({ sex })} className="p-3 text-center font-bold">
                {sex === "mujer" ? "👩 Mujer" : "👨 Hombre"}
              </SelectCard>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <NumberBox label="Edad" unit="años" value={n.age} min={14} max={99} step={1} onChange={(age) => set({ age })} />
            <NumberBox label="Peso" unit="kg" value={n.weightKg} min={35} max={250} step={0.5} onChange={(weightKg) => set({ weightKg })} />
            <NumberBox label="Altura" unit="cm" value={n.heightCm} min={120} max={230} step={1} onChange={(heightCm) => set({ heightCm })} />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Actividad física</p>
            <div className="space-y-2">
              {ACTIVITY.map((a) => (
                <SelectCard key={a.id} selected={n.activity === a.id} onClick={() => set({ activity: a.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-semibold">{a.name}</span>
                    <span className="block text-xs text-muted">{a.hint}</span>
                  </span>
                  <span className="text-xs font-semibold text-faint">×{fmtNum(a.factor)}</span>
                </SelectCard>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Tu objetivo</p>
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => (
                <SelectCard key={g.id} selected={n.goal === g.id} onClick={() => set({ goal: g.id })} className="p-3">
                  <span className="text-2xl">{g.icon}</span>
                  <span className="mt-1 block text-sm font-bold leading-tight">{g.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted">{g.hint}</span>
                </SelectCard>
              ))}
            </div>
            {n.goal === "perder" && (
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-mist p-1" role="radiogroup" aria-label="Ritmo">
                {(
                  [
                    ["suave", "Suave (−15 %)"],
                    ["normal", "Normal (−20 %)"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={(n.pace ?? "suave") === id}
                    onClick={() => set({ pace: id })}
                    className={cn("rounded-xl py-2 text-sm font-semibold", (n.pace ?? "suave") === id ? "bg-white shadow-soft" : "text-muted")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {t && (
            <div className="rounded-3xl bg-ink p-5 text-white" data-testid="objetivo-kcal">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt-100">Tu objetivo diario</p>
              <p className="mt-1 font-display text-[40px] font-extrabold leading-none tabular">
                {fmtNum(t.kcal)} <span className="text-lg font-bold text-cobalt-100">kcal</span>
              </p>
              <p className="mt-2 text-xs text-cobalt-100">
                Gastas ≈ {fmtNum(t.tdee)} kcal al día (basal {fmtNum(t.bmr)} kcal) · IMC {fmtNum(t.bmi)}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Proteína", t.protein, "#7FA4FF"],
                  ["Hidratos", t.carbs, "#FFC93C"],
                  ["Grasa", t.fat, "#6FD1A4"],
                ].map(([label, g, color]) => (
                  <div key={label as string} className="rounded-2xl bg-white/10 px-2 py-2.5">
                    <p className="font-display text-xl font-bold tabular" style={{ color: color as string }}>
                      {g} g
                    </p>
                    <p className="text-[11px] text-cobalt-100">{label}</p>
                  </div>
                ))}
              </div>
              {t.notes.map((note) => (
                <p key={note} className="mt-3 rounded-xl bg-sun/15 px-3 py-2 text-xs text-sun">
                  {note}
                </p>
              ))}
              {plannedShare(value.meals) < 0.9 && (
                <p className="mt-3 text-xs leading-relaxed text-cobalt-100">
                  Planificas {Math.round(plannedShare(value.meals) * 100)} % de las calorías del día ({fmtNum(Math.round(t.kcal * plannedShare(value.meals)))} kcal). El resto lo completas con lo que comas fuera del plan.
                </p>
              )}
            </div>
          )}
          <p className="flex gap-2 text-[11px] leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {HEALTH_NOTE}
          </p>
        </motion.div>
      )}
    </div>
  );
}

function NumberBox({ label, unit, value, min, max, step, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange(v: number): void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <label className="block rounded-2xl bg-white p-3 shadow-soft">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value.replace(",", "."));
            if (Number.isFinite(v)) onChange(v);
          }}
          onBlur={() => onChange(clamp(value))}
          className="w-full min-w-0 bg-transparent font-display text-2xl font-bold tabular outline-none"
        />
        <span className="text-xs text-faint">{unit}</span>
      </span>
      <span className="mt-1.5 flex gap-1.5">
        <button type="button" aria-label={`Menos ${label.toLowerCase()}`} onClick={(e) => { e.preventDefault(); onChange(clamp(value - step)); }} className="grid size-7 place-items-center rounded-full bg-mist">
          <Minus className="size-3.5" />
        </button>
        <button type="button" aria-label={`Más ${label.toLowerCase()}`} onClick={(e) => { e.preventDefault(); onChange(clamp(value + step)); }} className="grid size-7 place-items-center rounded-full bg-cobalt text-white">
          <Plus className="size-3.5" />
        </button>
      </span>
    </label>
  );
}
