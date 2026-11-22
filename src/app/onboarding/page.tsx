"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Profile } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { Gate } from "@/components/layout/AppShell";
import { Button, Logo, ProgressBar } from "@/components/ui/primitives";
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
import { RECIPES } from "@/data/recipes";
import { NutritionField } from "@/components/profile/NutritionField";
import { selectedSlots } from "@/data/taxonomy";

interface Step {
  title: string;
  description: string;
  render(p: FieldProps): React.ReactNode;
  valid?(p: Profile): boolean;
  hint?(p: Profile): string | null;
  /** Botón de continuar alternativo (texto + cambios que aplica al pulsarlo). */
  cta?(p: Profile): { label: string; patch: Partial<Profile> } | null;
}

const STEPS: Step[] = [
  {
    title: "¿Dónde haces la compra?",
    description: "Elige tu país y tu supermercado principal. Usaremos su catálogo de envases y precios.",
    render: (p) => (
      <div className="space-y-5">
        <CountryField {...p} />
        <SupermarketField {...p} />
      </div>
    ),
    valid: (p) => Boolean(p.supermarketId),
  },
  { title: "¿Cuántos coméis en casa?", description: "Ajustaremos raciones y cantidades de compra a tu casa.", render: (p) => <PeopleField {...p} /> },
  {
    title: "Tus datos y tu objetivo",
    description: "Opcional. Calculamos tus calorías diarias y ajustamos tu ración de cada plato (y la compra) a tu objetivo.",
    render: (p) => <NutritionField {...p} />,
    cta: (p) => (!p.nutrition?.enabled ? { label: "Ahora no · Continuar", patch: {} } : null),
  },
  {
    title: "Marca tus días",
    description: "Solo planificaremos los días que elijas. El resto, libres.",
    render: (p) => <DaysField {...p} />,
    valid: (p) => p.days.length > 0,
    hint: () => "Marca al menos un día",
  },
  {
    title: "¿Qué comidas quieres planificar?",
    description: "Desayuno, comida, merienda y cena: elige las que quieras.",
    render: (p) => <MealsField {...p} />,
    valid: (p) => selectedSlots(p.meals).length > 0,
    hint: () => "Elige al menos una franja",
  },
  { title: "¿Cómo quieres organizar las sobras?", description: "Cocinar una vez y comer dos ahorra tiempo y dinero.", render: (p) => <LeftoversField {...p} /> },
  { title: "¿Cuánto quieres gastar a la semana?", description: "Contamos lo que pagas en caja, con envases completos.", render: (p) => <BudgetField {...p} /> },
  { title: "¿Qué platos te gustan más?", description: "Elige hasta tres. Aparecerán con más frecuencia y puedes cambiarlas cuando quieras.", render: (p) => <PreferencesField {...p} /> },
  { title: "¿Comes de todo?", description: "Filtraremos las recetas que no encajen con tu dieta.", render: (p) => <DietField {...p} /> },
  { title: "¿Qué comes?", description: "Marca las carnes y pescados que entran en casa.", render: (p) => <MeatsField {...p} /> },
  { title: "¿Qué alimentos no te gustan?", description: "No los incluiremos en tu planificación.", render: (p) => <DislikesField {...p} /> },
  {
    title: "¿Alguna alergia en casa?",
    description: "Los 14 alérgenos de declaración obligatoria en la UE. Son restricciones, nunca preferencias.",
    render: (p) => <AllergensField {...p} />,
    // Sin marcar nada se puede seguir: el botón confirma explícitamente que no hay alergias.
    cta: (p) => (!p.noAllergies && p.allergens.length === 0 ? { label: "No hay alergias · Continuar", patch: { noAllergies: true } } : null),
  },
  { title: "Toca lo que tienes en tu cocina", description: "Adaptaremos las recetas a tus aparatos. Los fuegos se dan por hechos.", render: (p) => <KitchenField {...p} /> },
];

const BENEFITS = [
  { icon: "🧾", title: "Precio real del súper", text: "Calculamos envases completos, como en caja." },
  { icon: "⏱️", title: "Cenas rápidas", text: "Priorizamos platos de 30 minutos o menos." },
  { icon: "♻️", title: "Menos desperdicio", text: "Aprovechamos ingredientes y sobras." },
  { icon: "🛒", title: "Lista por pasillos", text: "Organizada según las secciones del súper." },
  { icon: "🏠", title: "Usa tu despensa", text: "Descontamos lo que ya tienes en casa." },
  { icon: "👩‍🍳", title: "Recetas caseras", text: `${RECIPES.length} platos tradicionales y actuales.` },
];

export default function Onboarding() {
  const router = useRouter();
  const draft = useMesa((s) => s.draft);
  const step = useMesa((s) => s.draftStep);
  const setDraft = useMesa((s) => s.setDraft);
  const setStep = useMesa((s) => s.setDraftStep);
  const commit = useMesa((s) => s.commitDraft);
  const requestGeneration = useMesa((s) => s.requestGeneration);
  const onboardingDone = useMesa((s) => s.onboardingDone);

  const total = STEPS.length + 1;
  const isValue = step >= STEPS.length;
  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const valid = isValue || !current.valid || current.valid(draft);

  const back = () => (step === 0 ? router.push(onboardingDone ? "/preferencias" : "/bienvenida") : setStep(step - 1));
  const cta = !isValue ? current.cta?.(draft) ?? null : null;
  const next = () => {
    if (!valid) return;
    if (cta) setDraft(cta.patch);
    window.scrollTo({ top: 0 });
    if (!isValue) return setStep(step + 1);
    commit();
    requestGeneration("onboarding");
    router.push("/generando");
  };

  return (
    <Gate requireOnboarding={false}>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-paper">
        <header className="sticky top-0 z-20 bg-paper/95 px-5 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <button aria-label="Volver" onClick={back} className="grid size-10 place-items-center rounded-full bg-mist hover:bg-line">
              <ChevronLeft className="size-5" />
            </button>
            <Logo />
            <span className="w-10 text-right text-xs font-semibold text-faint tabular">
              {Math.min(step + 1, total)}/{total}
            </span>
          </div>
          <ProgressBar value={(step + 1) / total} className="mt-4" />
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex-1 px-5 pb-32 pt-4"
          >
            {isValue ? (
              <ValueProp />
            ) : (
              <>
                <h1 className="text-[30px] font-extrabold leading-[1.1]">{current.title}</h1>
                <p className="mb-6 mt-2 text-[15px] text-muted">{current.description}</p>
                {current.render({ value: draft, onChange: setDraft })}
              </>
            )}
          </motion.main>
        </AnimatePresence>

        <footer className="hide-on-keyboard safe-bottom fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper to-paper/0 px-5 pb-4 pt-6">
          <div className="mx-auto max-w-xl">
            {!valid && current.hint && <p className="mb-2 text-center text-xs font-medium text-tomato">{current.hint(draft)}</p>}
            <Button size="lg" block disabled={!valid} onClick={next}>
              {isValue ? "Hacer mi semana" : cta ? cta.label : "Continuar"} <ArrowRight className="size-5" />
            </Button>
          </div>
        </footer>
      </div>
    </Gate>
  );
}

function ValueProp() {
  return (
    <div>
      <h1 className="text-[34px] font-extrabold leading-[1.05]">
        Cocina más, gasta menos <span className="text-cobalt">con MESA.</span>
      </h1>
      <p className="mt-2 text-[15px] text-muted">Esto es lo que vamos a hacer con tus respuestas:</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {BENEFITS.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl bg-white p-4 shadow-soft"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-cobalt-50 text-2xl">{b.icon}</span>
            <p className="mt-3 font-bold leading-tight">{b.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{b.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
