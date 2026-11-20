"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recipeHref } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { Gate } from "@/components/layout/AppShell";
import { Button, ProgressBar, cn } from "@/components/ui/primitives";
import { getRecipe } from "@/data/recipes";
import { SLOTS } from "@/data/taxonomy";
import { getIngredient } from "@/data/ingredients";
import { ingredientQty } from "@/engine/shopping";
import { formatQty, toHousehold } from "@/engine/units";
import { toast } from "@/components/ui/Toast";
import type { CookingProgress } from "@/domain/types";

export default function CocinarPage() {
  return (
    <Gate>
      <Suspense fallback={null}>
        <Cocinar />
      </Suspense>
    </Gate>
  );
}

function Cocinar() {
  const params = useSearchParams();
  const recipeId = params.get("r") ?? "";
  const mealId = params.get("m") ?? undefined;
  const recipe = getRecipe(recipeId);
  const router = useRouter();
  const key = mealId ?? recipeId;
  const progress = useMesa((s) => s.cooking[key]);
  const saveCooking = useMesa((s) => s.saveCooking);
  const markCooked = useMesa((s) => s.markCooked);
  const plan = useMesa((s) => s.plan);
  const household = useMesa((s) => s.settings.householdMeasures);
  const favorites = useMesa((s) => s.favorites);
  const toggleFavorite = useMesa((s) => s.toggleFavorite);
  const meal = mealId ? plan?.meals.find((m) => m.id === mealId) : undefined;
  const [finished, setFinished] = useState<{ minutes: number; servings: number } | null>(null);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (recipe && !progress && !finished) {
      saveCooking({
        key,
        recipeId: recipe.id,
        mealId,
        step: 0,
        servings: meal?.servings ?? plan?.people ?? 2,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        doneTasks: [],
      });
    }
  }, [recipe, progress, finished, key, mealId, meal, plan, saveCooking]);

  if (!recipe) return null;

  if (finished) {
    const fav = favorites.includes(recipe.id);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cobalt px-6 text-center text-white">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="text-7xl">
          🍽️
        </motion.div>
        <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6 text-5xl font-extrabold tracking-tight">
          ¡BUEN PROVECHO!
        </motion.h1>
        <p className="mt-3 text-lg text-cobalt-100">{SLOTS.find((x) => x.id === meal?.slot)?.ready ?? "Tu plato está listo."}</p>
        <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="font-display text-3xl font-extrabold tabular">{finished.minutes} min</p>
            <p className="text-sm text-cobalt-100">tiempo total</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="font-display text-3xl font-extrabold tabular">{finished.servings}</p>
            <p className="text-sm text-cobalt-100">raciones</p>
          </div>
        </div>
        <button onClick={() => toggleFavorite(recipe.id)} className={cn("mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition", fav ? "bg-white text-tomato" : "bg-white/15 text-white")}>
          <Heart className={cn("size-5", fav && "fill-tomato")} /> {fav ? "En tus favoritas" : "Marcar como favorita"}
        </button>
        <div className="mt-10 flex w-full max-w-sm flex-col gap-2">
          <Button variant="white" size="lg" block onClick={() => router.replace(mealId ? "/semana" : recipeHref(recipe.id))}>
            {mealId ? "Volver a mi semana" : "Volver a la receta"}
          </Button>
        </div>
      </div>
    );
  }

  if (!progress) return null;
  const step = Math.min(progress.step, recipe.steps.length - 1);
  const s = recipe.steps[step];
  const last = step === recipe.steps.length - 1;
  const pf = meal ? plan!.portionFactor : 1;
  const update = (p: Partial<CookingProgress>) => saveCooking({ ...progress, ...p, updatedAt: new Date().toISOString() });
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    update({ step: n });
  };
  const finish = () => {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(progress.startedAt).getTime()) / 60000));
    setFinished({ minutes, servings: progress.servings });
    // Sincronizado con «Lo he cocinado»: marca el plato y descuenta despensa.
    markCooked({ mealId, recipeId: recipe.id, servings: progress.servings, portionFactor: pf });
  };
  const tasks = (s.ingredientIds ?? []).map((id) => {
    const ing = getIngredient(id);
    const ri = recipe.ingredients.find((r) => r.ingredientId === id)!;
    const qty = ingredientQty(ri.perServing, progress.servings, pf);
    const hh = household ? toHousehold(ing, qty) : null;
    return { id: `${step}:${id}`, label: `${ing.icon} ${ing.name}`, qty: hh ? `${hh.text} (${formatQty(qty, ing.unit)})` : formatQty(qty, ing.unit) };
  });
  const allTasks = [...tasks, { id: `${step}:done`, label: "Paso completado", qty: "" }];

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-10 bg-paper/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            aria-label="Salir del modo cocina"
            onClick={() => {
              toast("Progreso guardado. Puedes reanudar cuando quieras.", "info");
              router.push(recipeHref(recipe.id, mealId));
            }}
            className="grid size-10 place-items-center rounded-full bg-mist"
          >
            <X className="size-5" />
          </button>
          <div className="flex-1">
            <p className="truncate text-sm font-semibold text-muted">{recipe.name}</p>
            <ProgressBar value={(step + 1) / recipe.steps.length} className="mt-1.5" />
          </div>
          <span className="text-sm font-bold tabular" data-testid="step-indicator">
            {step + 1}/{recipe.steps.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-36 pt-4">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.22 }}>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-cobalt">Paso {step + 1}</p>
            <h1 className="mt-2 text-[26px] font-bold leading-snug sm:text-[32px]" data-testid="step-text">
              {s.text}
            </h1>

            {s.timerMin && <StepTimer key={`${key}-${step}`} minutes={s.timerMin} />}

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-bold text-muted">Lista de tareas</h2>
              <ul className="space-y-2">
                {allTasks.map((t) => {
                  const done = progress.doneTasks.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => update({ doneTasks: done ? progress.doneTasks.filter((x) => x !== t.id) : [...progress.doneTasks, t.id] })}
                        className={cn("flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-soft transition", done && "bg-leaf-50")}
                      >
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border-2", done ? "border-leaf bg-leaf text-white" : "border-line")}>{done && <Check className="size-4" strokeWidth={3} />}</span>
                        <span className={cn("flex-1 font-semibold", done && "text-muted line-through")}>{t.label}</span>
                        {t.qty && <span className="text-sm font-semibold text-ink-2 tabular">{t.qty}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {s.tip && <p className="mt-5 rounded-2xl bg-sun-50 p-4 text-sm leading-relaxed text-ink-2">💡 {s.tip}</p>}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="hide-on-keyboard safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3 px-5 py-3">
          <Button variant="ghost" size="lg" disabled={step === 0} onClick={() => go(step - 1)} className="flex-1" data-testid="prev-step">
            <ArrowLeft className="size-5" /> Anterior
          </Button>
          {last ? (
            <Button variant="success" size="lg" onClick={finish} className="flex-[2]" data-testid="finish">
              <Check className="size-5" /> Terminar
            </Button>
          ) : (
            <Button size="lg" onClick={() => go(step + 1)} className="flex-[2]" data-testid="next-step">
              Siguiente <ArrowRight className="size-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch {
    /* sin audio */
  }
}

function StepTimer({ minutes }: { minutes: number }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);
  const notify = useMesa((s) => s.settings.notifications.timers);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        beep();
        navigator.vibrate?.([200, 100, 200]);
        toast("¡Tiempo! Revisa la cocina.", "info");
        if (notify && "Notification" in window && Notification.permission === "granted") new Notification("MESA", { body: "Se ha terminado el temporizador." });
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, notify]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="mt-6 flex items-center gap-4 rounded-3xl bg-ink p-4 text-white">
      <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
        <Timer className="size-6 text-sun" />
      </span>
      <span className={cn("flex-1 font-display text-4xl font-extrabold tabular", left === 0 && "text-sun")}>
        {mm}:{ss}
      </span>
      <button
        aria-label={running ? "Pausar temporizador" : "Iniciar temporizador"}
        onClick={() => {
          if (running) setRunning(false);
          else {
            if (left === 0) setLeft(total);
            endAt.current = Date.now() + (left === 0 ? total : left) * 1000;
            setRunning(true);
          }
        }}
        className="grid size-12 place-items-center rounded-full bg-cobalt"
      >
        {running ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
      <button
        aria-label="Reiniciar temporizador"
        onClick={() => {
          setRunning(false);
          setLeft(total);
        }}
        className="grid size-12 place-items-center rounded-full bg-white/10"
      >
        <RotateCcw className="size-5" />
      </button>
    </div>
  );
}
