"use client";

import { recipeHref } from "@/lib/routes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Minus, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { BackButton, Button, Card, Chip, EmptyState, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { INGREDIENTS, findIngredient } from "@/data/ingredients";
import { AISLES } from "@/data/taxonomy";
import { daysLeft, expiringSoon, newPantryItem } from "@/engine/pantry";
import { formatQty } from "@/engine/units";
import { normalize } from "@/engine/compat";
import { addDays, shortDate, todayISO } from "@/engine/dates";
import { aiAvailable, claudeAI, localAI, type LeftoverIdea } from "@/services/ai";
import { toast } from "@/components/ui/Toast";
import type { PantryItem } from "@/domain/types";

export default function Despensa() {
  const pantry = useMesa((s) => s.pantry);
  const removePantry = useMesa((s) => s.removePantry);
  const updatePantry = useMesa((s) => s.updatePantry);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [filter, setFilter] = useState<"todo" | "pronto" | "agotado">("todo");

  const soon = expiringSoon(pantry);
  const visible = pantry.filter((p) => (filter === "todo" ? p.status === "ok" : filter === "agotado" ? p.status === "agotado" : soon.includes(p)));
  const grouped = AISLES.map((a) => ({ a, items: visible.filter((p) => (findIngredient(p.ingredientId)?.aisle ?? "especias-otros") === a.id) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        title="Despensa"
        subtitle="Lo que tienes en casa se descuenta de la lista de la compra."
        left={<BackButton href="/semana" />}
        right={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Añadir
          </Button>
        }
      />
      <div className="space-y-6 px-4 sm:px-6">
        {soon.length > 0 && <UseSoon items={soon} />}

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <Chip active={filter === "todo"} onClick={() => setFilter("todo")}>
            Inventario · {pantry.filter((p) => p.status === "ok").length}
          </Chip>
          <Chip active={filter === "pronto"} onClick={() => setFilter("pronto")}>
            Usar pronto · {soon.length}
          </Chip>
          <Chip active={filter === "agotado"} onClick={() => setFilter("agotado")}>
            Agotados · {pantry.filter((p) => p.status === "agotado").length}
          </Chip>
        </div>

        {!visible.length ? (
          <EmptyState
            icon="🫙"
            title={filter === "todo" ? "Tu despensa está vacía" : "Nada por aquí"}
            text={filter === "todo" ? "Añade lo que ya tienes (aceite, sal, legumbres…) y no lo volveremos a poner en la lista." : "No hay productos en esta sección."}
            action={filter === "todo" ? <Button onClick={() => setAdding(true)}>Añadir productos</Button> : undefined}
          />
        ) : (
          grouped.map(({ a, items }) => (
            <section key={a.id}>
              <h2 className="mb-2 text-sm font-extrabold uppercase tracking-[0.12em]">
                {a.icon} {a.name}
              </h2>
              <Card className="divide-y divide-line">
                {items.map((p) => {
                  const left = daysLeft(p);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-2xl">{findIngredient(p.ingredientId)?.icon ?? "🥫"}</span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(p)}>
                        <span className={cn("block font-semibold", p.status === "agotado" && "text-faint line-through")}>{p.name}</span>
                        <span className="block text-xs text-muted">
                          {p.status === "agotado" ? "Agotado" : p.quantity === null ? "Tengo suficiente" : formatQty(p.quantity, p.unit)}
                          {p.source === "compra" && " · de tu compra"}
                          {left !== null && p.status === "ok" && (
                            <span className={cn(left <= 2 ? "font-semibold text-tomato" : "")}> · {left < 0 ? "caducado" : left === 0 ? "caduca hoy" : `usar antes del ${shortDate(p.expiresAt!)}`}</span>
                          )}
                        </span>
                      </button>
                      {p.status === "agotado" ? (
                        <Button size="sm" variant="secondary" onClick={() => updatePantry(p.id, { status: "ok", quantity: null })}>
                          Repuesto
                        </Button>
                      ) : (
                        <button className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-mist" onClick={() => updatePantry(p.id, { status: "agotado", quantity: 0 })}>
                          Agotado
                        </button>
                      )}
                      <button
                        aria-label={`Eliminar ${p.name}`}
                        className="grid size-8 place-items-center rounded-lg text-faint hover:bg-tomato-50 hover:text-tomato"
                        onClick={() => {
                          removePantry(p.id);
                          toast(`${p.name} eliminado`, "info", { label: "Deshacer", onClick: () => useMesa.getState().addPantry(p) });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))
        )}
      </div>
      <AddPantrySheet open={adding} onClose={() => setAdding(false)} />
      <EditPantrySheet key={editing?.id ?? "none"} item={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function UseSoon({ items }: { items: PantryItem[] }) {
  const [ideas, setIdeas] = useState<LeftoverIdea[]>([]);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    localAI.leftoverIdeas(items).then(setIdeas);
    aiAvailable().then(setAi);
  }, [items]);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 bg-sun-50 px-4 py-3">
        <CalendarClock className="size-5 text-[#a77a00]" />
        <h2 className="font-bold">Conviene usar pronto</h2>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {items.map((p) => (
          <span key={p.id} className="rounded-full bg-mist px-3 py-1 text-xs font-semibold">
            {findIngredient(p.ingredientId)?.icon} {p.name} {p.quantity ? `· ${formatQty(p.quantity, p.unit)}` : ""}
          </span>
        ))}
      </div>
      <ul className="space-y-1 p-4">
        {ideas.map((i) => (
          <li key={i.title}>
            {i.recipeId ? (
              <Link href={recipeHref(i.recipeId)} className="block rounded-xl px-3 py-2 hover:bg-mist">
                <span className="block text-sm font-semibold">{i.title}</span>
                <span className="block text-xs text-muted">{i.detail}</span>
              </Link>
            ) : (
              <div className="rounded-xl bg-cobalt-50 px-3 py-2">
                <span className="block text-sm font-semibold">{i.title}</span>
                <span className="block text-xs text-muted">{i.detail}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {ai && (
        <div className="px-4 pb-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const extra = await claudeAI.leftoverIdeas(items);
                setIdeas((prev) => [...extra, ...prev]);
              } catch {
                toast("No hemos podido consultar a la IA. Usamos las ideas del catálogo.", "error");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Sparkles className="size-4" /> {loading ? "Pensando…" : "Más ideas con IA"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function AddPantrySheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const addPantry = useMesa((s) => s.addPantry);
  const pantry = useMesa((s) => s.pantry);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [enough, setEnough] = useState(true);
  const [expires, setExpires] = useState("");

  const results = useMemo(() => {
    const n = normalize(q);
    return INGREDIENTS.filter((i) => !n || normalize(i.name).includes(n)).slice(0, 30);
  }, [q]);
  const ing = findIngredient(picked);

  const reset = () => {
    setQ("");
    setPicked(null);
    setCustom(false);
    setAmount("");
    setEnough(true);
    setExpires("");
  };
  const close = () => {
    reset();
    onClose();
  };
  const save = () => {
    const qty = enough ? null : Number(amount.replace(",", ".")) || null;
    if (custom) {
      if (!q.trim()) return;
      addPantry(newPantryItem(null, q.trim(), qty, { expiresAt: expires || undefined }));
    } else if (ing) {
      addPantry(newPantryItem(ing.id, ing.name, qty, { expiresAt: expires || undefined }));
    } else return;
    toast("Añadido a tu despensa");
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Añadir a la despensa"
      footer={
        (ing || custom) && (
          <Button block onClick={save}>
            Guardar
          </Button>
        )
      }
    >
      {!ing && !custom ? (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un ingrediente" className="h-12 w-full rounded-2xl border border-line bg-white pl-10 pr-4 outline-none focus:border-cobalt" />
          </div>
          <ul className="mt-3 divide-y divide-line rounded-2xl bg-white">
            {results.map((i) => {
              const has = pantry.some((p) => p.ingredientId === i.id && p.status === "ok");
              return (
                <li key={i.id}>
                  <button onClick={() => setPicked(i.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-mist">
                    <span className="text-xl">{i.icon}</span>
                    <span className="flex-1 font-medium">{i.name}</span>
                    {has && <span className="text-xs font-semibold text-leaf">Ya lo tienes</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {q.trim() && (
            <button onClick={() => setCustom(true)} className="mt-3 w-full rounded-2xl border-2 border-dashed border-line py-3 text-sm font-semibold text-ink-2">
              Añadir «{q.trim()}» como producto propio
            </button>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
            <span className="text-3xl">{ing?.icon ?? "🥫"}</span>
            <span className="flex-1 font-bold">{ing?.name ?? q}</span>
            <button className="text-sm font-semibold text-cobalt" onClick={reset}>
              Cambiar
            </button>
          </div>
          {custom && <p className="text-xs text-muted">Los productos propios no están en el catálogo, así que no se descuentan de la lista automáticamente.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEnough(true)} className={cn("rounded-2xl border-2 p-3 text-sm font-semibold", enough ? "border-cobalt bg-cobalt-50 text-cobalt" : "border-line bg-white")}>
              Tengo suficiente
            </button>
            <button onClick={() => setEnough(false)} className={cn("rounded-2xl border-2 p-3 text-sm font-semibold", !enough ? "border-cobalt bg-cobalt-50 text-cobalt" : "border-line bg-white")}>
              Indicar cantidad
            </button>
          </div>
          {!enough && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Cantidad ({ing?.unit ?? "ud"})</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="p. ej. 500" className="h-12 w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-cobalt" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Fecha de caducidad (opcional)</span>
            <input type="date" min={todayISO()} value={expires} onChange={(e) => setExpires(e.target.value)} className="h-12 w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-cobalt" />
          </label>
          {ing && !expires && (
            <button className="text-xs font-semibold text-cobalt" onClick={() => setExpires(addDays(todayISO(), ing.shelfLifeDays))}>
              Usar duración orientativa ({ing.shelfLifeDays} días)
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

function EditPantrySheet({ item, onClose }: { item: PantryItem | null; onClose(): void }) {
  const updatePantry = useMesa((s) => s.updatePantry);
  const [qty, setQty] = useState<number | null>(item?.quantity ?? null);
  const [expires, setExpires] = useState(item?.expiresAt ?? "");
  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const step = item.unit === "ud" ? 1 : item.unit === "g" ? 50 : 50;
  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      title={item.name}
      footer={
        <Button
          block
          onClick={() => {
            updatePantry(item.id, { quantity: qty, expiresAt: expires || undefined, status: qty === 0 ? "agotado" : "ok" });
            toast("Despensa actualizada");
            onClose();
          }}
        >
          Guardar cambios
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setQty(null)} className={cn("rounded-2xl border-2 p-3 text-sm font-semibold", qty === null ? "border-cobalt bg-cobalt-50 text-cobalt" : "border-line bg-white")}>
            Tengo suficiente
          </button>
          <button onClick={() => setQty(qty ?? step * 2)} className={cn("rounded-2xl border-2 p-3 text-sm font-semibold", qty !== null ? "border-cobalt bg-cobalt-50 text-cobalt" : "border-line bg-white")}>
            Cantidad exacta
          </button>
        </div>
        {qty !== null && (
          <div className="flex items-center justify-between rounded-2xl bg-white p-3">
            <button aria-label="Menos" onClick={() => setQty(Math.max(0, qty - step))} className="grid size-11 place-items-center rounded-full bg-mist">
              <Minus className="size-5" />
            </button>
            <span className="font-display text-2xl font-bold tabular">{formatQty(qty, item.unit)}</span>
            <button aria-label="Más" onClick={() => setQty(qty + step)} className="grid size-11 place-items-center rounded-full bg-cobalt text-white">
              <Plus className="size-5" />
            </button>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Fecha de caducidad</span>
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-12 w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-cobalt" />
        </label>
        <p className="text-xs text-muted">Las fechas son orientativas. Revisa siempre el producto y la fecha del envase.</p>
      </div>
    </Sheet>
  );
}
