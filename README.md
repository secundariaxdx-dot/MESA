# MESA

Asistente de planificación de comidas y compra semanal. Configuras tu casa (supermercado, personas, días, presupuesto, gustos, dieta, alergias y aparatos) y MESA genera la semana, calcula **lo que pagarás en caja por envases completos**, descuenta lo que tienes en la **despensa** y te guía para **cocinar paso a paso**.

> MESA no está afiliada a ningún supermercado. Los precios incluidos son **ficticios** y solo sirven para demostrar el cálculo (fecha de referencia visible en la app).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas del motor (vitest)
npm run build && npm start
npm run e2e        # recorrido completo con Playwright contra http://localhost:3000
```

Desde la bienvenida puedes **empezar desde cero** (onboarding de 13 pantallas) o **ver la semana de ejemplo** (España · Mercadona · 3 personas · L-V · cenas · 53 € · 45,64 € en caja).

## Publicar en GitHub Pages

El repositorio incluye el sitio estático ya generado en `docs/` (rutas `/MESA/…`). En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, elige la rama y la carpeta **/docs**. La app quedará en `https://<usuario>.github.io/MESA/`.

Para regenerarlo tras cambiar el código:

```bash
npm run build:pages        # usa basePath /MESA; otro nombre: node scripts/build-static.mjs /otro
```

El sitio estático no incluye `/api/ai` (necesita servidor); el resto funciona igual porque los datos viven en el navegador.

## Arquitectura

```
src/
  domain/types.ts          Modelo de datos (perfil, receta, producto, plan, despensa, compra…)
  data/                    Catálogo estructurado
    geo.ts                 Países, monedas y supermercados
    taxonomy.ts            Alérgenos UE, preferencias, dietas, carnes, aparatos, pasillos
    ingredients.ts         Ingredientes + envases base (tamaño y precio de demostración)
    recipes.ts             37 recetas con pasos, tiempos, utensilios, conservación…
    demo.ts                Perfil y despensa de la demostración
  engine/                  Lógica de negocio pura (testeada)
    compat.ts              Alergias (obligatorias), dieta, carnes, exclusiones, aparatos
    pricing.ts             Elección de envases completos (combinación más barata, tolerancia 5 %)
    shopping.ts            Suma de necesidades, despensa, coste en caja vs. coste proporcional
    pantry.ts              Inventario: compras, consumo al cocinar, caducidades
    planner.ts             Generador determinista, sobras, optimización de presupuesto, cambios
    generate.ts            Generación por etapas reales (pantalla de carga)
    units.ts               Formatos y medidas caseras (solo con equivalencias definidas)
  services/
    prices/provider.ts     Proveedores de precios (interfaz + proveedor de demostración)
    storage/adapter.ts     Persistencia (localStorage hoy; Supabase preparado)
    ai/                    Capa de IA opcional (reglas locales o Claude vía /api/ai)
  store/mesa.ts            Estado global (zustand + persist)
  components/              UI reutilizable (primitivas, onboarding, semana, receta…)
  app/                     Rutas: bienvenida, onboarding, generando, (tabs)/semana|recetas|preferencias|ajustes|lista|despensa|historial, receta/[…], cocinar/[…]
supabase/schema.sql        Esquema propuesto para la fase 2
e2e/success-path.mjs       Recorrido de la "definición de éxito"
```

### Precios reales
Implementa `PriceProvider` (`src/services/prices/provider.ts`) contra una fuente autorizada y regístralo en `PROVIDERS`. El resto de la app usa el catálogo que devuelva (tamaño de envase, precio, fecha, fuente y disponibilidad).

### IA opcional
Con `ANTHROPIC_API_KEY` en el servidor, `/api/ai` activa ideas de aprovechamiento con Claude en la despensa. Sin clave, todo funciona con el motor local.

### Imágenes
Las recetas aceptan `image` (ruta en `public/`). Mientras no haya fotografías con licencia, se muestra una ilustración de emplatado generada con los ingredientes de cada plato.
