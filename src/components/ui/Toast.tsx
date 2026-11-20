"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

type Kind = "success" | "info" | "error";
interface ToastItem {
  id: number;
  text: string;
  kind: Kind;
  action?: { label: string; onClick: () => void };
}

const useToasts = create<{ items: ToastItem[]; push(t: Omit<ToastItem, "id">): void; remove(id: number): void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3600);
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toast(text: string, kind: Kind = "success", action?: ToastItem["action"]) {
  useToasts.getState().push({ text, kind, action });
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  const remove = useToasts((s) => s.remove);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-8 lg:top-auto" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lift"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-leaf-50" />
            ) : t.kind === "error" ? (
              <AlertTriangle className="size-5 shrink-0 text-sun" />
            ) : (
              <Info className="size-5 shrink-0 text-cobalt-100" />
            )}
            <span className="flex-1">{t.text}</span>
            {t.action && (
              <button
                className="font-semibold text-sun"
                onClick={() => {
                  t.action!.onClick();
                  remove(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
