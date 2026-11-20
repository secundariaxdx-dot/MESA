"use client";

import { motion } from "framer-motion";
import type { ApplianceId } from "@/domain/types";
import { APPLIANCES } from "@/data/taxonomy";
import { cn } from "@/components/ui/primitives";

/** Ilustración interactiva de una cocina: cada aparato se toca para activarlo. */
export function KitchenIllustration({ value, onToggle }: { value: ApplianceId[]; onToggle(id: ApplianceId): void }) {
  const on = (id: ApplianceId) => id === "fuegos" || value.includes(id);
  const fill = (id: ApplianceId) => (on(id) ? "#2448f5" : "#c9d0de");
  const soft = (id: ApplianceId) => (on(id) ? "#dde4ff" : "#eef1f6");

  return (
    <svg viewBox="0 0 360 260" className="w-full select-none" aria-label="Tu cocina">
      {/* Pared y azulejos */}
      <rect x="0" y="0" width="360" height="160" rx="18" fill="#f6f4ee" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={i * 45 + 22} y1="0" x2={i * 45 + 22} y2="150" stroke="#ebe7dd" strokeWidth="1" />
      ))}
      {/* Estante */}
      <rect x="140" y="98" width="100" height="6" rx="3" fill="#d9cdb8" />
      {/* Encimera y muebles */}
      <rect x="0" y="150" width="360" height="14" rx="4" fill="#d9cdb8" />
      <rect x="0" y="164" width="360" height="96" rx="0" fill="#ffffff" />
      {[0, 120, 240].map((x) => (
        <rect key={x} x={x + 6} y="170" width="108" height="84" rx="10" fill="#f6f4ee" stroke="#e5e0d4" />
      ))}
      <rect x="160" y="208" width="40" height="5" rx="2.5" fill="#d9cdb8" />
      <rect x="280" y="208" width="40" height="5" rx="2.5" fill="#d9cdb8" />

      {/* Fuegos (siempre disponibles) */}
      <KitchenItem id="fuegos" active={on("fuegos")} onToggle={onToggle}>
        <rect x="14" y="143" width="104" height="9" rx="4" fill={fill("fuegos")} />
        <ellipse cx="40" cy="143" rx="14" ry="3" fill="#ffc93c" />
        <ellipse cx="92" cy="143" rx="14" ry="3" fill="#ffc93c" />
      </KitchenItem>

      {/* Horno */}
      <KitchenItem id="horno" active={on("horno")} onToggle={onToggle}>
        <rect x="14" y="174" width="96" height="76" rx="10" fill={soft("horno")} stroke={fill("horno")} strokeWidth="3" />
        <rect x="26" y="196" width="72" height="44" rx="6" fill={on("horno") ? "#ffe8a6" : "#e2e6ee"} stroke={fill("horno")} strokeWidth="2" />
        <rect x="34" y="181" width="56" height="5" rx="2.5" fill={fill("horno")} />
      </KitchenItem>

      {/* Olla a presión */}
      <KitchenItem id="olla-presion" active={on("olla-presion")} onToggle={onToggle}>
        <rect x="56" y="112" width="52" height="30" rx="8" fill={fill("olla-presion")} />
        <rect x="52" y="106" width="60" height="9" rx="4" fill={soft("olla-presion")} stroke={fill("olla-presion")} strokeWidth="2" />
        <rect x="78" y="96" width="8" height="10" rx="3" fill={fill("olla-presion")} />
        <rect x="108" y="116" width="16" height="5" rx="2.5" fill={fill("olla-presion")} />
      </KitchenItem>

      {/* Microondas */}
      <KitchenItem id="microondas" active={on("microondas")} onToggle={onToggle}>
        <rect x="146" y="44" width="88" height="52" rx="9" fill={soft("microondas")} stroke={fill("microondas")} strokeWidth="3" />
        <rect x="155" y="53" width="54" height="34" rx="5" fill={on("microondas") ? "#ffe8a6" : "#e2e6ee"} />
        <circle cx="222" cy="60" r="4" fill={fill("microondas")} />
        <rect x="217" y="72" width="10" height="4" rx="2" fill={fill("microondas")} />
      </KitchenItem>

      {/* Batidora */}
      <KitchenItem id="batidora" active={on("batidora")} onToggle={onToggle}>
        <rect x="146" y="124" width="26" height="26" rx="5" fill={soft("batidora")} stroke={fill("batidora")} strokeWidth="2.5" />
        <rect x="154" y="86" width="10" height="44" rx="5" fill={fill("batidora")} />
      </KitchenItem>

      {/* Robot de cocina */}
      <KitchenItem id="robot" active={on("robot")} onToggle={onToggle}>
        <path d="M186 114 h40 l-5 20 h-30 z" fill={soft("robot")} stroke={fill("robot")} strokeWidth="2.5" />
        <rect x="182" y="132" width="48" height="18" rx="6" fill={fill("robot")} />
        <rect x="194" y="108" width="24" height="7" rx="3" fill={fill("robot")} />
      </KitchenItem>

      {/* Freidora de aire */}
      <KitchenItem id="freidora" active={on("freidora")} onToggle={onToggle}>
        <rect x="246" y="96" width="50" height="54" rx="16" fill={fill("freidora")} />
        <rect x="254" y="120" width="34" height="22" rx="7" fill={soft("freidora")} />
        <circle cx="271" cy="107" r="4" fill={soft("freidora")} />
      </KitchenItem>

      {/* Tostadora */}
      <KitchenItem id="tostadora" active={on("tostadora")} onToggle={onToggle}>
        <rect x="304" y="118" width="46" height="32" rx="10" fill={soft("tostadora")} stroke={fill("tostadora")} strokeWidth="2.5" />
        <rect x="314" y="110" width="9" height="12" rx="2" fill="#e8c48a" />
        <rect x="330" y="110" width="9" height="12" rx="2" fill="#e8c48a" />
      </KitchenItem>
    </svg>
  );
}

export function ApplianceChips({ value, onToggle }: { value: ApplianceId[]; onToggle(id: ApplianceId): void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {APPLIANCES.map((a) => {
        const active = a.id === "fuegos" || value.includes(a.id);
        return (
          <button
            key={a.id}
            disabled={a.id === "fuegos"}
            onClick={() => onToggle(a.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-cobalt text-white" : "bg-white text-ink-2 ring-1 ring-line",
              a.id === "fuegos" && "opacity-90",
            )}
          >
            {a.name}
            {a.id === "fuegos" && " · siempre"}
          </button>
        );
      })}
    </div>
  );
}

function KitchenItem({ id, active, onToggle, children }: { id: ApplianceId; active: boolean; onToggle(id: ApplianceId): void; children: React.ReactNode }) {
  const fixed = id === "fuegos";
  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={APPLIANCES.find((a) => a.id === id)?.name}
      onClick={() => !fixed && onToggle(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !fixed && onToggle(id)}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2 }}
      style={{ cursor: fixed ? "default" : "pointer", transformBox: "fill-box", transformOrigin: "center" }}
    >
      {children}
    </motion.g>
  );
}
