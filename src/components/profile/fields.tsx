"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Plus, ShieldAlert, X } from "lucide-react";
import type { AllergenId, ApplianceId, DietId, MeatType, PreferenceId, Profile } from "@/domain/types";
import { COUNTRIES, getCountry, supermarketsOf } from "@/data/geo";
import { ALLERGENS, ALLERGY_WARNING, DAYS, DIETS, DISLIKES, MEATS, PREFERENCES, SLOTS } from "@/data/taxonomy";
import { cn, Counter, SelectCard } from "@/components/ui/primitives";
import { formatMoney } from "@/engine/units";
import { ApplianceChips, KitchenIllustration } from "./Kitchen";

export interface FieldProps {
  value: Profile;
  onChange(p: Partial<Profile>): void;
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function CountryField({ value, onChange }: FieldProps) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {COUNTRIES.map((c) => (
        <button
          key={c.id}
          aria-pressed={value.countryId === c.id}
          onClick={() => {
            if (c.id === value.countryId) return;
            const first = c.supermarkets[0];
            const country = getCountry(c.id);
            onChange({ countryId: c.id, supermarketId: first, extraSupermarkets: [], budget: Math.round(53 * country.priceLevel) });
          }}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3.5 py-2.5 text-sm font-semibold transition",
            value.countryId === c.id ? "border-cobalt bg-cobalt-50 text-cobalt" : "border-line bg-white text-ink-2",
          )}
        >
          <span className="text-xl">{c.flag}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function SupermarketField({ value, onChange }: FieldProps) {
  const markets = supermarketsOf(value.countryId);
  const extras = value.extraSupermarkets.filter((id) => id !== value.supermarketId && markets.some((m) => m.id === id));
  const setExtras = (next: string[]) =>
    // Al añadir el primer supermercado extra, activamos el reparto (se puede desactivar).
    onChange({ extraSupermarkets: next, multiStore: next.length === 0 ? false : extras.length === 0 ? true : value.multiStore });
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-2">Toca tu supermercado principal y marca otros a los que también vayas.</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {markets.map((m) => {
          const main = value.supermarketId === m.id;
          const extra = extras.includes(m.id);
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition-colors",
                main ? "border-cobalt bg-cobalt-50" : extra ? "border-leaf" : "border-line",
              )}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                aria-pressed={main}
                aria-label={`${m.name} como supermercado principal`}
                onClick={() => onChange({ supermarketId: m.id, extraSupermarkets: extras.filter((x) => x !== m.id), multiStore: extras.filter((x) => x !== m.id).length ? value.multiStore : false })}
                className="flex flex-col items-start gap-2 p-3 text-left"
              >
                <span className="grid size-10 place-items-center rounded-xl font-display text-lg font-extrabold text-white" style={{ background: m.color }}>
                  {m.name[0]}
                </span>
                <span className="font-semibold">{m.name}</span>
              </motion.button>
              {main ? (
                <span className="mx-3 mb-3 rounded-lg bg-cobalt px-2 py-1.5 text-center text-xs font-bold text-white">Principal</span>
              ) : (
                <button
                  role="checkbox"
                  aria-checked={extra}
                  aria-label={`También voy a ${m.name}`}
                  onClick={() => setExtras(toggle(extras, m.id))}
                  className={cn("mx-3 mb-3 rounded-lg px-2 py-1.5 text-xs font-bold transition", extra ? "bg-leaf text-white" : "bg-mist text-ink-2 hover:bg-line")}
                >
                  {extra ? "✓ También voy" : "+ También voy"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {extras.length > 0 && (
        <button
          role="switch"
          aria-checked={value.multiStore}
          onClick={() => onChange({ multiStore: !value.multiStore })}
          className={cn("mt-4 flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition", value.multiStore ? "border-leaf bg-leaf-50" : "border-line bg-white")}
        >
          <span className="text-2xl">🛒</span>
          <span className="flex-1">
            <span className="block font-bold">Repartir la compra entre mis supermercados</span>
            <span className="block text-xs leading-relaxed text-muted">
              Compraremos cada producto donde salga más barato, contando envases completos. Solo añadimos una parada si te ahorra al menos {formatMoney(Math.max(1, Math.round(getCountry(value.countryId).priceLevel)), getCountry(value.countryId).currency)}.
            </span>
          </span>
          <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", value.multiStore ? "bg-leaf" : "bg-line")}>
            <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", value.multiStore ? "right-1" : "left-1")} />
          </span>
        </button>
      )}

      <p className="mt-4 rounded-xl bg-mist px-3 py-2.5 text-xs leading-relaxed text-muted">
        MESA no está afiliada, patrocinada ni respaldada por ninguno de estos supermercados. Los nombres se usan solo para identificar dónde compras. El supermercado principal define la moneda ({getCountry(value.countryId).currency}) y es donde va todo lo que no ahorra nada en otro sitio.
      </p>
    </div>
  );
}

export function PeopleField({ value, onChange }: FieldProps) {
  const total = value.adults + value.children;
  return (
    <div>
      <div className="flex flex-col items-center py-4">
        <motion.span key={total} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[96px] font-extrabold leading-none text-cobalt tabular">
          {total}
        </motion.span>
        <span className="mt-1 font-semibold text-muted">{total === 1 ? "persona" : "personas"} en casa</span>
      </div>
      <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-soft">
        <Counter label="Adultos" value={value.adults} min={1} max={10} onChange={(adults) => onChange({ adults })} />
        <div className="h-px bg-line" />
        <Counter label="Niños" value={value.children} min={0} max={8} onChange={(children) => onChange({ children })} />
      </div>
      <p className="mt-3 text-center text-xs text-muted">Las raciones de niños se calculan al 60 % de un adulto.</p>
    </div>
  );
}

export function DaysField({ value, onChange }: FieldProps) {
  const presets = [
    { label: "Lunes a viernes", days: [0, 1, 2, 3, 4] },
    { label: "Toda la semana", days: [0, 1, 2, 3, 4, 5, 6] },
    { label: "Fin de semana", days: [5, 6] },
  ];
  return (
    <div>
      <div className="flex justify-between gap-1.5 sm:gap-3">
        {DAYS.map((d, i) => {
          const active = value.days.includes(i);
          return (
            <motion.button
              key={d.short}
              whileTap={{ scale: 0.9 }}
              aria-pressed={active}
              aria-label={d.name}
              onClick={() => onChange({ days: toggle(value.days, i).sort() })}
              className={cn(
                "grid aspect-square flex-1 place-items-center rounded-2xl font-display text-xl font-extrabold transition-colors sm:text-2xl",
                active ? "bg-cobalt text-white shadow-[0_8px_18px_-8px_rgb(36_72_245/0.7)]" : "bg-white text-faint ring-2 ring-line",
              )}
            >
              {d.short}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm font-medium text-ink-2">
        {value.days.length ? `${value.days.length} ${value.days.length === 1 ? "día" : "días"}: ${value.days.map((d) => DAYS[d].name.toLowerCase()).join(", ")}` : "Ningún día seleccionado"}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {presets.map((p) => (
          <button key={p.label} onClick={() => onChange({ days: p.days })} className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-line">
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MealsField({ value, onChange }: FieldProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SLOTS.map((o) => {
        const on = Boolean(value.meals[o.id]);
        return (
          <SelectCard key={o.id} selected={on} onClick={() => onChange({ meals: { ...value.meals, [o.id]: !on } })} className="p-5">
            <span className="text-4xl">{o.icon}</span>
            <p className="mt-3 text-lg font-bold">{o.name}</p>
            <p className="text-sm text-muted">{o.hint}</p>
            {on && <Check className="absolute right-3 top-3 size-5 text-cobalt" />}
          </SelectCard>
        );
      })}
    </div>
  );
}

export function LeftoversField({ value, onChange }: FieldProps) {
  const opts = [
    { id: "aprovechar" as const, icon: "🍱", title: "Aprovechar las sobras", text: "Cocinamos de más por la noche para la comida del día siguiente. Menos tiempo en la cocina." },
    { id: "distintos" as const, icon: "🍽️", title: "Preparar platos diferentes", text: "Una receta distinta para cada comida." },
  ];
  const applies = value.meals.comida && value.meals.cena;
  return (
    <div className="space-y-3">
      {opts.map((o) => (
        <SelectCard key={o.id} selected={value.leftovers === o.id} onClick={() => onChange({ leftovers: o.id })} className="flex w-full gap-4 p-4">
          <span className="text-3xl">{o.icon}</span>
          <span>
            <span className="block font-bold">{o.title}</span>
            <span className="mt-0.5 block text-sm text-muted">{o.text}</span>
          </span>
        </SelectCard>
      ))}
      {!applies && (
        <p className="rounded-xl bg-sun-50 px-3 py-2.5 text-xs text-ink-2">
          Las sobras se aprovechan de la cena a la comida del día siguiente, y ahora no planificas las dos. Cada franja tendrá su receta y te avisaremos de los ingredientes que sobren para que los uses antes de que se estropeen.
        </p>
      )}
    </div>
  );
}

export function BudgetField({ value, onChange }: FieldProps) {
  const country = getCountry(value.countryId);
  const min = Math.round(20 * country.priceLevel);
  const max = Math.round(200 * country.priceLevel);
  const step = country.priceLevel > 5 ? 10 : 1;
  const fill = ((value.budget - min) / (max - min)) * 100;
  return (
    <div>
      <div className={cn("flex flex-col items-center py-6 transition-opacity", value.cheapest && "opacity-40")}>
        <motion.span key={value.budget} initial={{ y: 6, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} className="font-display text-[80px] font-extrabold leading-none text-ink tabular sm:text-[96px]">
          {formatMoney(value.budget, country.currency).replace(/,00|\.00/, "")}
        </motion.span>
        <span className="mt-2 text-sm font-medium text-muted">En el supermercado, cada semana</span>
      </div>
      <input
        type="range"
        aria-label="Presupuesto semanal"
        className="mesa-range w-full"
        min={min}
        max={max}
        step={step}
        value={value.budget}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => onChange({ budget: Number(e.target.value), cheapest: false })}
      />
      <div className="mt-2 flex justify-between text-xs font-medium text-faint">
        <span>{formatMoney(min, country.currency)}</span>
        <span>{formatMoney(max, country.currency)}</span>
      </div>
      <button
        onClick={() => onChange({ cheapest: !value.cheapest })}
        aria-pressed={value.cheapest}
        className={cn(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3.5 font-semibold transition",
          value.cheapest ? "border-leaf bg-leaf-50 text-leaf" : "border-line bg-white text-ink-2",
        )}
      >
        {value.cheapest ? <Check className="size-5" /> : <span>💸</span>} Lo más barato posible
      </button>
      <OptimizerToggle value={value} onChange={onChange} />
      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        {value.cheapest
          ? "Priorizaremos legumbres, recetas económicas e ingredientes compartidos, sin pasarnos del presupuesto."
          : "Es lo que pagarás en caja: envases completos y descontando lo que ya tienes en casa."}
      </p>
    </div>
  );
}

export function OptimizerToggle({ value, onChange }: FieldProps) {
  const on = value.optimizer ?? false;
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label="Modo aprovechamiento"
      onClick={() => onChange({ optimizer: !on })}
      className={cn("mt-3 flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition", on ? "border-leaf bg-leaf-50" : "border-line bg-white")}
    >
      <span className="text-2xl">♻️</span>
      <span className="flex-1">
        <span className="block font-bold">Modo aprovechamiento</span>
        <span className="block text-xs leading-relaxed text-muted">
          Elegimos platos que gasten los envases enteros (si compras 6 huevos, se usan los 6) y lo que tienes en casa antes de que caduque. Lo que aguanta más se usa la semana siguiente.
        </span>
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-leaf" : "bg-line")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "right-1" : "left-1")} />
      </span>
    </button>
  );
}

export function PreferencesField({ value, onChange }: FieldProps) {
  const full = value.preferences.length >= 3;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {PREFERENCES.map((p) => {
          const sel = value.preferences.includes(p.id);
          return (
            <SelectCard
              key={p.id}
              selected={sel}
              disabled={!sel && full}
              onClick={() => onChange({ preferences: toggle<PreferenceId>(value.preferences, p.id) })}
              className="p-4"
            >
              <span className="text-3xl">{p.icon}</span>
              <p className="mt-2 font-bold leading-tight">{p.name}</p>
              <p className="text-xs text-muted">{p.hint}</p>
              {sel && (
                <span className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-cobalt text-xs font-bold text-white">
                  {value.preferences.indexOf(p.id) + 1}
                </span>
              )}
            </SelectCard>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-muted">{value.preferences.length} de 3 seleccionadas</p>
    </div>
  );
}

export function DietField({ value, onChange }: FieldProps) {
  return (
    <div className="space-y-2.5">
      {DIETS.map((d) => (
        <SelectCard
          key={d.id}
          selected={value.diet === d.id}
          onClick={() => {
            const patch: Partial<Profile> = { diet: d.id as DietId };
            if (d.id === "pescetariana") patch.meats = value.meats.filter((m) => m === "pescado" || m === "marisco");
            if (d.id === "omnivora" && value.diet !== "omnivora" && value.meats.length < 2) patch.meats = ["ternera", "cerdo", "pollo", "pescado", "marisco"];
            if (d.id === "pescetariana" && !patch.meats!.length) patch.meats = ["pescado", "marisco"];
            onChange(patch);
          }}
          className="flex w-full items-center gap-4 p-4"
        >
          <span className="text-3xl">{d.icon}</span>
          <span className="flex-1">
            <span className="block font-bold">{d.name}</span>
            <span className="block text-sm text-muted">{d.hint}</span>
          </span>
          {value.diet === d.id && <Check className="size-5 text-cobalt" />}
        </SelectCard>
      ))}
    </div>
  );
}

export function MeatsField({ value, onChange }: FieldProps) {
  const veg = value.diet === "vegetariana" || value.diet === "vegana";
  if (veg)
    return (
      <div className="rounded-2xl bg-leaf-50 p-5 text-center">
        <p className="text-4xl">🌱</p>
        <p className="mt-2 font-semibold text-leaf">Con dieta {value.diet} no incluiremos carne ni pescado.</p>
        <p className="mt-1 text-sm text-muted">Puedes cambiar tu dieta en el paso anterior.</p>
      </div>
    );
  const allowed = MEATS.filter((m) => value.diet === "omnivora" || m.id === "pescado" || m.id === "marisco");
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {allowed.map((m) => {
          const sel = value.meats.includes(m.id);
          return (
            <SelectCard key={m.id} selected={sel} onClick={() => onChange({ meats: toggle<MeatType>(value.meats, m.id) })} className="flex items-center gap-3 p-4">
              <span className="text-3xl">{m.icon}</span>
              <span className="font-bold">{m.name}</span>
              {sel && <Check className="ml-auto size-5 text-cobalt" />}
            </SelectCard>
          );
        })}
      </div>
      <p className="mt-4 rounded-xl bg-cobalt-50 px-3 py-2.5 text-center text-sm font-semibold text-cobalt">Lo que no marques no entra en tu planificación.</p>
    </div>
  );
}

export function DislikesField({ value, onChange }: FieldProps) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (!value.customDislikes.some((c) => c.toLowerCase() === t.toLowerCase())) onChange({ customDislikes: [...value.customDislikes, t] });
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DISLIKES.map((d) => {
          const sel = value.dislikes.includes(d.id);
          return (
            <button
              key={d.id}
              aria-pressed={sel}
              onClick={() => onChange({ dislikes: toggle(value.dislikes, d.id) })}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition", sel ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line")}
            >
              <span>{d.icon}</span>
              {d.name}
              {sel && <X className="size-3.5" />}
            </button>
          );
        })}
        {value.customDislikes.map((c) => (
          <button key={c} onClick={() => onChange({ customDislikes: value.customDislikes.filter((x) => x !== c) })} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            {c} <X className="size-3.5" />
          </button>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Otro ingrediente (p. ej. calabaza)" className="h-12 flex-1 rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-cobalt" />
        <button type="submit" aria-label="Añadir alimento" className="grid size-12 place-items-center rounded-2xl bg-cobalt text-white">
          <Plus className="size-5" />
        </button>
      </form>
      <p className="mt-4 rounded-xl bg-mist px-3 py-2.5 text-xs leading-relaxed text-muted">
        <strong className="text-ink-2">Esto es una preferencia.</strong> Si alguien en casa no puede comer un alimento por <strong className="text-ink-2">alergia</strong>, márcalo en el siguiente paso: las alergias se tratan como restricciones obligatorias.
      </p>
    </div>
  );
}

export function AllergensField({ value, onChange }: FieldProps) {
  return (
    <div>
      <button
        onClick={() => onChange({ allergens: [], noAllergies: !value.noAllergies })}
        aria-pressed={value.noAllergies}
        className={cn("mb-3 w-full rounded-2xl border-2 py-3.5 font-semibold transition", value.noAllergies ? "border-leaf bg-leaf-50 text-leaf" : "border-line bg-white text-ink-2")}
      >
        {value.noAllergies ? "✓ " : ""}Ninguna alergia en casa
      </button>
      <p className="mb-2 text-xs font-semibold text-muted">O marca las que haya:</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALLERGENS.map((a) => {
          const sel = value.allergens.includes(a.id);
          return (
            <SelectCard
              key={a.id}
              tone="tomato"
              selected={sel}
              onClick={() => onChange({ allergens: toggle<AllergenId>(value.allergens, a.id), noAllergies: false })}
              className="flex items-center gap-2.5 px-3 py-3"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-sm font-semibold leading-tight">{a.name}</span>
              {sel && <ShieldAlert className="ml-auto size-4 shrink-0 text-tomato" />}
            </SelectCard>
          );
        })}
      </div>
      <AllergyWarning className="mt-4" />
    </div>
  );
}

export function AllergyWarning({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl bg-sun-50 px-3 py-2.5 text-xs leading-relaxed text-ink-2", className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b88600]" />
      <p>{ALLERGY_WARNING}</p>
    </div>
  );
}

export function KitchenField({ value, onChange }: FieldProps) {
  const t = (id: ApplianceId) => onChange({ appliances: toggle(value.appliances, id) });
  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-white p-3 shadow-soft">
        <KitchenIllustration value={value.appliances} onToggle={t} />
      </div>
      <div className="mt-4">
        <ApplianceChips value={value.appliances} onToggle={t} />
      </div>
    </div>
  );
}
