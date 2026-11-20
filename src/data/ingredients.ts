import type { AisleId, AllergenId, AnimalOrigin, BaseUnit, HouseholdMeasure, Ingredient, MeatType } from "@/domain/types";

/**
 * Envase de referencia del catálogo base (España, supermercado de referencia).
 * size en unidad base del ingrediente; price en EUR. DATOS FICTICIOS DE DEMOSTRACIÓN.
 */
export interface BasePack {
  size: number;
  price: number;
  label: string;
  name?: string;
}

interface Def {
  id: string;
  name: string;
  icon: string;
  unit: BaseUnit;
  aisle: AisleId;
  shelf: number;
  allergens?: AllergenId[];
  meat?: MeatType[];
  animal?: AnimalOrigin[];
  dislike?: string[];
  staple?: boolean;
  hh?: HouseholdMeasure[];
  gpu?: number;
  packs: BasePack[];
  productName?: string;
}

const D: Def[] = [
  // ── Fruta y verdura ───────────────────────────────────────────────
  { id: "tomate", name: "Tomate", icon: "🍅", unit: "g", aisle: "fruta-verdura", shelf: 7, hh: [{ unit: "ud", amount: 150, note: "tomate mediano" }], packs: [{ size: 1000, price: 2.2, label: "bandeja", name: "Tomate pera" }] },
  { id: "tomate-cherry", name: "Tomate cherry", icon: "🍅", unit: "g", aisle: "fruta-verdura", shelf: 6, hh: [{ unit: "puñado", amount: 80, note: "unos 8 tomatitos" }], packs: [{ size: 250, price: 0.99, label: "tarrina" }] },
  { id: "pimiento-verde", name: "Pimiento verde", icon: "🫑", unit: "g", aisle: "fruta-verdura", shelf: 10, dislike: ["pimiento"], hh: [{ unit: "ud", amount: 120, note: "pimiento italiano mediano" }], packs: [{ size: 500, price: 1.39, label: "bandeja", name: "Pimiento verde italiano" }] },
  { id: "pimiento-rojo", name: "Pimiento rojo", icon: "🫑", unit: "g", aisle: "fruta-verdura", shelf: 10, dislike: ["pimiento"], hh: [{ unit: "ud", amount: 200, note: "pimiento mediano" }], packs: [{ size: 400, price: 1.59, label: "bandeja 2 ud" }] },
  { id: "pepino", name: "Pepino", icon: "🥒", unit: "g", aisle: "fruta-verdura", shelf: 8, dislike: ["pepino"], hh: [{ unit: "ud", amount: 300 }], packs: [{ size: 300, price: 0.59, label: "unidad" }] },
  { id: "cebolla", name: "Cebolla", icon: "🧅", unit: "g", aisle: "fruta-verdura", shelf: 30, dislike: ["cebolla"], hh: [{ unit: "ud", amount: 150, note: "cebolla mediana" }], packs: [{ size: 1000, price: 1.5, label: "malla" }, { size: 2000, price: 2.45, label: "malla" }] },
  { id: "ajo", name: "Ajo", icon: "🧄", unit: "g", aisle: "fruta-verdura", shelf: 30, dislike: ["ajo"], hh: [{ unit: "diente", amount: 5 }], packs: [{ size: 150, price: 1.19, label: "malla 3 cabezas" }] },
  { id: "patata", name: "Patata", icon: "🥔", unit: "g", aisle: "fruta-verdura", shelf: 30, hh: [{ unit: "ud", amount: 200, note: "patata mediana" }], packs: [{ size: 2000, price: 2.49, label: "malla" }, { size: 5000, price: 4.99, label: "saco" }] },
  { id: "brocoli", name: "Brócoli", icon: "🥦", unit: "g", aisle: "fruta-verdura", shelf: 6, hh: [{ unit: "ud", amount: 400, note: "pieza mediana" }], packs: [{ size: 440, price: 1.19, label: "paquete" }] },
  { id: "espinacas", name: "Espinacas frescas", icon: "🥬", unit: "g", aisle: "fruta-verdura", shelf: 4, hh: [{ unit: "puñado", amount: 30, note: "hojas sueltas, muy variable" }], packs: [{ size: 300, price: 1.35, label: "bolsa" }] },
  { id: "calabacin", name: "Calabacín", icon: "🥒", unit: "g", aisle: "fruta-verdura", shelf: 8, hh: [{ unit: "ud", amount: 300 }], packs: [{ size: 600, price: 1.19, label: "bandeja 2 ud" }] },
  { id: "berenjena", name: "Berenjena", icon: "🍆", unit: "g", aisle: "fruta-verdura", shelf: 8, dislike: ["berenjena"], hh: [{ unit: "ud", amount: 300 }], packs: [{ size: 600, price: 1.39, label: "bandeja 2 ud" }] },
  { id: "zanahoria", name: "Zanahoria", icon: "🥕", unit: "g", aisle: "fruta-verdura", shelf: 21, hh: [{ unit: "ud", amount: 80 }], packs: [{ size: 1000, price: 0.99, label: "bolsa" }] },
  { id: "lechuga", name: "Lechuga romana", icon: "🥬", unit: "g", aisle: "fruta-verdura", shelf: 6, hh: [{ unit: "puñado", amount: 30 }], packs: [{ size: 400, price: 0.89, label: "pieza" }] },
  { id: "limon", name: "Limón", icon: "🍋", unit: "g", aisle: "fruta-verdura", shelf: 21, hh: [{ unit: "ud", amount: 120 }, { unit: "cda", amount: 15, note: "de zumo" }], packs: [{ size: 500, price: 1.19, label: "malla" }] },
  { id: "perejil", name: "Perejil fresco", icon: "🌿", unit: "g", aisle: "fruta-verdura", shelf: 7, hh: [{ unit: "cda", amount: 4, note: "picado" }], packs: [{ size: 40, price: 0.69, label: "manojo" }] },
  { id: "champinon", name: "Champiñón laminado", icon: "🍄", unit: "g", aisle: "fruta-verdura", shelf: 5, dislike: ["champinones"], hh: [{ unit: "taza", amount: 70, note: "laminado, sin apretar" }], packs: [{ size: 250, price: 1.25, label: "bandeja" }] },
  { id: "aguacate", name: "Aguacate", icon: "🥑", unit: "g", aisle: "fruta-verdura", shelf: 5, hh: [{ unit: "ud", amount: 160, note: "pulpa de una pieza mediana" }], packs: [{ size: 500, price: 2.49, label: "malla 2-3 ud" }] },
  { id: "calabaza", name: "Calabaza troceada", icon: "🎃", unit: "g", aisle: "fruta-verdura", shelf: 7, packs: [{ size: 500, price: 1.39, label: "bandeja" }] },
  { id: "puerro", name: "Puerro", icon: "🥬", unit: "g", aisle: "fruta-verdura", shelf: 14, hh: [{ unit: "ud", amount: 150, note: "parte blanca" }], packs: [{ size: 500, price: 1.29, label: "bandeja" }] },
  { id: "platano", name: "Plátano", icon: "🍌", unit: "g", aisle: "fruta-verdura", shelf: 6, hh: [{ unit: "ud", amount: 120 }], packs: [{ size: 1000, price: 2.29, label: "racimo aprox." }] },
  { id: "tofu", name: "Tofu firme", icon: "⬜", unit: "g", aisle: "fruta-verdura", shelf: 14, allergens: ["soja"], dislike: ["tofu"], packs: [{ size: 400, price: 1.95, label: "pack 2 bloques" }] },
  { id: "hummus", name: "Hummus", icon: "🫙", unit: "g", aisle: "fruta-verdura", shelf: 7, allergens: ["sesamo"], hh: [{ unit: "cda", amount: 20 }], packs: [{ size: 240, price: 1.65, label: "tarrina" }] },

  // ── Carne ─────────────────────────────────────────────────────────
  { id: "chuleta-cerdo", name: "Chuletas de cerdo", icon: "🥩", unit: "g", aisle: "carne", shelf: 3, meat: ["cerdo"], animal: ["carne"], hh: [{ unit: "ud", amount: 180, note: "chuleta de aguja" }], packs: [{ size: 600, price: 5.38, label: "bandeja" }] },
  { id: "pechuga-pollo", name: "Pechuga de pollo", icon: "🍗", unit: "g", aisle: "carne", shelf: 3, meat: ["pollo"], animal: ["carne"], packs: [{ size: 600, price: 3.95, label: "bandeja filetes" }, { size: 1000, price: 6.29, label: "bandeja familiar" }] },
  { id: "muslo-pollo", name: "Muslos de pollo", icon: "🍗", unit: "g", aisle: "carne", shelf: 3, meat: ["pollo"], animal: ["carne"], packs: [{ size: 1000, price: 3.49, label: "bandeja" }] },
  { id: "carne-picada-ternera", name: "Carne picada de vacuno", icon: "🥩", unit: "g", aisle: "carne", shelf: 2, meat: ["ternera"], animal: ["carne"], packs: [{ size: 400, price: 3.39, label: "bandeja" }] },
  { id: "carne-picada-mixta", name: "Carne picada cerdo y vacuno", icon: "🥩", unit: "g", aisle: "carne", shelf: 2, meat: ["ternera", "cerdo"], animal: ["carne"], packs: [{ size: 500, price: 3.05, label: "bandeja" }] },
  { id: "ternera-guisar", name: "Ternera para guisar", icon: "🥩", unit: "g", aisle: "carne", shelf: 3, meat: ["ternera"], animal: ["carne"], packs: [{ size: 600, price: 6.25, label: "bandeja" }] },
  { id: "bacon", name: "Bacon en taquitos", icon: "🥓", unit: "g", aisle: "carne", shelf: 15, meat: ["cerdo"], animal: ["carne"], packs: [{ size: 150, price: 1.55, label: "pack 2 x 75 g" }] },
  { id: "chorizo", name: "Chorizo", icon: "🌭", unit: "g", aisle: "carne", shelf: 30, meat: ["cerdo"], animal: ["carne"], packs: [{ size: 225, price: 1.85, label: "sarta" }] },
  { id: "jamon", name: "Jamón serrano en taquitos", icon: "🍖", unit: "g", aisle: "carne", shelf: 20, meat: ["cerdo"], animal: ["carne"], packs: [{ size: 150, price: 1.95, label: "pack 2 x 75 g" }] },

  // ── Pescadería ────────────────────────────────────────────────────
  { id: "salmon", name: "Lomos de salmón", icon: "🐟", unit: "g", aisle: "pescaderia", shelf: 2, allergens: ["pescado"], meat: ["pescado"], animal: ["pescado"], packs: [{ size: 250, price: 4.39, label: "bandeja 2 lomos" }, { size: 500, price: 7.95, label: "bandeja 4 lomos" }] },
  { id: "sepia", name: "Sepia limpia", icon: "🦑", unit: "g", aisle: "pescaderia", shelf: 2, allergens: ["moluscos"], meat: ["marisco"], animal: ["marisco"], packs: [{ size: 400, price: 4.45, label: "bandeja" }] },

  // ── Congelados ────────────────────────────────────────────────────
  { id: "bacalao", name: "Lomos de bacalao desalado", icon: "🐟", unit: "g", aisle: "congelados", shelf: 90, allergens: ["pescado"], meat: ["pescado"], animal: ["pescado"], packs: [{ size: 400, price: 4.95, label: "bolsa" }, { size: 800, price: 9.25, label: "bolsa grande" }] },
  { id: "merluza", name: "Lomos de merluza", icon: "🐟", unit: "g", aisle: "congelados", shelf: 90, allergens: ["pescado"], meat: ["pescado"], animal: ["pescado"], packs: [{ size: 600, price: 4.89, label: "bolsa" }] },
  { id: "gambas", name: "Gambas peladas", icon: "🦐", unit: "g", aisle: "congelados", shelf: 90, allergens: ["crustaceos"], meat: ["marisco"], animal: ["marisco"], packs: [{ size: 250, price: 3.45, label: "bolsa" }] },
  { id: "guisantes", name: "Guisantes", icon: "🫛", unit: "g", aisle: "congelados", shelf: 180, hh: [{ unit: "taza", amount: 140 }], packs: [{ size: 400, price: 0.95, label: "bolsa" }, { size: 1000, price: 1.69, label: "bolsa" }] },

  // ── Lácteos y huevos ─────────────────────────────────────────────
  { id: "huevo", name: "Huevos", icon: "🥚", unit: "ud", aisle: "lacteos-huevos", shelf: 21, allergens: ["huevos"], animal: ["huevo"], gpu: 60, packs: [{ size: 6, price: 1.35, label: "estuche 6 ud" }, { size: 12, price: 2.55, label: "estuche 12 ud" }] },
  { id: "queso-rallado", name: "Queso rallado", icon: "🧀", unit: "g", aisle: "lacteos-huevos", shelf: 30, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "cda", amount: 7 }, { unit: "puñado", amount: 25 }], packs: [{ size: 200, price: 1.75, label: "bolsa" }] },
  { id: "queso-lonchas", name: "Queso en lonchas", icon: "🧀", unit: "g", aisle: "lacteos-huevos", shelf: 20, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "ud", amount: 20, note: "loncha" }], packs: [{ size: 200, price: 1.85, label: "paquete" }] },
  { id: "queso-crema", name: "Queso crema", icon: "🧀", unit: "g", aisle: "lacteos-huevos", shelf: 20, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "cda", amount: 20 }], packs: [{ size: 200, price: 1.35, label: "tarrina" }] },
  { id: "yogur", name: "Yogur natural", icon: "🥛", unit: "g", aisle: "lacteos-huevos", shelf: 15, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "ud", amount: 125, note: "un yogur" }, { unit: "cda", amount: 20 }], packs: [{ size: 500, price: 0.99, label: "pack 4 ud" }] },

  // ── Conservas ─────────────────────────────────────────────────────
  { id: "atun", name: "Atún en aceite", icon: "🐟", unit: "g", aisle: "conservas", shelf: 365, allergens: ["pescado"], meat: ["pescado"], animal: ["pescado"], hh: [{ unit: "lata", amount: 52, note: "lata pequeña escurrida" }], packs: [{ size: 156, price: 2.95, label: "pack 3 latas", name: "Atún claro en aceite de oliva" }, { size: 312, price: 5.45, label: "pack 6 latas" }] },
  { id: "tomate-triturado", name: "Tomate triturado", icon: "🥫", unit: "g", aisle: "conservas", shelf: 365, hh: [{ unit: "taza", amount: 240 }], packs: [{ size: 400, price: 0.59, label: "bote" }, { size: 800, price: 0.95, label: "bote" }] },
  { id: "tomate-frito", name: "Tomate frito", icon: "🥫", unit: "g", aisle: "conservas", shelf: 365, packs: [{ size: 400, price: 0.85, label: "brik" }] },
  { id: "garbanzos", name: "Garbanzos cocidos", icon: "🫘", unit: "g", aisle: "legumbres", shelf: 365, hh: [{ unit: "taza", amount: 160, note: "escurridos" }], packs: [{ size: 400, price: 0.75, label: "bote (escurrido)" }] },
  { id: "maiz", name: "Maíz dulce", icon: "🌽", unit: "g", aisle: "conservas", shelf: 365, hh: [{ unit: "cda", amount: 15 }], packs: [{ size: 420, price: 1.65, label: "pack 3 latas" }] },
  { id: "aceitunas", name: "Aceitunas sin hueso", icon: "🫒", unit: "g", aisle: "conservas", shelf: 365, dislike: ["aceitunas"], hh: [{ unit: "puñado", amount: 25 }], packs: [{ size: 150, price: 0.95, label: "lata" }] },
  { id: "leche-coco", name: "Leche de coco", icon: "🥥", unit: "ml", aisle: "conservas", shelf: 365, dislike: ["coco"], hh: [{ unit: "vaso", amount: 200 }], packs: [{ size: 400, price: 1.45, label: "lata" }] },
  { id: "pesto", name: "Salsa pesto", icon: "🌿", unit: "g", aisle: "conservas", shelf: 365, allergens: ["frutos-cascara", "lacteos"], animal: ["lacteo"], hh: [{ unit: "cda", amount: 15 }], packs: [{ size: 190, price: 1.85, label: "bote" }] },

  // ── Legumbres ─────────────────────────────────────────────────────
  { id: "lentejas", name: "Lentejas pardinas", icon: "🫘", unit: "g", aisle: "legumbres", shelf: 365, hh: [{ unit: "vaso", amount: 200, note: "vaso de agua lleno" }], packs: [{ size: 1000, price: 1.65, label: "paquete" }] },

  // ── Pasta y arroz ─────────────────────────────────────────────────
  { id: "arroz", name: "Arroz redondo", icon: "🍚", unit: "g", aisle: "pasta-arroz", shelf: 365, hh: [{ unit: "vaso", amount: 200, note: "vaso de agua lleno" }, { unit: "taza", amount: 190 }], packs: [{ size: 1000, price: 1.15, label: "paquete" }] },
  { id: "macarrones", name: "Macarrones", icon: "🍝", unit: "g", aisle: "pasta-arroz", shelf: 365, allergens: ["gluten"], hh: [{ unit: "taza", amount: 90, note: "pasta seca" }], packs: [{ size: 500, price: 0.75, label: "paquete" }, { size: 1000, price: 1.3, label: "paquete" }] },
  { id: "espaguetis", name: "Espaguetis", icon: "🍝", unit: "g", aisle: "pasta-arroz", shelf: 365, allergens: ["gluten"], packs: [{ size: 500, price: 0.75, label: "paquete" }] },
  { id: "fideos", name: "Fideos finos", icon: "🍜", unit: "g", aisle: "pasta-arroz", shelf: 365, allergens: ["gluten"], hh: [{ unit: "puñado", amount: 25 }], packs: [{ size: 500, price: 0.85, label: "paquete" }] },

  // ── Panadería ─────────────────────────────────────────────────────
  { id: "pan", name: "Pan de barra", icon: "🥖", unit: "g", aisle: "panaderia", shelf: 3, allergens: ["gluten"], hh: [{ unit: "rebanada", amount: 30 }], packs: [{ size: 250, price: 0.6, label: "barra" }] },
  { id: "pan-hamburguesa", name: "Pan de hamburguesa", icon: "🍔", unit: "ud", aisle: "panaderia", shelf: 10, allergens: ["gluten", "sesamo"], gpu: 60, packs: [{ size: 4, price: 1.25, label: "paquete 4 ud" }] },
  { id: "tortillas", name: "Tortillas de trigo", icon: "🫓", unit: "ud", aisle: "panaderia", shelf: 30, allergens: ["gluten"], gpu: 40, packs: [{ size: 8, price: 1.35, label: "paquete 8 ud" }] },
  { id: "pan-rallado", name: "Pan rallado", icon: "🍞", unit: "g", aisle: "panaderia", shelf: 180, allergens: ["gluten"], hh: [{ unit: "cda", amount: 8 }], packs: [{ size: 500, price: 0.85, label: "paquete" }] },

  // ── Desayunos y meriendas ─────────────────────────────────────────
  { id: "manzana", name: "Manzana", icon: "🍎", unit: "g", aisle: "fruta-verdura", shelf: 21, hh: [{ unit: "ud", amount: 180, note: "manzana mediana" }], packs: [{ size: 1000, price: 2.19, label: "malla" }] },
  { id: "leche", name: "Leche semidesnatada", icon: "🥛", unit: "ml", aisle: "lacteos-huevos", shelf: 7, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "vaso", amount: 200 }, { unit: "taza", amount: 240 }], packs: [{ size: 1000, price: 0.95, label: "brik 1 l" }, { size: 6000, price: 5.4, label: "pack 6 bricks" }] },
  { id: "bebida-avena", name: "Bebida de avena", icon: "🥛", unit: "ml", aisle: "lacteos-huevos", shelf: 7, allergens: ["gluten"], hh: [{ unit: "vaso", amount: 200 }], packs: [{ size: 1000, price: 1.15, label: "brik 1 l" }] },
  { id: "mantequilla", name: "Mantequilla", icon: "🧈", unit: "g", aisle: "lacteos-huevos", shelf: 60, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "cdita", amount: 5 }, { unit: "cda", amount: 14 }], packs: [{ size: 250, price: 2.65, label: "pastilla" }] },
  { id: "queso-fresco", name: "Queso fresco tipo Burgos", icon: "🧀", unit: "g", aisle: "lacteos-huevos", shelf: 10, allergens: ["lacteos"], animal: ["lacteo"], hh: [{ unit: "rebanada", amount: 30, note: "loncha gruesa" }], packs: [{ size: 250, price: 1.55, label: "tarrina" }] },
  { id: "jamon-cocido", name: "Jamón cocido en lonchas", icon: "🥓", unit: "g", aisle: "carne", shelf: 10, meat: ["cerdo"], animal: ["carne"], hh: [{ unit: "ud", amount: 15, note: "loncha" }], packs: [{ size: 200, price: 2.1, label: "paquete lonchas" }] },
  { id: "pan-molde", name: "Pan de molde", icon: "🍞", unit: "g", aisle: "panaderia", shelf: 10, allergens: ["gluten"], hh: [{ unit: "rebanada", amount: 25 }], packs: [{ size: 460, price: 1.35, label: "bolsa" }] },
  { id: "avena", name: "Copos de avena", icon: "🌾", unit: "g", aisle: "pasta-arroz", shelf: 180, allergens: ["gluten"], hh: [{ unit: "cda", amount: 8 }, { unit: "taza", amount: 90 }], packs: [{ size: 500, price: 1.15, label: "paquete" }] },
  { id: "nueces", name: "Nueces peladas", icon: "🌰", unit: "g", aisle: "especias-otros", shelf: 120, allergens: ["frutos-cascara"], hh: [{ unit: "puñado", amount: 20 }], packs: [{ size: 200, price: 2.4, label: "bolsa" }] },
  { id: "miel", name: "Miel", icon: "🍯", unit: "g", aisle: "especias-otros", shelf: 365, animal: ["miel"], hh: [{ unit: "cdita", amount: 7 }, { unit: "cda", amount: 20 }], packs: [{ size: 500, price: 3.95, label: "tarro" }] },
  { id: "cacao", name: "Cacao en polvo", icon: "🍫", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "cdita", amount: 5 }, { unit: "cda", amount: 12 }], packs: [{ size: 390, price: 1.85, label: "bote" }] },
  { id: "chocolate", name: "Chocolate negro", icon: "🍫", unit: "g", aisle: "especias-otros", shelf: 365, allergens: ["soja"], hh: [{ unit: "ud", amount: 10, note: "onza" }], packs: [{ size: 100, price: 1.2, label: "tableta" }] },
  { id: "canela", name: "Canela molida", icon: "🟫", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "pizca", amount: 0.3 }, { unit: "cdita", amount: 2.5 }], packs: [{ size: 45, price: 1.1, label: "bote" }] },

  // ── Especias y otros ─────────────────────────────────────────────
  { id: "aceite", name: "Aceite de oliva", icon: "🫒", unit: "ml", aisle: "especias-otros", shelf: 365, staple: true, hh: [{ unit: "cda", amount: 15 }, { unit: "cdita", amount: 5 }, { unit: "vaso", amount: 200 }], packs: [{ size: 1000, price: 4.95, label: "botella 1 l" }] },
  { id: "sal", name: "Sal", icon: "🧂", unit: "g", aisle: "especias-otros", shelf: 999, staple: true, hh: [{ unit: "cdita", amount: 6 }, { unit: "pizca", amount: 0.5 }], packs: [{ size: 1000, price: 0.39, label: "paquete" }] },
  { id: "pimienta", name: "Pimienta negra", icon: "⚫", unit: "g", aisle: "especias-otros", shelf: 999, staple: true, hh: [{ unit: "pizca", amount: 0.3 }, { unit: "cdita", amount: 2.3 }], packs: [{ size: 50, price: 1.25, label: "molinillo" }] },
  { id: "vinagre", name: "Vinagre de vino", icon: "🍶", unit: "ml", aisle: "especias-otros", shelf: 999, staple: true, allergens: ["sulfitos"], hh: [{ unit: "cda", amount: 15 }, { unit: "cdita", amount: 5 }], packs: [{ size: 1000, price: 0.65, label: "botella" }] },
  { id: "harina", name: "Harina de trigo", icon: "🌾", unit: "g", aisle: "especias-otros", shelf: 365, allergens: ["gluten"], hh: [{ unit: "cda", amount: 10, note: "colmada aprox." }, { unit: "taza", amount: 125, note: "tamizada; la densidad puede variar ±20 %" }], packs: [{ size: 1000, price: 0.75, label: "paquete" }] },
  { id: "azucar", name: "Azúcar", icon: "🍬", unit: "g", aisle: "especias-otros", shelf: 999, hh: [{ unit: "cdita", amount: 4 }, { unit: "cda", amount: 12 }], packs: [{ size: 1000, price: 1.15, label: "paquete" }] },
  { id: "pimenton", name: "Pimentón dulce", icon: "🌶️", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "cdita", amount: 2.5 }], packs: [{ size: 75, price: 0.95, label: "bote" }] },
  { id: "comino", name: "Comino molido", icon: "🟤", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "cdita", amount: 2 }, { unit: "pizca", amount: 0.3 }], packs: [{ size: 45, price: 1.05, label: "bote" }] },
  { id: "curry", name: "Curry en polvo", icon: "🟡", unit: "g", aisle: "especias-otros", shelf: 365, allergens: ["mostaza"], hh: [{ unit: "cdita", amount: 2 }], packs: [{ size: 50, price: 1.25, label: "bote" }] },
  { id: "laurel", name: "Laurel", icon: "🍃", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "ud", amount: 0.2, note: "hoja" }], packs: [{ size: 8, price: 0.85, label: "bote" }] },
  { id: "oregano", name: "Orégano", icon: "🌿", unit: "g", aisle: "especias-otros", shelf: 365, hh: [{ unit: "cdita", amount: 1 }, { unit: "pizca", amount: 0.2 }], packs: [{ size: 12, price: 0.85, label: "bote" }] },
  { id: "cayena", name: "Guindilla cayena", icon: "🌶️", unit: "g", aisle: "especias-otros", shelf: 365, dislike: ["picante"], hh: [{ unit: "ud", amount: 0.3, note: "guindilla" }], packs: [{ size: 15, price: 0.95, label: "bote" }] },
  { id: "vino-blanco", name: "Vino blanco para cocinar", icon: "🍷", unit: "ml", aisle: "especias-otros", shelf: 60, allergens: ["sulfitos"], hh: [{ unit: "chorrito", amount: 30 }, { unit: "vaso", amount: 200 }], packs: [{ size: 750, price: 1.35, label: "botella" }] },
  { id: "caldo-pollo", name: "Caldo de pollo", icon: "🍲", unit: "ml", aisle: "especias-otros", shelf: 5, allergens: ["apio"], meat: ["pollo"], animal: ["carne"], hh: [{ unit: "vaso", amount: 200 }], packs: [{ size: 1000, price: 1.05, label: "brik" }] },
  { id: "caldo-verduras", name: "Caldo de verduras", icon: "🍲", unit: "ml", aisle: "especias-otros", shelf: 5, allergens: ["apio"], hh: [{ unit: "vaso", amount: 200 }], packs: [{ size: 1000, price: 1.05, label: "brik" }] },
  { id: "salsa-soja", name: "Salsa de soja", icon: "🥢", unit: "ml", aisle: "especias-otros", shelf: 365, allergens: ["soja", "gluten"], hh: [{ unit: "cda", amount: 15 }], packs: [{ size: 250, price: 1.45, label: "bote" }] },
  { id: "mostaza", name: "Mostaza", icon: "🟡", unit: "g", aisle: "especias-otros", shelf: 120, allergens: ["mostaza"], hh: [{ unit: "cdita", amount: 5 }], packs: [{ size: 200, price: 0.95, label: "bote" }] },
];

export const INGREDIENTS: Ingredient[] = D.map((d) => ({
  id: d.id,
  name: d.name,
  icon: d.icon,
  unit: d.unit,
  aisle: d.aisle,
  allergens: d.allergens ?? [],
  meat: d.meat,
  animal: d.animal,
  dislikeKeys: d.dislike,
  shelfLifeDays: d.shelf,
  staple: d.staple,
  household: d.hh,
  gramsPerUnit: d.gpu,
}));

export const BASE_PACKS: Record<string, { productName: string; packs: BasePack[] }> = Object.fromEntries(
  D.map((d) => [d.id, { productName: d.productName ?? d.name, packs: d.packs }]),
);

const BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id: string): Ingredient {
  const i = BY_ID.get(id);
  if (!i) throw new Error(`Ingrediente desconocido: ${id}`);
  return i;
}

export function findIngredient(id: string | null | undefined): Ingredient | undefined {
  return id ? BY_ID.get(id) : undefined;
}
