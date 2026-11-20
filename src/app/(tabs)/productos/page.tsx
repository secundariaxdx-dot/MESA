"use client";

import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import type { MyProduct } from "@/domain/types";
import { useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { BackButton, Button, Card, EmptyState, Toggle } from "@/components/ui/primitives";
import { MyProductSheet } from "@/components/shopping/MyProductSheet";
import { getCountry, getSupermarket, supermarketsOf } from "@/data/geo";
import { findIngredient } from "@/data/ingredients";
import { formatMoney } from "@/engine/units";
import { toast } from "@/components/ui/Toast";

export default function Productos() {
  const myProducts = useMesa((s) => s.myProducts);
  const profile = useMesa((s) => s.profile);
  const saveMyProduct = useMesa((s) => s.saveMyProduct);
  const removeMyProduct = useMesa((s) => s.removeMyProduct);
  const [editing, setEditing] = useState<Partial<MyProduct> | null>(null);
  const currency = getCountry(profile.countryId).currency;
  const markets = supermarketsOf(profile.countryId);
  const otherCountry = myProducts.filter((p) => !markets.some((m) => m.id === p.supermarketId));
  const groups = markets.map((m) => ({ m, items: myProducts.filter((p) => p.supermarketId === m.id) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        title="Mis productos"
        subtitle="Lo que te gusta de un súper concreto. Lo tendremos en cuenta en tu lista."
        left={<BackButton href="/lista" />}
        right={
          <Button size="sm" onClick={() => setEditing({})} data-testid="nuevo-producto">
            <Plus className="size-4" /> Añadir
          </Button>
        }
      />
      <div className="space-y-6 px-4 sm:px-6">
        {!myProducts.length ? (
          <EmptyState
            icon="⭐"
            title="Guarda tus productos favoritos"
            text="Por ejemplo, el guacamole de Mercadona o el pan de tu súper de siempre. Puedes añadirlos a la lista cada semana o fijar dónde compras un ingrediente."
            action={<Button onClick={() => setEditing({})}>Guardar un producto</Button>}
          />
        ) : (
          groups.map(({ m, items }) => (
            <section key={m.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em]">
                <span className="grid size-6 place-items-center rounded-md text-xs font-extrabold text-white" style={{ background: m.color }}>
                  {m.name[0]}
                </span>
                {m.name}
                <span className="text-xs font-semibold text-faint">{items.length}</span>
              </h2>
              <Card className="divide-y divide-line">
                {items.map((p) => {
                  const ing = findIngredient(p.ingredientId);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-2xl">{ing?.icon ?? "⭐"}</span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(p)}>
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted">
                          {ing ? (
                            <span className="inline-flex items-center gap-1 text-cobalt">
                              <Link2 className="size-3" /> Siempre en {m.name} cuando tu menú lo necesite
                            </span>
                          ) : (
                            <>
                              {p.quantity} ud{p.price != null ? ` · ${formatMoney(p.price * p.quantity, currency)}` : " · sin precio"}
                            </>
                          )}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </button>
                      {!ing && (
                        <Toggle
                          checked={p.inList}
                          onChange={(v) => {
                            saveMyProduct({ ...p, inList: v });
                            toast(v ? `${p.name} añadido a tu lista` : `${p.name} quitado de la lista`, "info");
                          }}
                          label={`${p.name} en la lista`}
                        />
                      )}
                      <button
                        aria-label={`Eliminar ${p.name}`}
                        onClick={() => {
                          removeMyProduct(p.id);
                          toast(`${p.name} eliminado`, "info", { label: "Deshacer", onClick: () => saveMyProduct(p) });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-faint hover:bg-tomato-50 hover:text-tomato"
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
        {otherCountry.length > 0 && (
          <p className="rounded-xl bg-mist px-3 py-2 text-xs text-muted">
            Tienes {otherCountry.length} productos de supermercados de otro país ({[...new Set(otherCountry.map((p) => getSupermarket(p.supermarketId).name))].join(", ")}). No se usan mientras compres en {getCountry(profile.countryId).name}.
          </p>
        )}
        <p className="px-1 text-xs leading-relaxed text-faint">
          Los productos propios con el interruptor activado aparecen cada semana en la lista de su supermercado. Los ingredientes de recetas que guardes aquí se compran siempre en el súper elegido, aunque en otro salgan más baratos.
        </p>
      </div>
      <MyProductSheet open={editing !== null} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </>
  );
}
