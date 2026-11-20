// Actualiza los precios reales de MESA desde la web de los supermercados.
//
// Se ejecuta en GitHub Actions (.github/workflows/precios.yml) una vez al día.
// Escribe el catálogo en public/prices/ (para futuras compilaciones) y en
// docs/prices/ (la app publicada lo lee directamente, sin recompilar).
//
// Uso local: node scripts/prices/fetch.mjs [--dry] [--only=mercadona]
//
// Buenas prácticas: una sola pasada diaria, peticiones espaciadas, reintentos
// con espera y User-Agent identificable. Si algo falla, se conservan los
// precios anteriores (no se sobrescribe con un catálogo vacío).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];
const OUT_DIRS = ["public/prices", "docs/prices"].map((d) => path.join(root, d));
const UA = "MESA-precios/1.0 (planificador de comidas; actualización diaria)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function getJSON(url, { tries = 4, delay = 350 } = {}) {
  for (let i = 1; i <= tries; i++) {
    await sleep(delay);
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      return await res.json();
    } catch (e) {
      if (e.fatal || i === tries) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
}

/** Convierte el formato del súper a la unidad base de MESA (g, ml, ud). */
function toBase(size, format, unit, gpu) {
  const f = norm(format);
  let qty = null;
  let kind = null;
  if (f === "kg") [qty, kind] = [size * 1000, "g"];
  else if (f === "g" || f === "gr") [qty, kind] = [size, "g"];
  else if (f === "l") [qty, kind] = [size * 1000, "ml"];
  else if (f === "ml" || f === "cl") [qty, kind] = [f === "cl" ? size * 10 : size, "ml"];
  else if (f === "ud" || f === "uds" || f === "unidad" || f === "unidades") [qty, kind] = [size, "ud"];
  if (qty == null || !(qty > 0)) return null;
  if (kind === unit) return qty;
  // Líquidos y sólidos con densidad ~1 (leche, caldo, salsas): aceptable para envases.
  if ((kind === "ml" && unit === "g") || (kind === "g" && unit === "ml")) return qty;
  if (gpu && kind === "ud" && unit === "g") return qty * gpu;
  if (gpu && kind === "g" && unit === "ud") return Math.round(qty / gpu);
  return null;
}

// Secciones que no son comida y congelados (salvo que la regla los admita).
const NOT_FOOD = /(mascota|perro|gato|cuidado|higiene|limpieza|drogueria|maquillaje|cabello|facial|corporal|bebe|parafarmacia|hogar)/;
const FROZEN = /(ultracongelad|congelad)/;

function matches(name, rule, catPath = "") {
  const n = norm(name);
  if (NOT_FOOD.test(norm(catPath)) || NOT_FOOD.test(n)) return false;
  if (!rule.frozen && FROZEN.test(n)) return false;
  if (rule.re && !new RegExp(rule.re).test(n)) return false;
  const any = (rule.any ?? []).map(norm);
  const all = (rule.all ?? []).map(norm);
  const none = (rule.none ?? []).map(norm);
  if (any.length && !any.some((a) => n.includes(a))) return false;
  if (!all.every((a) => n.includes(a))) return false;
  if (none.some((x) => x && n.includes(x))) return false;
  return true;
}

/** Elige hasta 3 tamaños de envase (el más barato por unidad de cada tamaño). */
function choosePacks(candidates, rule) {
  const [min, max] = rule.size ?? [0, Infinity];
  const ok = candidates.filter((c) => c.packSize >= min && c.packSize <= max);
  const bySize = new Map();
  for (const c of ok) {
    const key = Math.round(c.packSize);
    const prev = bySize.get(key);
    if (!prev || c.price < prev.price) bySize.set(key, c);
  }
  return [...bySize.values()].sort((a, b) => a.price / a.packSize - b.price / b.packSize).slice(0, 3);
}

// ─────────────────────────────── Mercadona ───────────────────────────────
// Tienda online: tienda.mercadona.es. Los precios dependen del almacén (wh).
const mercadona = {
  id: "mercadona",
  async fetchProducts() {
    const wh = process.env.MERCADONA_WH || "mad1";
    const base = "https://tienda.mercadona.es/api";
    const top = await getJSON(`${base}/categories/?lang=es&wh=${wh}`);
    const subIds = (top.results ?? []).flatMap((c) => (c.categories ?? []).map((s) => ({ id: s.id, path: `${c.name} › ${s.name}` })));
    if (!subIds.length) throw new Error("Mercadona: no se han encontrado categorías");
    const products = [];
    for (const sub of subIds) {
      let data;
      try {
        data = await getJSON(`${base}/categories/${sub.id}/?lang=es&wh=${wh}`);
      } catch (e) {
        console.warn(`  ! categoría ${sub.path}: ${e.message}`);
        continue;
      }
      for (const group of data.categories ?? []) {
        for (const p of group.products ?? []) {
          const pi = p.price_instructions ?? {};
          const price = Number(pi.unit_price);
          if (!(price > 0)) continue;
          products.push({
            id: String(p.id),
            name: p.display_name,
            packaging: p.packaging ?? "",
            price,
            size: Number(pi.unit_size),
            format: pi.size_format,
            approx: Boolean(pi.approx_size),
            url: p.share_url,
            path: `${sub.path} › ${group.name ?? ""}`,
          });
        }
      }
    }
    return { products, source: `Web de Mercadona (tienda.mercadona.es, zona ${wh})` };
  },
};

const PROVIDERS = [mercadona];

async function runProvider(provider) {
  const rules = JSON.parse(fs.readFileSync(path.join(here, `${provider.id}-rules.json`), "utf8"));
  console.log(`\n▶ ${provider.id}: descargando catálogo…`);
  const { products, source } = await provider.fetchProducts();
  console.log(`  ${products.length} productos leídos`);
  if (products.length < 200) throw new Error(`Catálogo sospechosamente pequeño (${products.length}); se conservan los precios anteriores`);

  const out = [];
  const report = {};
  const missing = [];
  for (const [ingredientId, rule] of Object.entries(rules)) {
    if (ingredientId.startsWith("_")) continue;
    const candidates = products
      .filter((p) => matches(p.name, rule, p.path))
      .map((p) => ({ ...p, packSize: toBase(p.size, p.format, rule.unit, rule.gpu) }))
      .filter((p) => p.packSize && p.packSize > 0);
    const packs = choosePacks(candidates, rule);
    report[ingredientId] = packs.map((p) => `${p.name} · ${p.packaging} · ${p.packSize}${rule.unit} · ${p.price} €`);
    if (!packs.length) {
      missing.push(ingredientId);
      // Pistas para afinar la regla: productos que coinciden pero sin tamaño válido,
      // o que contienen la palabra clave del ingrediente.
      const key = norm(ingredientId.split("-")[0]);
      const near = [
        ...products.filter((p) => matches(p.name, rule, p.path)),
        ...products.filter((p) => norm(p.name).includes(key)),
      ].slice(0, 8);
      report[`${ingredientId} (sin coincidencia)`] = near.map((p) => `${p.name} · ${p.packaging} · ${p.size} ${p.format} · ${p.price} € · ${p.path}`);
      continue;
    }
    for (const p of packs) {
      out.push({
        id: `${provider.id}:${p.id}`,
        ingredientId,
        name: p.name,
        packLabel: (p.packaging || "envase").toLowerCase(),
        packSize: Math.round(p.packSize * 100) / 100,
        unit: rule.unit,
        price: Math.round(p.price * 100) / 100,
        approx: p.approx,
        url: p.url,
      });
    }
  }
  const total = Object.keys(rules).filter((k) => !k.startsWith("_")).length;
  console.log(`  ${total - missing.length}/${total} ingredientes con precio real${missing.length ? ` · sin coincidencia: ${missing.join(", ")}` : ""}`);
  return {
    catalog: {
      supermarketId: provider.id,
      currency: "EUR",
      referenceDate: today(),
      fetchedAt: new Date().toISOString(),
      source,
      coverage: { matched: total - missing.length, total, missing },
      products: out,
    },
    report,
  };
}

async function main() {
  const index = { updatedAt: new Date().toISOString(), catalogs: [] };
  // Conservar entradas previas de proveedores que hoy fallen.
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIRS[0], "index.json"), "utf8"));
    index.catalogs = prev.catalogs ?? [];
  } catch {
    /* primera vez */
  }
  let ok = 0;
  for (const p of PROVIDERS.filter((p) => !only || p.id === only)) {
    try {
      const { catalog, report } = await runProvider(p);
      ok++;
      if (DRY) {
        console.log(JSON.stringify(report, null, 2));
        continue;
      }
      for (const dir of OUT_DIRS) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${p.id}.json`), JSON.stringify(catalog));
        fs.writeFileSync(path.join(dir, `${p.id}.report.json`), JSON.stringify(report, null, 2));
      }
      index.catalogs = [
        ...index.catalogs.filter((c) => c.supermarketId !== p.id),
        { supermarketId: p.id, referenceDate: catalog.referenceDate, fetchedAt: catalog.fetchedAt, source: catalog.source, coverage: catalog.coverage, file: `${p.id}.json` },
      ];
    } catch (e) {
      console.error(`✗ ${p.id}: ${e.message}`);
    }
  }
  if (!DRY && ok) for (const dir of OUT_DIRS) fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(index, null, 2));
  if (!ok) {
    console.error("\nNo se ha podido actualizar ningún supermercado.");
    process.exit(1);
  }
  console.log("\nPrecios actualizados.");
}

main();
