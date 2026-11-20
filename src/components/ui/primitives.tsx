"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "white" | "success";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; block?: boolean }
>(function Button({ variant = "primary", size = "md", block, className, ...props }, ref) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-cobalt text-white hover:bg-cobalt-600 shadow-[0_8px_20px_-8px_rgb(36_72_245/0.6)] disabled:bg-faint disabled:shadow-none",
    secondary: "bg-cobalt-50 text-cobalt hover:bg-cobalt-100",
    ghost: "bg-transparent text-ink-2 hover:bg-mist",
    danger: "bg-tomato-50 text-tomato hover:bg-tomato hover:text-white",
    white: "bg-white text-cobalt hover:bg-cobalt-50",
    success: "bg-leaf text-white hover:brightness-110",
  };
  const s = { sm: "h-9 px-3.5 text-sm rounded-xl", md: "h-12 px-5 text-[15px] rounded-2xl", lg: "h-14 px-6 text-base rounded-2xl" }[size];
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        v[variant],
        s,
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
});

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display text-xl font-extrabold tracking-tight", light ? "text-white" : "text-ink", className)}>
      <span className={cn("grid size-7 place-items-center rounded-lg text-sm", light ? "bg-white text-cobalt" : "bg-cobalt text-white")}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
          <path d="M4 9h16M6 9v9M18 9v9M9 5h6" />
        </svg>
      </span>
      MESA
    </span>
  );
}

export function ProgressBar({ value, className, tone = "cobalt", track = "bg-mist" }: { value: number; className?: string; tone?: "cobalt" | "leaf" | "white" | "sun" | "tomato"; track?: string }) {
  const color = { cobalt: "bg-cobalt", leaf: "bg-leaf", white: "bg-white", sun: "bg-sun", tomato: "bg-tomato" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", track, className)}>
      <motion.div className={cn("h-full rounded-full", color)} initial={false} animate={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
    </div>
  );
}

export function Counter({ value, onChange, min = 0, max = 12, label }: { value: number; onChange(v: number): void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-medium text-ink-2">{label}</span>
      <div className="flex items-center gap-3">
        <button aria-label={`Quitar ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-11 place-items-center rounded-full bg-mist text-ink transition active:scale-95 disabled:opacity-40">
          <Minus className="size-5" />
        </button>
        <motion.span key={value} initial={{ scale: 0.8, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="w-8 text-center font-display text-2xl font-bold tabular">
          {value}
        </motion.span>
        <button aria-label={`Añadir ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-11 place-items-center rounded-full bg-cobalt text-white transition active:scale-95 disabled:opacity-40">
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-cobalt" : "bg-line")}>
      <motion.span layout className={cn("absolute top-1 size-5 rounded-full bg-white shadow", checked ? "right-1" : "left-1")} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
    </button>
  );
}

export function SelectCard({
  selected,
  onClick,
  children,
  className,
  disabled,
  tone = "cobalt",
}: {
  selected: boolean;
  onClick(): void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  tone?: "cobalt" | "tomato";
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border-2 bg-white text-left transition-colors disabled:opacity-40",
        selected ? (tone === "tomato" ? "border-tomato bg-tomato-50" : "border-cobalt bg-cobalt-50") : "border-line hover:border-cobalt-100",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?(): void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition",
        active ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-cobalt-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BackButton({ href, onClick, light }: { href?: string; onClick?(): void; light?: boolean }) {
  const router = useRouter();
  return (
    <button
      aria-label="Volver"
      onClick={() => (onClick ? onClick() : href ? router.push(href) : router.back())}
      className={cn("grid size-10 place-items-center rounded-full transition active:scale-95", light ? "bg-white/90 text-ink shadow-soft backdrop-blur" : "bg-mist text-ink hover:bg-line")}
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-white px-6 py-10 text-center shadow-soft">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-cobalt-50 text-3xl">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="text-lg font-bold text-ink">{children}</h2>
      {right}
    </div>
  );
}

export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-white shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-ink-2", className)}>{children}</span>;
}
