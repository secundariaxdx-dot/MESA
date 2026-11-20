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

### Compra en varios supermercados

En el paso «¿Dónde haces la compra?», en Preferencias o desde la propia lista, marca otros supermercados con «También voy» y activa **Repartir la compra**. MESA calcula cada producto con envases completos en todos ellos, lo asigna al más barato y descarta cualquier súper adicional que no te ahorre al menos 1 € (no compensa la parada). La lista se agrupa por supermercado y después por pasillos, con el subtotal de cada uno y el ahorro frente a hacerlo todo en el principal.

### Modo aprovechamiento

Activado por defecto (Presupuesto, Preferencias o la tarjeta ♻️ de la Semana). En el súper se compra por envases enteros, así que MESA mira cuánto sobra de cada uno y qué le pasa según lo que dura el alimento:
- **≤ 7 días** (pan, carne fresca, verdura de hoja, tomate…): se tiene que gastar esa semana; si no, cuenta como posible desperdicio.
- **8–21 días** (huevos, yogures, embutido…): se reserva y el menú de la semana siguiente lo usa primero.
- **> 21 días** (arroz, conservas, especias…): se queda en la despensa.

Con el modo activado, el planificador cambia platos para gastar los envases enteros y lo que tienes en casa antes de que caduque (búsqueda local sobre «lo que pagas + lo que se tiraría − tus preferencias»), sin pasarse del presupuesto ni repetir la semana anterior. En las pruebas reduce lo que se tira de ~4,3 € a ~1,1 € por semana y abarata la compra.

### Mis productos

En **Lista de la compra → Mis productos** (o con la ★ de cada producto de la lista) guardas lo que te gusta de un súper concreto:
- **Productos propios** (p. ej. «guacamole de Mercadona»): con precio y unidades opcionales y el interruptor «Añadir a mi lista cada semana», aparecen en la lista de ese súper y suman al total.
- **Ingredientes de recetas** (p. ej. «atún de Eroski»): cuando el menú los necesite, se compran siempre en ese súper aunque en otro salgan más baratos. Ese súper nunca se descarta del reparto.

### Franjas del día

Desayuno, comida, merienda y cena. Desayunos y meriendas usan sus propias recetas (nunca se rellenan con platos de cena) y pueden repetirse durante la semana sin avisos.

Desde la bienvenida puedes **empezar desde cero** (onboarding de 13 pantallas) o **ver la semana de ejemplo** (España · Mercadona · 3 personas · L-V · cenas · 53 € · 45,64 € en caja).

## Publicar en GitHub Pages (y usarla como app en el móvil)

GitHub Pages está en **Deploy from a branch → `/ (root)`**. La app estática vive en `docs/` y en la raíz hay un `index.html` que redirige a ella, más un `.nojekyll` para que no se muestre este README.

- Enlace: `https://<usuario>.github.io/MESA/` (redirige a `/MESA/docs/`).
- Es una PWA: en iPhone, Safari → Compartir → **Añadir a pantalla de inicio**; en Android, **Instalar app**. Se abre a pantalla completa y funciona sin conexión.

Para regenerarla tras cambiar el código:

```bash
npm run build:pages        # basePath /MESA/docs
```

La versión estática no incluye `/api/ai` (necesita servidor); el resto funciona igual porque los datos viven en el navegador.

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
