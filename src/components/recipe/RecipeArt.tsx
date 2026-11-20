"use client";

import { useState } from "react";
import type { Recipe } from "@/domain/types";
import { cn } from "@/components/ui/primitives";

/**
 * Imagen del plato. Si la receta tiene `image` (fotografía en /public) se usa;
 * si no carga o no existe, se muestra una ilustración de emplatado generada
 * con los ingredientes principales y la paleta de la receta.
 */
export function RecipeArt({ recipe, className, variant = "card" }: { recipe: Recipe; className?: string; variant?: "card" | "hero" | "thumb" }) {
  const [failed, setFailed] = useState(false);
  const [from, to] = recipe.palette;
  if (recipe.image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={recipe.image} alt={recipe.name} onError={() => setFailed(true)} className={cn("object-cover", className)} />
    );
  }
  const [main, ...rest] = recipe.art;
  const around = rest.slice(0, 4);
  const big = variant === "hero";
  return (
    <div
      role="img"
      aria-label={`Ilustración de ${recipe.name}`}
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        background: `radial-gradient(circle at 20% 15%, rgba(255,255,255,.55), transparent 45%), linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: "radial-gradient(rgba(11,22,64,.5) 1px, transparent 1.5px)", backgroundSize: big ? "22px 22px" : "14px 14px" }}
      />
      <div className={cn("absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full", big ? "w-[min(62%,340px)]" : "w-[74%]")}
        style={{ background: "radial-gradient(circle at 50% 45%, #fff 0 56%, #f3f1ec 57% 64%, #fff 65% 100%)", boxShadow: "0 18px 40px -14px rgba(11,22,64,.45), inset 0 -6px 14px rgba(11,22,64,.06)" }}
      >
        <span className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm", big ? "text-[min(7rem,18vw)]" : variant === "thumb" ? "text-2xl" : "text-[2.6rem]")}>{main}</span>
        {around.map((e, i) => {
          const angle = (-110 + i * (around.length > 1 ? 220 / (around.length - 1) : 0)) * (Math.PI / 180);
          const r = 32;
          return (
            <span
              key={i}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2", big ? "text-[min(3.2rem,9vw)]" : variant === "thumb" ? "text-xs" : "text-xl")}
              style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle) + 4}%`, transform: `translate(-50%,-50%) rotate(${i * 23 - 20}deg)` }}
            >
              {e}
            </span>
          );
        })}
      </div>
    </div>
  );
}
