"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronDown, ChevronRight, Home, PackageCheck, Star, TriangleAlert } from "lucide-react";
import { MyProductSheet } from "@/components/shopping/MyProductSheet";
import type { MyProduct } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { storeNames, useMarket, useShoppingList } from "@/hooks/useMesaData";
import { StoreModeCard, StoreHeader } from "@/components/shopping/StoreMode";
import { getSupermarket } from "@/data/geo";
import { PageHeader } from "@/components/layout/AppShell";
import { BackButton, Button, Card, EmptyState, ProgressBar, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { AISLES } from "@/data/taxonomy";
import { getRecipe } from "@/data/recipes";
import { formatMoney, formatPack, formatQty } from "@/engine/units";
import { longDate } from "@/engine/dates";
import { toast } from "@/components/ui/Toast";
import type { AisleId, ShoppingItem } from "@/domain/types";

const NONE: string[] = [];

export default function Lista() {
  const router = useRouter();
  const plan = useMesa((s) => s.plan);
  const checked = useMesa((s) => (s.plan ? s.checked[s.plan.id] ?? NONE : NONE));
  const toggleChecked = useMesa((s) => s.toggleChecked);
  const completePurchase = useMesa((s) => s.completePurchase);
  const purchases = useMesa((s) => s.purchases);
  const list = useShoppingList();
  const { market, currency } = useMarket();
  const [confirm, setConfirm] = useState(false);
  const [showCovered, setShowCovered] = useState(true);
  const [favorite, setFavorite] = useState<Partial<MyProduct> | null>(null);
  const myProducts = useMesa((s) => s.myProducts);

  if (!plan || !list) {
    return (
      <>
        <PageHeader title="Lista de la compra" left={<BackButton href="/semana" />} />
        <div className="px-4">
          <EmptyState icon="🛒" title="No hay lista todavía" text="Crea tu semana y calcularemos qué comprar, por envases completos." action={<Link href="/semana"><Button>Ir a mi semana</Button></Link>} />
        </div>
      </>
    );
  }

  const purchase = purchases.find((p) => p.id === plan.purchaseId);
  const ids = list.toBuy.map((i) => i.ingredientId);
  const inCart = checked.filter((id) => ids.includes(id)).length;
  const allDone = list.toBuy.length > 0 && inCart === list.toBuy.length;
  const byAisle = (items: ShoppingItem[]) =>
    AISLES.map((a) => ({ aisle: a, items: items.filter((i) => i.aisle === (a.id as AisleId)) })).filter((g) => g.items.length);
  // Con la compra repartida, primero por supermercado y dentro por pasillos.
  const splitByStore = list.stores.length > 1;
  const sections = splitByStore
    ? list.stores.map((st) => ({ store: st, groups: byAisle(list.toBuy.filter((i) => i.supermarketId === st.supermarketId)) }))
    : [{ store: null, groups: byAisle(list.toBuy) }];
  const storesLabel = storeNames(list.stores.map((s) => s.supermarketId));

  return (
    <>
      <PageHeader title="Lista de la compra" subtitle={<span className="font-semibold text-ink-2" data-testid="list-stores">{storesLabel || market.name}</span>} left={<BackButton href="/semana" />} />

      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-6 lg:order-2">
          <Card className="overflow-hidden">
            <div className="bg-ink p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt-100">{purchase ? "Te falta por comprar" : "Lo que pagas en caja"}</p>
              <p className="mt-1 font-display text-[44px] font-extrabold leading-none tabular" data-testid="list-total">
                {formatMoney(list.checkoutTotal, currency)}
              </p>
              <p className="mt-2 text-xs text-cobalt-100">
                {list.isDemoPrices ? "Precios de demostración, no oficiales" : "Precios de referencia"} · {longDate(list.referenceDate)}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Productos a comprar</span>
                <span className="font-semibold tabular">{list.toBuy.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">En el carro</span>
                <span className="font-semibold tabular" data-testid="cart-count">
                  {inCart} de {list.toBuy.length}
                </span>
              </div>
              <ProgressBar value={list.toBuy.length ? inCart / list.toBuy.length : 1} tone="leaf" />
              {splitByStore && (
                <div className="space-y-1.5 rounded-xl bg-mist p-3">
                  {list.stores.map((st) => (
                    <div key={st.supermarketId} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: getSupermarket(st.supermarketId).color }} />
                        {getSupermarket(st.supermarketId).name} · {st.itemCount}
                      </span>
                      <span className="font-semibold tabular">{formatMoney(st.total, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
              {list.pantrySavings > 0 && (
                <p className="rounded-xl bg-leaf-50 px-3 py-2 text-xs font-semibold text-leaf">Tu despensa te ahorra {formatMoney(list.pantrySavings, currency)} esta semana.</p>
              )}
              {list.toBuy.some((i) => i.priceUnknown) && (
                <p className="rounded-xl bg-sun-50 px-3 py-2 text-xs text-ink-2">
                  {list.toBuy.filter((i) => i.priceUnknown).length} de tus productos no tiene precio y no suma al total.
                </p>
              )}
              <p className="text-[11px] leading-relaxed text-faint">
                El total suma envases completos, no la parte proporcional de cada ingrediente. Lo que no uses queda en tu despensa.
              </p>
            </div>
          </Card>
          {purchase && (
            <Card className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" />
              <div className="text-sm">
                <p className="font-bold">Compra registrada</p>
                <p className="text-muted">
                  {new Date(purchase.date).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} · {formatMoney(purchase.total, purchase.currency)} · {purchase.items.length} productos añadidos a tu despensa.
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:order-1">
          {!purchase && <StoreModeCard list={list} />}
          <Link href="/productos" className="mb-6 flex items-center gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-soft transition hover:ring-2 hover:ring-cobalt-100" data-testid="mis-productos">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun-50 text-[#a77a00]">
              <Star className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Mis productos</span>
              <span className="block text-xs text-muted">
                {myProducts.length
                  ? `${myProducts.length} guardados · ${list.toBuy.filter((i) => i.custom).length} en esta lista`
                  : "Guarda lo que te gusta de cada súper (p. ej. el guacamole de Mercadona)"}
              </span>
            </span>
            <ChevronRight className="size-5 text-faint" />
          </Link>
          {list.toBuy.length === 0 ? (
            <EmptyState
              icon="✅"
              title={purchase ? "Todo comprado" : "No necesitas comprar nada"}
              text={purchase ? "Ya tienes en casa todo lo que necesita tu semana." : "Tu despensa cubre todos los ingredientes de la semana."}
              action={<Link href="/semana"><Button>Volver a mi semana</Button></Link>}
            />
          ) : (
            <div className="space-y-8">
              {sections.map(({ store, groups }) => (
                <div key={store?.supermarketId ?? "all"} className="space-y-6">
                  {store && (
                    <StoreHeader
                      supermarketId={store.supermarketId}
                      total={store.total}
                      itemCount={store.itemCount}
                      inCart={checked.filter((id) => list.toBuy.some((i) => i.ingredientId === id && i.supermarketId === store.supermarketId)).length}
                      currency={currency}
                    />
                  )}
                  {groups.map((g) => (
                    <section key={g.aisle.id}>
                      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em]">
                        <span className="text-lg">{g.aisle.icon}</span> {g.aisle.name}
                        <span className="text-xs font-semibold text-faint">{g.items.length}</span>
                      </h2>
                      <Card className="divide-y divide-line">
                        {g.items.map((item) => (
                          <ListRow
                            key={item.ingredientId}
                            item={item}
                            checked={checked.includes(item.ingredientId)}
                            onToggle={() => toggleChecked(item.ingredientId)}
                            currency={currency}
                            showAlternatives={list.multiStore}
                            onFavorite={() =>
                              item.custom
                                ? setFavorite(myProducts.find((p) => `fav:${p.id}` === item.ingredientId) ?? {})
                                : setFavorite(
                                    myProducts.find((p) => p.ingredientId === item.ingredientId) ?? {
                                      ingredientId: item.ingredientId,
                                      name: item.name,
                                      supermarketId: item.supermarketId,
                                    },
                                  )
                            }
                          />
                        ))}
                      </Card>
                    </section>
                  ))}
                </div>
              ))}
            </div>
          )}

          {list.covered.length > 0 && (
            <section className="mt-8">
              <button onClick={() => setShowCovered((v) => !v)} className="mb-2 flex w-full items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em]">
                <Home className="size-4 text-leaf" /> Lo tienes en casa
                <span className="text-xs font-semibold text-faint">{list.covered.length}</span>
                <ChevronDown className={cn("ml-auto size-4 transition", showCovered && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {showCovered && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <Card className="divide-y divide-line">
                      {list.covered.map((i) => (
                        <div key={i.ingredientId} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-2xl">{i.icon}</span>
                          <span className="flex-1">
                            <span className="block font-semibold">{i.name}</span>
                            <span className="block text-xs text-muted">Necesitas {formatQty(i.needed, i.unit)}</span>
                          </span>
                          <span className="rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-bold text-leaf">Lo tienes</span>
                        </div>
                      ))}
                    </Card>
                    <Link href="/despensa" className="mt-2 inline-block text-xs font-bold text-cobalt">
                      Gestionar despensa →
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {list.toBuy.length > 0 && (
            <div className="sticky bottom-20 z-10 mt-8 lg:bottom-6">
              <Button size="lg" block variant={allDone ? "success" : "primary"} onClick={() => setConfirm(true)} data-testid="ya-he-comprado">
                <PackageCheck className="size-5" /> Ya he comprado
              </Button>
            </div>
          )}
        </div>
      </div>

      <MyProductSheet open={favorite !== null} onClose={() => setFavorite(null)} initial={favorite ?? undefined} />
      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Registrar la compra"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              block
              onClick={() => {
                completePurchase(list);
                setConfirm(false);
                toast("Compra registrada. Los productos ya están en tu despensa.");
                router.push("/semana");
              }}
            >
              Registrar {formatMoney(list.checkoutTotal, currency)}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Guardaremos esta compra{list.stores.length > 1 ? ` (${storesLabel})` : ""} en tu historial y añadiremos los envases a tu despensa con una fecha de consumo orientativa. Al cocinar cada receta descontaremos lo que use.
        </p>
        {!allDone && (
          <p className="mt-3 flex gap-2 rounded-xl bg-sun-50 px-3 py-2 text-xs text-ink-2">
            <TriangleAlert className="size-4 shrink-0 text-[#b88600]" /> Tienes {list.toBuy.length - inCart} productos sin marcar. Se registrarán igualmente como comprados.
          </p>
        )}
      </Sheet>
    </>
  );
}

function ListRow({
  item,
  checked,
  onToggle,
  currency,
  showAlternatives,
  onFavorite,
}: {
  item: ShoppingItem;
  checked: boolean;
  onToggle(): void;
  currency: "EUR" | "NOK" | "GBP" | "USD";
  showAlternatives?: boolean;
  onFavorite(): void;
}) {
  const nextBest = showAlternatives ? [...item.alternatives].sort((a, b) => a.cost - b.cost)[0] : undefined;
  const [open, setOpen] = useState(false);
  const packText = item.packs.map((p) => `${p.count} ${p.packLabel} de ${item.unit === "ud" ? "" : "aprox. "}${formatPack(p.packSize, item.unit)}`).join(" + ");
  return (
    <div className={cn("transition-colors", checked && "bg-mist/60")}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <button
          role="checkbox"
          aria-checked={checked}
          aria-label={`Marcar ${item.name}`}
          onClick={onToggle}
          className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 transition active:scale-90", checked ? "border-leaf bg-leaf text-white" : "border-line bg-white")}
        >
          {checked && <Check className="size-4" strokeWidth={3} />}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <span className={cn("flex items-center gap-2 font-semibold", checked && "text-faint line-through")}>
            <span className="text-xl">{item.icon}</span>
            {item.name}
          </span>
          {item.custom ? (
            <span className="mt-0.5 block text-xs text-muted">
              {item.needed} ud · tu producto de {getSupermarket(item.supermarketId).name}
              {item.priceUnknown && " · sin precio"}
            </span>
          ) : (
            <span className="mt-0.5 block text-xs text-muted">
              Necesitas {formatQty(item.needed, item.unit)}
              {item.fromPantry > 0 && ` (tienes ${formatQty(item.fromPantry, item.unit)})`}
            </span>
          )}
          {item.pinned && !item.custom && (
            <span className="mt-0.5 block text-[11px] font-semibold text-[#9a6f00]">★ Tu favorito de {getSupermarket(item.supermarketId).name}</span>
          )}
          {item.custom ? null : item.missingProduct ? (
            <span className="mt-0.5 block text-xs font-semibold text-tomato">Sin producto en el catálogo de este supermercado</span>
          ) : (
            <span className="mt-0.5 block text-xs font-medium text-ink-2">Comprar {packText}</span>
          )}
          {item.shortfall > 0 && <span className="mt-0.5 block text-[11px] text-[#9a6f00]">Puede faltar un poco ({formatQty(item.shortfall, item.unit)}); el envase más cercano es suficiente.</span>}
          {item.surplus > 0 && item.surplus / item.purchasedQty > 0.25 && <span className="mt-0.5 block text-[11px] text-leaf">Te sobrarán ≈ {formatQty(item.surplus, item.unit)} para tu despensa.</span>}
          {nextBest && nextBest.cost - item.cost > 0.004 && (
            <span className="mt-0.5 block text-[11px] text-faint">
              En {getSupermarket(nextBest.supermarketId).name}: {formatMoney(nextBest.cost, currency)}
            </span>
          )}
        </button>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn("pt-0.5 font-display text-[17px] font-bold tabular", checked && "text-faint")}>{item.priceUnknown ? "—" : formatMoney(item.cost, currency)}</span>
          <button
            aria-label={item.pinned ? `Editar favorito ${item.name}` : `Guardar ${item.name} como favorito de ${getSupermarket(item.supermarketId).name}`}
            onClick={onFavorite}
            className="grid size-8 place-items-center rounded-full hover:bg-sun-50"
          >
            <Star className={cn("size-4", item.pinned ? "fill-sun text-[#d9a400]" : "text-faint")} />
          </button>
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="mx-4 mb-3 rounded-xl bg-mist px-3 py-2 text-xs text-muted">
              <p>{item.custom ? "Producto guardado en «Mis productos»." : `Para: ${item.recipeIds.map((r) => getRecipe(r)?.name).join(", ")}`}</p>
              <p className="mt-1">
                {item.packs.map((p) => `${p.count} × ${formatMoney(p.unitPrice, currency)}`).join(" + ")} · coste de lo que consumes ≈ {formatMoney(item.consumedCost, currency)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
