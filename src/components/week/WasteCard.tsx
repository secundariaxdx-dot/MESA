"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { useMarket, useWasteReport } from "@/hooks/useMesaData";
import { Button, Card, ProgressBar, Toggle, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { formatMoney, formatQty } from "@/engine/units";
import { isCompatible } from "@/engine/compat";
import { recipesUsing } from "@/services/ai";
import { recipeHref } from "@/lib/routes";
import { toast } from "@/components/ui/Toast";
import type { Fate, LeftoverLine } from "@/engine/waste";

const FATE: Record<Fate, { title: string; tone: string; text: (l: LeftoverLine) => string }> = {
  riesgo: {
    title: "Puede estropearse esta semana",
    tone: "text-tomato",
    text: (l) =>
      l.source === "despensa"
        ? `Lo tienes en casa y caduca esta semana`
        : `Dura unos ${l.shelfLifeDays} días: aprovéchalo antes`,
  },
  proxima: {
    title: "Para la semana que viene",
    tone: "text-[#9a6f00]",
    text: (l) => `Aguanta unas ${Math.round(l.shelfLifeDays / 7)} semanas: tu próximo menú lo usará primero`,
  },
  despensa: {
    title: "Se queda en la despensa",
    tone: "text-leaf",
    text: () => "Larga duración: sin prisa",
  },
};

/** Cuánto de lo que compras se aprovecha y qué hacer con lo que sobra. */
export function WasteCard() {
  const router = useRouter();
  const report = useWasteReport();
  const profile = useMesa((s) => s.profile);
  const plan = useMesa((s) => s.plan);
  const updateProfile = useMesa((s) => s.updateProfile);
  const requestGeneration = useMesa((s) => s.requestGeneration);
  const { currency } = useMarket();
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const on = profile.optimizer ?? false;

  const ideas = useMemo(() => {
    if (!report || !plan) return new Map<string, { id: string; name: string }[]>();
    const inPlan = new Set(plan.meals.map((m) => m.recipeId));
    return new Map(
      report.lines
        .filter((l) => l.fate !== "despensa")
        .map((l) => [l.ingredientId, recipesUsing([l.ingredientId], 8).filter((r) => !inPlan.has(r.id) && isCompatible(r, profile)).slice(0, 2)]),
    );
  }, [report, plan, profile]);

  if (!report || !plan) return null;
  const risk = report.lines.filter((l) => l.fate === "riesgo");
  const next = report.lines.filter((l) => l.fate === "proxima");
  const pct = Math.round(report.usedPct * 100);

  const remake = () => {
    requestGeneration("preferencias");
    router.push("/generando");
  };

  return (
    <>
      <Card className="p-4" data-testid="aprovechamiento">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-leaf-50 text-2xl">♻️</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Aprovechamiento</p>
            <p className="text-sm text-muted">
              <span className="font-display text-base font-bold text-ink tabular" data-testid="aprovechas">
                {pct} %
              </span>{" "}
              de la compra se aprovecha
            </p>
          </div>
          <Toggle
            checked={on}
            onChange={(v) => {
              updateProfile({ optimizer: v });
              setChanged(true);
              toast(v ? "Modo aprovechamiento activado" : "Modo aprovechamiento desactivado", "info");
            }}
            label="Modo aprovechamiento"
          />
        </div>
        <ProgressBar value={report.usedPct} tone={pct >= 95 ? "leaf" : pct >= 85 ? "sun" : "tomato"} className="mt-3" />
        <div className="mt-3 space-y-1 text-xs">
          {report.riskValue > 0.05 ? (
            <p className="text-ink-2">
              Puede acabar en la basura: <strong className="text-tomato">{formatMoney(report.riskValue, currency)}</strong>
              {risk.length ? ` (${risk.slice(0, 2).map((l) => l.name.toLowerCase()).join(", ")}${risk.length > 2 ? "…" : ""})` : ""}
            </p>
          ) : (
            <p className="font-semibold text-leaf">No se tira nada: los envases se gastan enteros.</p>
          )}
          {report.nextWeekValue > 0.05 && (
            <p className="text-muted">
              Reservado para la semana que viene: {formatMoney(report.nextWeekValue, currency)} ({next.length} {next.length === 1 ? "producto" : "productos"})
            </p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {report.lines.length > 0 && (
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setOpen(true)}>
              Ver sobrantes <ChevronRight className="size-4" />
            </Button>
          )}
          {(changed || (!on && report.riskValue > 0.5)) && (
            <Button size="sm" variant={on ? "success" : "secondary"} className="flex-1" onClick={on ? remake : () => { updateProfile({ optimizer: true }); remake(); }} data-testid="rehacer-aprovechando">
              <Sparkles className="size-4" /> {on ? "Rehacer aprovechando" : "Activar y rehacer"}
            </Button>
          )}
        </div>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="Lo que sobra de tu compra">
        <p className="mb-4 text-sm text-muted">
          En el súper se compra por envases enteros. Esto es lo que te sobrará después de cocinar tu menú y qué pasa con cada cosa según lo que dura.
        </p>
        {(["riesgo", "proxima", "despensa"] as Fate[]).map((fate) => {
          const lines = report.lines.filter((l) => l.fate === fate);
          if (!lines.length) return null;
          return (
            <section key={fate} className="mb-5">
              <h3 className={cn("mb-2 text-sm font-extrabold uppercase tracking-[0.1em]", FATE[fate].tone)}>{FATE[fate].title}</h3>
              <Card className="divide-y divide-line">
                {lines.map((l) => (
                  <div key={`${l.source}-${l.ingredientId}`} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{l.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{l.name}</span>
                        <span className="block text-xs text-muted">
                          Sobran ≈ {formatQty(l.qty, l.unit)} · {FATE[fate].text(l)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular">{formatMoney(l.value, currency)}</span>
                    </div>
                    {(ideas.get(l.ingredientId) ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                        {ideas.get(l.ingredientId)!.map((r) => (
                          <Link key={r.id} href={recipeHref(r.id)} className="rounded-full bg-cobalt-50 px-2.5 py-1 text-xs font-semibold text-cobalt">
                            Idea: {r.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          );
        })}
        {!on && (
          <Button
            block
            onClick={() => {
              updateProfile({ optimizer: true });
              setOpen(false);
              remake();
            }}
          >
            <Sparkles className="size-4" /> Activar modo aprovechamiento y rehacer la semana
          </Button>
        )}
      </Sheet>
    </>
  );
}
