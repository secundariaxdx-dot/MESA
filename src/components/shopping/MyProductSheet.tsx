"use client";

import { useMemo, useState } from "react";
import { Link2, Minus, Plus, Search, X } from "lucide-react";
import type { AisleId, MyProduct } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { Sheet } from "@/components/ui/Sheet";
import { Button, Toggle, cn } from "@/components/ui/primitives";
import { INGREDIENTS, findIngredient } from "@/data/ingredients";
import { AISLES } from "@/data/taxonomy";
import { getCountry, getSupermarket, supermarketsOf } from "@/data/geo";
import { normalize } from "@/engine/compat";
import { uid } from "@/engine/pantry";
import { toast } from "@/components/ui/Toast";

/** Alta y edición de un producto que te gusta de un supermercado concreto. */
export function MyProductSheet({ open, onClose, initial }: { open: boolean; onClose(): void; initial?: Partial<MyProduct> }) {
  return (
    <Sheet open={open} onClose={onClose} title={initial?.id ? "Editar producto" : "Guardar un producto"}>
      {open && <Form key={initial?.id ?? initial?.ingredientId ?? "new"} initial={initial} onDone={onClose} />}
    </Sheet>
  );
}

function Form({ initial, onDone }: { initial?: Partial<MyProduct>; onDone(): void }) {
  const profile = useMesa((s) => s.profile);
  const saveMyProduct = useMesa((s) => s.saveMyProduct);
  const markets = supermarketsOf(profile.countryId);
  const currency = getCountry(profile.countryId).currency;
  const [name, setName] = useState(initial?.name ?? "");
  const [ingredientId, setIngredientId] = useState<string | null>(initial?.ingredientId ?? null);
  const [supermarketId, setSupermarketId] = useState(initial?.supermarketId ?? profile.supermarketId);
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price).replace(".", ",") : "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [aisle, setAisle] = useState<AisleId>(initial?.aisle ?? "fruta-verdura");
  const [inList, setInList] = useState(initial?.inList ?? true);
  const [note, setNote] = useState(initial?.note ?? "");
  const linked = findIngredient(ingredientId);

  const suggestions = useMemo(() => {
    const n = normalize(name);
    if (n.length < 2 || linked) return [];
    return INGREDIENTS.filter((i) => normalize(i.name).includes(n) || n.includes(normalize(i.name))).slice(0, 4);
  }, [name, linked]);

  const save = () => {
    const finalName = (linked?.name ?? name).trim();
    if (!finalName) return;
    const parsed = Number(price.replace(",", "."));
    const p: MyProduct = {
      id: initial?.id ?? uid("mp"),
      name: finalName,
      supermarketId,
      ingredientId,
      price: linked || !price.trim() || !Number.isFinite(parsed) ? null : Math.round(parsed * 100) / 100,
      quantity: linked ? 1 : quantity,
      aisle: linked?.aisle ?? aisle,
      inList: linked ? false : inList,
      note: note.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    saveMyProduct(p);
    toast(linked ? `${p.name}: lo compraremos siempre en ${getSupermarket(supermarketId).name}` : `${p.name} guardado`);
    onDone();
  };

  return (
    <div className="space-y-5 pb-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">¿Qué producto?</span>
        {linked ? (
          <span className="flex items-center gap-3 rounded-2xl border-2 border-cobalt bg-cobalt-50 p-3">
            <span className="text-2xl">{linked.icon}</span>
            <span className="flex-1">
              <span className="block font-semibold">{linked.name}</span>
              <span className="flex items-center gap-1 text-xs text-cobalt">
                <Link2 className="size-3" /> Ingrediente de tus recetas
              </span>
            </span>
            <button
              aria-label="Usar como producto propio"
              onClick={() => {
                setName(linked.name);
                setIngredientId(null);
              }}
              className="grid size-8 place-items-center rounded-full bg-white"
            >
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <span className="relative block">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              autoFocus={!initial?.id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej.: guacamole, yogur griego, pan de centeno…"
              className="h-12 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-base outline-none focus:border-cobalt"
              aria-label="Nombre del producto"
            />
          </span>
        )}
      </label>

      {suggestions.length > 0 && (
        <div className="-mt-3 space-y-1.5">
          <p className="text-xs text-muted">¿Es un ingrediente de tus recetas? Así lo compraremos siempre en ese súper:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((i) => (
              <button key={i.id} onClick={() => setIngredientId(i.id)} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-line hover:ring-cobalt">
                {i.icon} {i.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-bold">¿De qué supermercado?</p>
        <div className="flex flex-wrap gap-2">
          {markets.map((m) => (
            <button
              key={m.id}
              aria-pressed={supermarketId === m.id}
              onClick={() => setSupermarketId(m.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                supermarketId === m.id ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line",
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: m.color }} />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {linked ? (
        <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-ink-2">
          Cuando tu menú necesite <strong>{linked.name.toLowerCase()}</strong>, lo pondremos en la lista de <strong>{getSupermarket(supermarketId).name}</strong>, aunque en otro súper salga más barato.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Precio (opcional)</span>
              <span className="relative block">
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="2,35"
                  className="h-12 w-full rounded-2xl border border-line bg-white px-4 pr-12 text-base outline-none focus:border-cobalt"
                  aria-label="Precio"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{currency === "EUR" ? "€" : currency}</span>
              </span>
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-bold">Unidades</span>
              <div className="flex h-12 items-center justify-between rounded-2xl border border-line bg-white px-1.5">
                <button aria-label="Menos unidades" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid size-9 place-items-center rounded-full bg-mist">
                  <Minus className="size-4" />
                </button>
                <span className="font-display text-lg font-bold tabular">{quantity}</span>
                <button aria-label="Más unidades" onClick={() => setQuantity(Math.min(20, quantity + 1))} className="grid size-9 place-items-center rounded-full bg-cobalt text-white">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold">Pasillo</p>
            <div className="flex flex-wrap gap-1.5">
              {AISLES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAisle(a.id)}
                  aria-pressed={aisle === a.id}
                  className={cn("rounded-full px-2.5 py-1 text-xs font-semibold transition", aisle === a.id ? "bg-cobalt text-white" : "bg-white text-ink-2 ring-1 ring-line")}
                >
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft">
            <span className="flex-1">
              <span className="block font-semibold">Añadir a mi lista cada semana</span>
              <span className="block text-xs text-muted">Aparecerá en la lista de {getSupermarket(supermarketId).name} y sumará al total.</span>
            </span>
            <Toggle checked={inList} onChange={setInList} label="Añadir a mi lista cada semana" />
          </div>
        </>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Nota (opcional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 80))}
          placeholder="Ej.: el de la nevera, junto a los quesos"
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-cobalt"
          aria-label="Nota"
        />
      </label>

      <Button block size="lg" onClick={save} disabled={!linked && !name.trim()}>
        Guardar
      </Button>
    </div>
  );
}
