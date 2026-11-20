// Genera el sitio estático en docs/ para GitHub Pages.
// Uso: node scripts/build-static.mjs [basePath]   (por defecto /MESA)
// La ruta opcional /api/ai (IA con Claude) necesita servidor, así que se excluye del sitio estático.
import { execSync } from "node:child_process";
import fs from "node:fs";

const basePath = process.argv[2] ?? "/MESA";
const api = "src/app/api";
const hidden = ".api-disabled";
const env = { ...process.env, STATIC_EXPORT: "1", BASE_PATH: basePath };

if (fs.existsSync(api)) fs.renameSync(api, hidden);
try {
  fs.rmSync("out", { recursive: true, force: true });
  execSync("npx next build", { stdio: "inherit", env });
} finally {
  if (fs.existsSync(hidden)) fs.renameSync(hidden, api);
}
fs.rmSync("docs", { recursive: true, force: true });
fs.cpSync("out", "docs", { recursive: true });
fs.writeFileSync("docs/.nojekyll", "");
// 404 de Pages -> la app (las rutas se resuelven en cliente).
if (fs.existsSync("docs/404.html") === false && fs.existsSync("docs/index.html")) fs.copyFileSync("docs/index.html", "docs/404.html");
console.log(`\nSitio estático listo en docs/ (basePath ${basePath})`);
