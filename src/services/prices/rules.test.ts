import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { INGREDIENTS } from "@/data/ingredients";
import { getCatalogSync, registerRemoteCatalog, type RemoteCatalogFile } from "./provider";

const rules = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../../../scripts/prices/mercadona-rules.json"), "utf8"));

describe("precios reales", () => {
  it("cada ingrediente tiene regla de búsqueda en la web del súper, con su unidad", () => {
    for (const ing of INGREDIENTS) {
      expect(rules[ing.id], `falta regla para ${ing.id}`).toBeTruthy();
      expect(rules[ing.id].unit, `unidad de ${ing.id}`).toBe(ing.unit);
      if (rules[ing.id].re) expect(() => new RegExp(rules[ing.id].re)).not.toThrow();
    }
  });

  it("un catálogo real sustituye al estimado y completa lo que falte", () => {
    const file: RemoteCatalogFile = {
      supermarketId: "mercadona",
      currency: "EUR",
      referenceDate: "2026-11-20",
      fetchedAt: "2026-11-20T21:13:38Z",
      source: "Web de Mercadona",
      coverage: { matched: 1, total: 2, missing: [] },
      products: [{ id: "mercadona:1", ingredientId: "huevo", name: "Huevos grandes L", packLabel: "paquete", packSize: 6, unit: "ud", price: 1.8 }],
    };
    registerRemoteCatalog(file);
    const c = getCatalogSync("mercadona");
    expect(c.isDemo).toBe(false);
    const eggs = c.products.filter((p) => p.ingredientId === "huevo");
    expect(eggs).toHaveLength(1);
    expect(eggs[0]).toMatchObject({ price: 1.8, packSize: 6 });
    expect(eggs[0].estimated).toBeFalsy();
    const tomato = c.products.find((p) => p.ingredientId === "tomate")!;
    expect(tomato.estimated).toBe(true);
  });
});
