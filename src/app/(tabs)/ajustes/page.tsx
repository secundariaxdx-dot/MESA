"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Bell, ChevronRight, Download, History, Lock, Package, Receipt, RotateCcw, Store, Upload, User, Globe, Tag } from "lucide-react";
import { exportState, useMesa } from "@/store/mesa";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, Toggle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { getCountry, getSupermarket } from "@/data/geo";
import { getCatalogSync, providerFor } from "@/services/prices/provider";
import { usePricesVersion } from "@/hooks/useMesaData";
import { longDate } from "@/engine/dates";
import { toast } from "@/components/ui/Toast";
import { RECIPES } from "@/data/recipes";

export default function Ajustes() {
  const router = useRouter();
  const profile = useMesa((s) => s.profile);
  const updateProfile = useMesa((s) => s.updateProfile);
  const settings = useMesa((s) => s.settings);
  const updateSettings = useMesa((s) => s.updateSettings);
  const history = useMesa((s) => s.history);
  const purchases = useMesa((s) => s.purchases);
  const pantry = useMesa((s) => s.pantry);
  const cooked = useMesa((s) => s.cooked);
  const myProducts = useMesa((s) => s.myProducts);
  const resetAll = useMesa((s) => s.resetAll);
  const importData = useMesa((s) => s.importData);
  const [confirmReset, setConfirmReset] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const country = getCountry(profile.countryId);
  const market = getSupermarket(profile.supermarketId);
  usePricesVersion();
  const provider = providerFor(profile.supermarketId);

  const setNotif = async (k: keyof typeof settings.notifications, v: boolean) => {
    if (v && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignorado */
      }
    }
    updateSettings({ notifications: { ...settings.notifications, [k]: v } });
  };

  const download = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mesa-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Datos exportados");
  };

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-5 px-4 sm:px-6 lg:grid-cols-2">
        <Group title="Perfil">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Icon>
              <User className="size-5" />
            </Icon>
            <label className="flex-1">
              <span className="block text-xs font-semibold text-muted">Tu nombre (opcional)</span>
              <input
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value.slice(0, 30) })}
                placeholder="¿Cómo te llamamos?"
                className="w-full bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-faint"
              />
            </label>
          </div>
        </Group>

        <Group title="Configuración general">
          <Row icon={<Globe className="size-5" />} title="País" value={`${country.flag} ${country.name}`} href="/preferencias" />
          <Row icon={<Tag className="size-5" />} title="Moneda" value={country.currency} />
          <Row icon={<Store className="size-5" />} title="Supermercado principal" value={market.name} href="/preferencias" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Icon>⚖️</Icon>
            <span className="flex-1 font-semibold">Medidas caseras por defecto</span>
            <Toggle checked={settings.householdMeasures} onChange={(v) => updateSettings({ householdMeasures: v })} label="Medidas caseras" />
          </div>
          <div className="px-4 py-3.5 text-xs leading-relaxed text-muted">
            Precios: {provider.label}
            {provider.isDemo ? " (estimados, aún no hay precios descargados de este súper)" : ` · actualizados el ${longDate(getCatalogSync(profile.supermarketId).referenceDate)}`}. Catálogo de {RECIPES.length} recetas. MESA no está afiliada a ningún supermercado.
          </div>
        </Group>

        <Group title="Tus datos">
          <Row icon={<History className="size-5" />} title="Historial de semanas" value={`${history.length} anteriores`} href="/historial" />
          <Row icon={<Receipt className="size-5" />} title="Historial de compras" value={`${purchases.length} compras`} href="/historial#compras" />
          <Row icon={<Star className="size-5" />} title="Mis productos" value={`${myProducts.length} guardados`} href="/productos" />
          <Row icon={<Package className="size-5" />} title="Inventario de despensa" value={`${pantry.filter((p) => p.status === "ok").length} productos`} href="/despensa" />
          <Row icon={<span>👩‍🍳</span>} title="Recetas cocinadas" value={`${cooked.length}`} href="/historial#cocinadas" />
        </Group>

        <Group title="Notificaciones">
          {(
            [
              ["timers", "Avisos de temporizador en modo cocina"],
              ["expiring", "Productos que conviene usar pronto"],
              ["weekly", "Recordatorio para planificar la semana"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3.5">
              <Icon>
                <Bell className="size-5" />
              </Icon>
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <Toggle checked={settings.notifications[k]} onChange={(v) => setNotif(k, v)} label={label} />
            </div>
          ))}
          <p className="px-4 py-3 text-xs text-muted">Los avisos se muestran en este dispositivo mientras MESA está abierta. No enviamos correos ni notificaciones push desde servidores.</p>
        </Group>

        <Group title="Privacidad y datos">
          <Row icon={<Lock className="size-5" />} title="Privacidad" value="Cómo tratamos tus datos" onClick={() => setPrivacy(true)} />
          <Row icon={<Download className="size-5" />} title="Exportar mis datos" value="Archivo JSON" onClick={download} />
          <Row icon={<Upload className="size-5" />} title="Importar datos" value="Desde un archivo exportado" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const ok = importData(await f.text());
              toast(ok ? "Datos importados" : "El archivo no es una exportación válida de MESA", ok ? "success" : "error");
              e.target.value = "";
            }}
          />
          <Row icon={<RotateCcw className="size-5 text-tomato" />} title="Reiniciar la aplicación" value="Borra todo y vuelve al inicio" onClick={() => setConfirmReset(true)} danger />
        </Group>
      </div>

      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Reiniciar MESA?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                router.replace("/bienvenida");
              }}
            >
              Borrar todo
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Se eliminarán tu perfil, semanas, despensa, compras y favoritos de este dispositivo. Si quieres conservarlos, exporta tus datos antes.</p>
      </Sheet>

      <Sheet open={privacy} onClose={() => setPrivacy(false)} title="Privacidad">
        <div className="space-y-3 text-sm leading-relaxed text-ink-2">
          <p>MESA guarda tus datos únicamente en este dispositivo (almacenamiento local del navegador). No hay cuentas ni enviamos tu perfil a ningún servidor.</p>
          <p>Solo pedimos lo necesario para planificar: número de personas, días, preferencias, dieta, alergias y aparatos. Las alergias se usan exclusivamente para filtrar recetas.</p>
          <p>Si se activa la integración opcional de IA, se envían únicamente los nombres de los productos de tu despensa, sin datos personales.</p>
          <p>Puedes exportar o borrar todos tus datos en cualquier momento desde Ajustes. Última revisión: {longDate("2026-11-01")}.</p>
        </div>
      </Sheet>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <Card className="divide-y divide-line">{children}</Card>
    </section>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-lg text-ink-2">{children}</span>;
}

function Row({ icon, title, value, href, onClick, danger }: { icon: React.ReactNode; title: string; value?: string; href?: string; onClick?(): void; danger?: boolean }) {
  const inner = (
    <>
      <Icon>{icon}</Icon>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-tomato" : ""}`}>{title}</span>
        {value && <span className="block truncate text-sm text-muted">{value}</span>}
      </span>
      {(href || onClick) && <ChevronRight className="size-5 text-faint" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-mist/60";
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}
