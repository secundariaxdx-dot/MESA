"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DISMISS_KEY = "mesa-install-dismissed";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Registra el service worker y ofrece instalar MESA como app en el móvil. */
export function AppInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
    }
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* sin almacenamiento */
    }
    if (dismissed || isStandalone()) return;
    const ua = navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => {
      if (iosDevice) {
        setIos(true);
        setHidden(false);
      }
    }, 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <AnimatePresence>
      {!hidden && (prompt || ios) && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          className="fixed inset-x-3 top-[max(env(safe-area-inset-top),12px)] z-[95] mx-auto max-w-md rounded-3xl bg-ink p-4 text-white shadow-lift"
          role="dialog"
          aria-label="Instalar MESA"
        >
          <button aria-label="Cerrar" onClick={dismiss} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/icons/icon-192.png`} alt="" className="size-12 rounded-2xl" />
            <div>
              <p className="font-display text-lg font-bold leading-tight">Instala MESA en tu móvil</p>
              <p className="text-sm text-cobalt-100">Ábrela como una app, a pantalla completa y sin conexión.</p>
            </div>
          </div>
          {prompt ? (
            <button
              onClick={async () => {
                await prompt.prompt();
                dismiss();
              }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cobalt font-semibold"
            >
              <Download className="size-5" /> Instalar app
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-relaxed">
              En Safari pulsa <Share className="inline size-4 -translate-y-0.5" /> <strong>Compartir</strong> y luego <strong>«Añadir a pantalla de inicio»</strong>.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
