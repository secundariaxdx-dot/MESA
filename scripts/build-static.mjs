// Genera la app estática para GitHub Pages.
//
// Pages está configurado como "Deploy from a branch" con la carpeta "/ (root)",
// así que publicamos la app en docs/ (URL .../MESA/docs/) y en la raíz del
// repositorio dejamos:
//   - index.html y 404.html que redirigen a la app (en vez de mostrar el README)
//   - .nojekyll para que GitHub sirva las carpetas _next sin procesarlas
//
// Uso: node scripts/build-static.mjs [basePath]   (por defecto /MESA/docs)
// La ruta opcional /api/ai (IA con Claude) necesita servidor y se excluye.
import { execSync } from "node:child_process";
import fs from "node:fs";

const basePath = process.argv[2] ?? "/MESA/docs";
const api = "src/app/api";
const hidden = ".api-disabled";
const env = { ...process.env, STATIC_EXPORT: "1", BASE_PATH: basePath };

if (fs.existsSync(api)) fs.renameSync(api, hidden);
try {
  fs.rmSync("out", { recursive: true, force: true });
  fs.rmSync(".next", { recursive: true, force: true });
  execSync("npx next build", { stdio: "inherit", env });
} finally {
  if (fs.existsSync(hidden)) fs.renameSync(hidden, api);
}
fs.rmSync("docs", { recursive: true, force: true });
fs.cpSync("out", "docs", { recursive: true });
fs.writeFileSync("docs/.nojekyll", "");

const redirect = (target) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MESA</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${target}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2448f5;color:#fff;font:600 20px system-ui,sans-serif}</style>
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>Abriendo MESA…</body>
</html>
`;
fs.writeFileSync("index.html", redirect(`${basePath}/`));
fs.writeFileSync("404.html", redirect(`${basePath}/`));
fs.writeFileSync(".nojekyll", "");
console.log(`\nApp estática lista en docs/ (basePath ${basePath}). Raíz: index.html → ${basePath}/`);
