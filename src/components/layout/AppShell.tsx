"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ensureRemotePrices, pricesSettled, subscribePrices } from "@/services/prices/provider";
import { CalendarDays, BookOpen, SlidersHorizontal, Settings, ShoppingBasket, Package, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useMesa } from "@/store/mesa";
import { cn, Logo } from "@/components/ui/primitives";

export const TABS = [
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/recetas", label: "Recetas", icon: BookOpen },
  { href: "/preferencias", label: "Preferencias", icon: SlidersHorizontal },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

const EXTRA = [
  { href: "/lista", label: "Lista de la compra", icon: ShoppingBasket },
  { href: "/despensa", label: "Despensa", icon: Package },
  { href: "/productos", label: "Mis productos", icon: Star },
];

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Logo className="text-3xl" />
      </motion.div>
    </div>
  );
}

/** Espera a que el estado persistido esté cargado y exige onboarding. */
/** Espera a los precios del día (como mucho 2,5 s) para no mostrar importes que luego cambian. */
function usePricesReady() {
  const settled = useSyncExternalStore(subscribePrices, pricesSettled, () => false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    ensureRemotePrices();
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return settled || timedOut;
}

export function Gate({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const pricesReady = usePricesReady();
  const hydrated = useMesa((s) => s.hydrated);
  const done = useMesa((s) => s.onboardingDone);
  const router = useRouter();
  useEffect(() => {
    if (hydrated && requireOnboarding && !done) router.replace("/bienvenida");
  }, [hydrated, done, requireOnboarding, router]);
  if (!hydrated || !pricesReady || (requireOnboarding && !done)) return <Splash />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <Gate>
      <div className="min-h-dvh lg:flex">
        {/* Navegación lateral (escritorio) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
          <Link href="/semana" className="px-3">
            <Logo />
          </Link>
          <nav className="mt-8 flex flex-col gap-1">
            {[...TABS.slice(0, 1), ...EXTRA, ...TABS.slice(1)].map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                  isActive(t.href) ? "bg-cobalt-50 text-cobalt" : "text-ink-2 hover:bg-mist",
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </Link>
            ))}
          </nav>
          <p className="mt-auto px-3 text-xs leading-relaxed text-faint">MESA no está afiliada a ningún supermercado. Los precios se leen a diario de su web pública y son orientativos.</p>
        </aside>

        <main className="mx-auto w-full max-w-5xl flex-1 pb-28 lg:pb-12">{children}</main>

        {/* Barra de pestañas (móvil y tablet) */}
        <nav className="hide-on-keyboard safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Navegación principal">
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {TABS.map((t) => {
              const active = isActive(t.href) || (t.href === "/semana" && (isActive("/lista") || isActive("/despensa") || isActive("/productos")));
              return (
                <Link key={t.href} href={t.href} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold">
                  {active && <motion.span layoutId="tab-pill" className="absolute top-1.5 h-8 w-14 rounded-full bg-cobalt-50" />}
                  <t.icon className={cn("relative size-[22px]", active ? "text-cobalt" : "text-faint")} />
                  <span className={cn("relative", active ? "text-cobalt" : "text-faint")}>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </Gate>
  );
}

export function PageHeader({ title, subtitle, left, right }: { title: string; subtitle?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex items-start gap-3 px-4 pb-4 pt-6 sm:px-6 lg:pt-10">
      {left}
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {right}
    </header>
  );
}
