"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import type { Profile } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import {
  AllergensField,
  BudgetField,
  CountryField,
  DaysField,
  DietField,
  DislikesField,
  KitchenField,
  LeftoversField,
  MealsField,
  MeatsField,
  PeopleField,
  PreferencesField,
  SupermarketField,
  type FieldProps,
} from "@/components/profile/fields";
import { getCountry, getSupermarket } from "@/data/geo";
import { allergenName, applianceName, DAYS, DIETS, DISLIKES, MEATS, prefName, selectedSlots } from "@/data/taxonomy";
import { compatibilityReport } from "@/engine/planner";
import { formatMoney } from "@/engine/units";
import { toast } from "@/components/ui/Toast";

interface Section {
  id: string;
  title: string;
  icon: string;
  summary(p: Profile): string;
  render(p: FieldProps): React.ReactNode;
  valid?(p: Profile): boolean;
}

const SECTIONS: Section[] = [
  { id: "people", title: "Personas de la casa", icon: "👨‍👩‍👧", summary: (p) => `${p.adults} adultos · ${p.children} niños`, render: (f) => <PeopleField {...f} /> },
  { id: "days", title: "Días de planificación", icon: "🗓️", summary: (p) => p.days.map((d) => DAYS[d].short).join(" ") || "Ninguno", render: (f) => <DaysField {...f} />, valid: (p) => p.days.length > 0 },
  {
    id: "meals",
    title: "Franjas del día",
    icon: "🍽️",
    summary: (p) => `${selectedSlots(p.meals).map((s) => s.name).join(", ") || "Ninguna"} · ${p.leftovers === "aprovechar" ? "aprovechando sobras" : "platos distintos"}`,
    render: (f) => (
      <div className="space-y-6">
        <MealsField {...f} />
        <LeftoversField {...f} />
      </div>
    ),
    valid: (p) => selectedSlots(p.meals).length > 0,
  },
  { id: "budget", title: "Presupuesto y aprovechamiento", icon: "💶", summary: (p) => `${formatMoney(p.budget, getCountry(p.countryId).currency)} / semana${p.cheapest ? " · lo más barato" : ""}${p.optimizer ? " · aprovechamiento" : ""}`, render: (f) => <BudgetField {...f} /> },
  {
    id: "markets",
    title: "País y supermercados",
    icon: "🛒",
    summary: (p) =>
      `${getCountry(p.countryId).flag} ${[p.supermarketId, ...p.extraSupermarkets].map((id) => getSupermarket(id).name).join(" + ")}${
        p.extraSupermarkets.length ? (p.multiStore ? " · repartiendo la compra" : " · todo en el principal") : ""
      }`,
    render: (f) => (
      <div className="space-y-5">
        <CountryField {...f} />
        <SupermarketField {...f} />
      </div>
    ),
  },
  { id: "prefs", title: "Preferencias gastronómicas", icon: "⭐", summary: (p) => p.preferences.map(prefName).join(", ") || "Sin preferencias", render: (f) => <PreferencesField {...f} /> },
  { id: "diet", title: "Dieta", icon: "🥗", summary: (p) => DIETS.find((d) => d.id === p.diet)?.name ?? p.diet, render: (f) => <DietField {...f} /> },
  {
    id: "meats",
    title: "Carnes y pescados",
    icon: "🍗",
    summary: (p) => (p.diet === "vegana" || p.diet === "vegetariana" ? "No aplica" : p.meats.map((m) => MEATS.find((x) => x.id === m)?.name).join(", ") || "Ninguno"),
    render: (f) => <MeatsField {...f} />,
  },
  {
    id: "dislikes",
    title: "Alimentos excluidos",
    icon: "🚫",
    summary: (p) => [...p.dislikes.map((d) => DISLIKES.find((x) => x.id === d)?.name ?? d), ...p.customDislikes].join(", ") || "Ninguno",
    render: (f) => <DislikesField {...f} />,
  },
  {
    id: "allergens",
    title: "Alergias",
    icon: "⚠️",
    summary: (p) => (p.allergens.length ? p.allergens.map(allergenName).join(", ") : "Ninguna"),
    render: (f) => <AllergensField {...f} />,
  },
  { id: "kitchen", title: "Electrodomésticos", icon: "🔌", summary: (p) => ["fuegos", ...p.appliances.filter((a) => a !== "fuegos")].map((a) => applianceName(a as never)).join(", "), render: (f) => <KitchenField {...f} /> },
];

export default function Preferencias() {
  const router = useRouter();
  const profile = useMesa((s) => s.profile);
  const updateProfile = useMesa((s) => s.updateProfile);
  const requestGeneration = useMesa((s) => s.requestGeneration);
  const startOnboarding = useMesa((s) => s.startOnboarding);
  const setDraftStep = useMesa((s) => s.setDraftStep);
  const [editing, setEditing] = useState<Section | null>(null);
  const [local, setLocal] = useState<Profile>(profile);
  const [dirty, setDirty] = useState(false);
  const report = compatibilityReport(profile);

  const open = (s: Section) => {
    setLocal(profile);
    setEditing(s);
  };

  return (
    <>
      <PageHeader title="Preferencias" subtitle="Cambia lo que quieras sin empezar de cero." />
      <div className="space-y-4 px-4 sm:px-6">
        {dirty && (
          <Card className="flex flex-col gap-3 bg-cobalt p-4 text-white sm:flex-row sm:items-center">
            <p className="flex-1 text-sm font-medium">Has cambiado tus preferencias. ¿Quieres una semana nueva con ellas?</p>
            <Button
              variant="white"
              onClick={() => {
                requestGeneration("preferencias");
                router.push("/generando");
              }}
            >
              <Sparkles className="size-4" /> Regenerar mi semana
            </Button>
          </Card>
        )}

        <p className="rounded-2xl bg-white px-4 py-3 text-sm shadow-soft">
          <strong className="font-display text-lg text-cobalt">{report.compatible.length}</strong> de {report.total} recetas encajan con tu casa ahora mismo.
        </p>

        <Card className="divide-y divide-line">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => open(s)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-mist/60">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-xl">{s.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className="block truncate text-sm text-muted">{s.summary(profile)}</span>
              </span>
              <ChevronRight className="size-5 text-faint" />
            </button>
          ))}
        </Card>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            onClick={() => {
              requestGeneration("preferencias");
              router.push("/generando");
            }}
          >
            <Sparkles className="size-5" /> Regenerar la planificación
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              startOnboarding(false);
              setDraftStep(0);
              router.push("/onboarding");
            }}
          >
            <RotateCcw className="size-5" /> Repetir el cuestionario
          </Button>
        </div>
      </div>

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.title ?? ""}
        footer={
          <Button
            block
            disabled={editing?.valid ? !editing.valid(local) : false}
            onClick={() => {
              updateProfile(local);
              setDirty(true);
              setEditing(null);
              toast("Preferencias guardadas");
            }}
          >
            Guardar
          </Button>
        }
      >
        {editing?.render({ value: local, onChange: (p) => setLocal((l) => ({ ...l, ...p })) })}
      </Sheet>
    </>
  );
}
