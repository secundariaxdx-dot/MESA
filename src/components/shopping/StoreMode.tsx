"use client";

import { useState } from "react";
import { Store, TrendingDown } from "lucide-react";
import type { CurrencyCode, Profile, ShoppingList } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { getSupermarket, supermarketsOf } from "@/data/geo";
import { formatMoney } from "@/engine/units";
import { Button, Card, ProgressBar, cn } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { SupermarketField } from "@/components/profile/fields";
import { toast } from "@/components/ui/Toast";
import { storeNames } from "@/hooks/useMesaData";

/** Elegir entre comprar todo en el súper principal o repartir entre varios. */
export function StoreModeCard({ list }: { list: ShoppingList }) {
  const profile = useMesa((s) => s.profile);
  const updateProfile = useMesa((s) => s.updateProfile);
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<Profile>(profile);
  const main = getSupermarket(list.supermarketId);
  const extras = profile.extraSupermarkets.filter((id) => id !== main.id && supermarketsOf(main.countryId).some((m) => m.id === id));
  const saving = list.singleStoreTotal - list.checkoutTotal;

  const open = () => {
    setLocal(profile);
    setEditing(true);
  };

  return (
    <>
      <Card className="mb-6 p-4">
        {extras.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-leaf-50 text-leaf">
              <Store className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-bold">¿Compras en más de un súper?</p>
              <p className="text-xs text-muted">Añádelos y repartiremos la lista donde cada producto salga más barato.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={open}>
              Añadir
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">¿Dónde compras esta semana?</p>
              <button onClick={open} className="text-xs font-bold text-cobalt">
                Editar súper
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-mist p-1" role="radiogroup" aria-label="Modo de compra">
              <button
                role="radio"
                aria-checked={!profile.multiStore}
                onClick={() => updateProfile({ multiStore: false })}
                className={cn("rounded-xl px-2 py-2.5 text-sm font-semibold transition", !profile.multiStore ? "bg-white text-ink shadow-soft" : "text-muted")}
              >
                Todo en {main.name}
              </button>
              <button
                role="radio"
                aria-checked={profile.multiStore}
                onClick={() => updateProfile({ multiStore: true })}
                className={cn("rounded-xl px-2 py-2.5 text-sm font-semibold transition", profile.multiStore ? "bg-white text-ink shadow-soft" : "text-muted")}
                data-testid="modo-repartir"
              >
                Repartir entre {extras.length + 1}
              </button>
            </div>
            {profile.multiStore && (
              <div className="mt-3 space-y-1.5 text-xs">
                {saving > 0.004 ? (
                  <p className="flex items-center gap-2 rounded-xl bg-leaf-50 px-3 py-2 font-semibold text-leaf" data-testid="ahorro-reparto">
                    <TrendingDown className="size-4 shrink-0" />
                    Ahorras {formatMoney(saving, list.currency)} frente a comprarlo todo en {main.name} ({formatMoney(list.singleStoreTotal, list.currency)}).
                  </p>
                ) : (
                  <p className="rounded-xl bg-mist px-3 py-2 text-muted">Esta semana {main.name} ya es lo más barato: no hace falta ir a otro súper.</p>
                )}
                {list.skippedStores.map((st) => (
                  <p key={st.supermarketId} className="px-1 text-muted">
                    {getSupermarket(st.supermarketId).name} no compensa esta semana: solo ahorrarías {formatMoney(st.saving, list.currency)}.
                  </p>
                ))}
              </div>
            )}
            {!profile.multiStore && <p className="mt-2 px-1 text-xs text-muted">También vas a {storeNames(extras)}. Activa «Repartir» para ver cuánto ahorrarías.</p>}
          </>
        )}
      </Card>

      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Tus supermercados"
        footer={
          <Button
            block
            onClick={() => {
              updateProfile({ extraSupermarkets: local.extraSupermarkets, multiStore: local.multiStore });
              setEditing(false);
              toast(local.multiStore ? "Lista repartida entre tus supermercados" : "Supermercados guardados");
            }}
          >
            Guardar
          </Button>
        }
      >
        {/* El principal y el país se cambian en Preferencias: aquí solo los adicionales. */}
        <SupermarketField value={{ ...local, supermarketId: main.id, countryId: main.countryId }} onChange={(p) => setLocal((l) => ({ ...l, ...p, supermarketId: profile.supermarketId, countryId: profile.countryId }))} />
      </Sheet>
    </>
  );
}

export function StoreHeader({ supermarketId, total, itemCount, inCart, currency }: { supermarketId: string; total: number; itemCount: number; inCart: number; currency: CurrencyCode }) {
  const m = getSupermarket(supermarketId);
  return (
    <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-paper/95 px-1 py-2 backdrop-blur" data-testid={`store-${supermarketId}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold text-white" style={{ background: m.color }}>
          {m.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold leading-tight">{m.name}</p>
          <p className="text-xs text-muted tabular">
            {inCart} de {itemCount} en el carro
          </p>
        </div>
        <span className="font-display text-xl font-bold tabular">{formatMoney(total, currency)}</span>
      </div>
      <ProgressBar value={itemCount ? inCart / itemCount : 0} tone="leaf" className="mt-2 h-1.5" />
    </div>
  );
}
