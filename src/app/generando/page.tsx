"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { Gate } from "@/components/layout/AppShell";
import { Button, Logo, ProgressBar } from "@/components/ui/primitives";
import { GENERATION_STAGES, generateStaged, type StageInfo } from "@/engine/generate";
import { compatibilityReport, PlanError, suggestionsFor } from "@/engine/planner";
import { toast } from "@/components/ui/Toast";

export default function Generando() {
  const router = useRouter();
  const [stage, setStage] = useState<StageInfo>({ index: 0, label: GENERATION_STAGES[0] });
  const [details, setDetails] = useState<string[]>([]);
  const [error, setError] = useState<{ message: string; suggestions: string[] } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const s = useMesa.getState();
    if (!s.generation && s.plan) {
      router.replace("/semana");
      return;
    }
    generateStaged({ profile: s.profile, pantry: s.pantry, previous: s.plan, myProducts: s.myProducts }, (st) => {
      setStage(st);
      setDetails((d) => {
        const n = [...d];
        n[st.index] = st.detail ?? "";
        return n;
      });
    })
      .then(({ plan }) => {
        useMesa.getState().setPlan(plan);
        if (plan.warnings.length) toast(plan.warnings[0], "info");
        router.replace("/semana");
      })
      .catch((e: unknown) => {
        const report = compatibilityReport(useMesa.getState().profile);
        setError({
          message: e instanceof Error ? e.message : "No se pudo generar la semana.",
          suggestions: e instanceof PlanError && e.suggestions.length ? e.suggestions : suggestionsFor(report),
        });
      });
  }, [router]);

  return (
    <Gate>
      <div className="flex min-h-dvh flex-col bg-cobalt text-white">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
          <Logo light />
          {error ? (
            <div className="my-auto rounded-3xl bg-white p-6 text-ink">
              <TriangleAlert className="size-9 text-tomato" />
              <h1 className="mt-3 text-2xl font-extrabold">No hemos podido crear tu semana</h1>
              <p className="mt-2 text-sm text-muted">{error.message} Nunca nos saltamos tus alergias ni tus restricciones, así que te proponemos ajustar algo:</p>
              <ul className="mt-4 space-y-2 text-sm">
                {error.suggestions.map((s) => (
                  <li key={s} className="rounded-xl bg-mist px-3 py-2">
                    {s}
                  </li>
                ))}
              </ul>
              <Button block className="mt-6" onClick={() => router.replace("/preferencias")}>
                Revisar preferencias
              </Button>
            </div>
          ) : (
            <div className="my-auto">
              <motion.div className="mx-auto mb-10 grid size-28 place-items-center rounded-full bg-white/10" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                <span className="text-5xl">🍳</span>
              </motion.div>
              <h1 className="text-center text-3xl font-extrabold">Preparando tu semana</h1>
              <ProgressBar value={(stage.index + 1) / GENERATION_STAGES.length} tone="sun" track="bg-white/15" className="mt-6" />
              <ul className="mt-8 space-y-3">
                {GENERATION_STAGES.map((label, i) => {
                  const done = i < stage.index;
                  const active = i === stage.index;
                  return (
                    <motion.li key={label} initial={{ opacity: 0 }} animate={{ opacity: i <= stage.index ? 1 : 0.35 }} className="flex items-start gap-3">
                      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-sun text-ink" : "bg-white/15"}`}>
                        {done ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : null}
                      </span>
                      <span>
                        <span className="block font-semibold">{label}</span>
                        {details[i] && <span className="block text-sm text-cobalt-100">{details[i]}</span>}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Gate>
  );
}
