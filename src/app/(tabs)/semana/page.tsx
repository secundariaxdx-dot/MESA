"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Info, Package, ShoppingBasket, SlidersHorizontal, Sparkles, TriangleAlert, CheckCircle2 } from "lucide-react";
import { useMesa } from "@/store/mesa";
import type { PlannedMeal } from "@/domain/types";
import { storeNames, useMarket, useShoppingList } from "@/hooks/useMesaData";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, ProgressBar, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { MealCard } from "@/components/week/MealCard";
import { SwapSheet } from "@/components/week/SwapSheet";
import { DAYS } from "@/data/taxonomy";
import { addDays, greeting, longDate, shortDate } from "@/engine/dates";
import { formatMoney } from "@/engine/units";
import { expiringSoon } from "@/engine/pantry";

const NONE: string[] = [];

export default function Semana() {
  const router = useRouter();
  const plan = useMesa((s) => s.plan);
  const profile = useMesa((s) => s.profile);
  const pantry = useMesa((s) => s.pantry);
  const purchases = useMesa((s) => s.purchases);
  const checked = useMesa((s) => (s.plan ? s.checked[s.plan.id] ?? NONE : NONE));
  const requestGeneration = useMesa((s) => s.requestGeneration);
  const list = useShoppingList();
  const { market, currency } = useMarket();
  const [swapId, setSwapId] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<number, PlannedMeal[]>();
    plan?.meals.forEach((m) => map.set(m.dayIndex, [...(map.get(m.dayIndex) ?? []), m]));
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  const newWeek = () => {
    requestGeneration("otra");
    router.push("/generando");
  };

  const prefsButton = (
    <Link href="/preferencias" aria-label="Preferencias" className="grid size-11 place-items-center rounded-full bg-white shadow-soft transition hover:bg-mist">
      <SlidersHorizontal className="size-5 text-ink-2" />
    </Link>
  );

  if (!plan || !list) {
    return (
      <>
        <PageHeader title={`${greeting()}${profile.name ? `, ${profile.name}` : ""}`} right={prefsButton} />
        <div className="px-4 sm:px-6">
          <EmptyState icon="🗓️" title="Aún no tienes semana" text="Creamos tu menú con tus preferencias, tu presupuesto y lo que tienes en casa." action={<Button onClick={newWeek}>Hacer mi semana</Button>} />
        </div>
      </>
    );
  }

  const purchase = purchases.find((p) => p.id === plan.purchaseId);
  // Tras registrar la compra, lo gastado es lo pagado más lo que falte por cambios posteriores.
  const total = (purchase?.total ?? 0) + list.checkoutTotal;
  const ratio = total / plan.budget;
  const over = total > plan.budget;
  const remaining = plan.budget - total;
  const activeMeals = plan.meals.filter((m) => m.status !== "skipped");
  const cookedCount = activeMeals.filter((m) => m.status === "cooked").length;
  const days = [...new Set(plan.meals.map((m) => m.dayIndex))].sort((a, b) => a - b);
  const firstDay = addDays(plan.weekStart, days[0] ?? 0);
  const lastDay = addDays(plan.weekStart, days[days.length - 1] ?? 6);
  const toBuyIds = list.toBuy.map((i) => i.ingredientId);
  const inCart = checked.filter((id) => toBuyIds.includes(id)).length;
  const purchased = Boolean(plan.purchaseId);
  const soon = expiringSoon(pantry);
  const slots = [profile.meals.comida && "comidas", profile.meals.cena && "cenas"].filter(Boolean).join(" y ");

  return (
    <>
      <PageHeader
        title={`${greeting()}${profile.name ? `, ${profile.name}` : ""}`}
        subtitle={
          <>
            {activeMeals.length} {slots || "platos"} · {plan.people} {plan.people === 1 ? "persona" : "personas"} ·{" "}
            {storeNames(list.stores.filter((st) => st.itemCount > 0).map((st) => st.supermarketId)) || market.name}
          </>
        }
        right={prefsButton}
      />

      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Columna lateral en escritorio: presupuesto y compra */}
        <div className="space-y-3 lg:sticky lg:top-6 lg:order-2">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("relative overflow-hidden rounded-[28px] p-5 text-white shadow-lift", over ? "bg-[#1d2a6b]" : "bg-cobalt")} aria-label="Presupuesto de la semana">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt-100" data-testid="week-stores">
              Tu semana en {purchase?.stores?.length ? storeNames(purchase.stores.map((st) => st.supermarketId)) : storeNames(list.stores.filter((st) => st.itemCount > 0).map((st) => st.supermarketId)) || market.name}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[44px] font-extrabold leading-none tabular" data-testid="checkout-total">
                {formatMoney(total, currency)}
              </span>
              <span className="font-semibold text-cobalt-100">de {formatMoney(plan.budget, currency)}</span>
            </div>
            <ProgressBar value={Math.min(1, ratio)} tone={over ? "sun" : "white"} track="bg-white/20" className="mt-4 h-2.5" />
            <div className="mt-3 flex items-center justify-between text-sm font-semibold">
              <span className={over ? "text-sun" : "text-white"}>{over ? `Te pasas ${formatMoney(-remaining, currency)}` : `Te quedan ${formatMoney(remaining, currency)}`}</span>
              <span className="text-cobalt-100">
                {shortDate(firstDay)} – {shortDate(lastDay)}
              </span>
            </div>
            <div className="mt-4 space-y-1 border-t border-white/15 pt-3 text-[11px] leading-relaxed text-cobalt-100">
              {purchase ? (
                <p>
                  Pagado en caja: {formatMoney(purchase.total, currency)} (compra registrada)
                  {list.checkoutTotal > 0 ? ` · pendiente por cambios: ${formatMoney(list.checkoutTotal, currency)}` : ""}.
                </p>
              ) : (
                <p>Importe estimado en caja con envases completos{list.pantrySavings > 0 ? `, descontando tu despensa (−${formatMoney(list.pantrySavings, currency)})` : ""}.</p>
              )}
              {!purchase && list.multiStore && list.singleStoreTotal - list.checkoutTotal > 0.004 && (
                <p className="font-semibold text-white">
                  Repartiendo la compra ahorras {formatMoney(list.singleStoreTotal - list.checkoutTotal, currency)} frente a todo en {market.name}.
                </p>
              )}
              <p>
                Los platos consumen ≈ {formatMoney(list.consumedTotal, currency)}; el resto de los envases queda en tu despensa.
              </p>
              <p>
                Precios {list.isDemoPrices ? "de demostración (ficticios)" : "de referencia"} · actualizados el {longDate(list.referenceDate)}
              </p>
            </div>
          </motion.section>

          <Link href="/lista" className="block">
            <Card className="flex items-center gap-4 p-4 transition hover:ring-2 hover:ring-cobalt-100">
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", purchased ? "bg-leaf-50 text-leaf" : "bg-cobalt-50 text-cobalt")}>
                {purchased ? <CheckCircle2 className="size-6" /> : <ShoppingBasket className="size-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Lista de la compra</span>
                <span className="block text-sm text-muted tabular">
                  {purchased ? "Compra registrada" : `${inCart} de ${list.toBuy.length} en el carro`}
                </span>
                {!purchased && <ProgressBar value={list.toBuy.length ? inCart / list.toBuy.length : 1} className="mt-2" tone="leaf" />}
              </span>
              <ChevronRight className="size-5 text-faint" />
            </Card>
          </Link>

          <Link href="/despensa" className="block">
            <Card className="flex items-center gap-4 p-4 transition hover:ring-2 hover:ring-cobalt-100">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sun-50 text-[#a77a00]">
                <Package className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Despensa</span>
                <span className="block text-sm text-muted">
                  {pantry.filter((p) => p.status === "ok").length} productos
                  {soon.length ? ` · ${soon.length} conviene usar pronto` : ""}
                </span>
              </span>
              <ChevronRight className="size-5 text-faint" />
            </Card>
          </Link>

          <Button variant="secondary" block size="lg" onClick={() => setConfirmNew(true)}>
            <Sparkles className="size-5" /> Otra semana
          </Button>
        </div>

        {/* Menú semanal */}
        <div className="lg:order-1">
          {plan.warnings.map((w) => (
            <div key={w} className="mb-4 flex gap-3 rounded-2xl bg-sun-50 p-4 text-sm text-ink-2">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#b88600]" />
              <div>
                <p>{w}</p>
                <p className="mt-1 text-xs text-muted">Alternativas: sube el presupuesto, activa «Lo más barato posible», reduce días o añade a la despensa lo que ya tengas.</p>
                <Link href="/preferencias" className="mt-2 inline-block text-xs font-bold text-cobalt">
                  Ajustar preferencias →
                </Link>
              </div>
            </div>
          ))}

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Tu menú</h2>
            <span className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-bold text-leaf tabular">
              {cookedCount} de {activeMeals.length} cocinados
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {byDay.map(([day, meals]) => (
              <section key={day}>
                <h3 className="mb-2.5 flex items-baseline gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-ink">
                  {DAYS[day].name}
                  <span className="text-xs font-semibold normal-case tracking-normal text-faint">{shortDate(addDays(plan.weekStart, day))}</span>
                </h3>
                <div className="grid gap-3">
                  {meals
                    .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "comida" ? -1 : 1))
                    .map((m) => (
                      <MealCard key={m.id} meal={m} onSwap={setSwapId} />
                    ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] bg-white p-5 text-center shadow-soft">
            <p className="font-display text-lg font-bold">¿No te convence?</p>
            <p className="mt-1 text-sm text-muted">Generamos otra semana con tus mismas preferencias, sin repetir los platos actuales.</p>
            <Button size="lg" block className="mt-4" onClick={() => setConfirmNew(true)}>
              <Sparkles className="size-5" /> Otra semana
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 px-1 text-xs text-faint">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            El importe de cada plato (≈) es el coste proporcional de lo que consume. Lo que pagas en caja es el total de la tarjeta azul.
          </p>
        </div>
      </div>

      <SwapSheet mealId={swapId} onClose={() => setSwapId(null)} />
      <Sheet
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        title="¿Generar otra semana?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setConfirmNew(false)}>
              Cancelar
            </Button>
            <Button block onClick={newWeek}>
              Generar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Crearemos un menú nuevo con tus preferencias actuales e intentaremos no repetir los platos de esta semana. La semana actual se guarda en tu historial
          {plan.purchaseId ? " y tu compra registrada se conserva" : ""}.
        </p>
      </Sheet>
    </>
  );
}
