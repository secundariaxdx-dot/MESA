"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { Button, Logo } from "@/components/ui/primitives";
import { Gate } from "@/components/layout/AppShell";

const FLOAT = ["🍅", "🥦", "🐟", "🥚", "🧄", "🫘", "🥕", "🍋"];

export default function Bienvenida() {
  const router = useRouter();
  const startOnboarding = useMesa((s) => s.startOnboarding);
  const loadDemo = useMesa((s) => s.loadDemo);
  const done = useMesa((s) => s.onboardingDone);

  return (
    <Gate requireOnboarding={false}>
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cobalt text-white">
        <div className="pointer-events-none absolute inset-0">
          {FLOAT.map((e, i) => (
            <motion.span
              key={i}
              className="absolute text-4xl opacity-90 sm:text-5xl"
              style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${9 + ((i * 23) % 17)}%` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.95, y: [0, -8, 0] }}
              transition={{ delay: i * 0.08, y: { duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" } }}
            >
              {e}
            </motion.span>
          ))}
        </div>
        <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-10 pt-8">
          <Logo light />
          <div className="mt-auto">
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-[44px] font-extrabold leading-[1.02] sm:text-6xl">
              Cocina más.
              <br />
              Gasta <span className="text-sun">menos.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-4 max-w-sm text-[17px] leading-relaxed text-cobalt-100">
              Tu semana de comidas, la compra calculada por envases completos como en caja y tu despensa, en un solo sitio.
            </motion.p>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="white"
                size="lg"
                block
                onClick={() => {
                  startOnboarding(true);
                  router.push("/onboarding");
                }}
              >
                Empezar desde cero <ArrowRight className="size-5" />
              </Button>
              <Button
                size="lg"
                block
                className="bg-white/10 ring-1 ring-white/30 hover:bg-white/20"
                onClick={() => {
                  loadDemo();
                  router.push("/semana");
                }}
              >
                <Sparkles className="size-5 text-sun" /> Ver la semana de ejemplo
              </Button>
              {done && (
                <button className="mt-1 text-sm font-semibold text-cobalt-100 underline-offset-4 hover:underline" onClick={() => router.push("/semana")}>
                  Volver a mi semana
                </button>
              )}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-cobalt-100/80">
              MESA no está afiliada a ningún supermercado. Los precios se leen a diario de la web pública de cada súper cuando están disponibles; si no, son estimados. Son orientativos: el ticket manda.
            </p>
          </div>
        </div>
      </div>
    </Gate>
  );
}
