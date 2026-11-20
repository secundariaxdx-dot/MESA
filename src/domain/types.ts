/**
 * Modelo de dominio de MESA.
 * Todas las cantidades internas se expresan en la unidad base del ingrediente
 * (g, ml o ud). Las conversiones a medidas caseras viven en engine/units.ts.
 */

export type CountryId = "es" | "no" | "uk" | "us" | "fi" | "be";
export type CurrencyCode = "EUR" | "NOK" | "GBP" | "USD";

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  currency: CurrencyCode;
  locale: string;
  /** Multiplicador de nivel de precios respecto a España (ya en moneda local). */
  priceLevel: number;
  supermarkets: string[];
}

export interface Supermarket {
  id: string;
  name: string;
  countryId: CountryId;
  /** Color de marca aproximado para el logotipo genérico. */
  color: string;
  /** Factor de precio relativo dentro del país (1 = referencia). */
  priceFactor: number;
}

export type BaseUnit = "g" | "ml" | "ud";

export type AisleId =
  | "fruta-verdura"
  | "carne"
  | "pescaderia"
  | "lacteos-huevos"
  | "conservas"
  | "pasta-arroz"
  | "legumbres"
  | "panaderia"
  | "congelados"
  | "especias-otros";

export type AllergenId =
  | "gluten"
  | "crustaceos"
  | "huevos"
  | "pescado"
  | "cacahuetes"
  | "soja"
  | "lacteos"
  | "frutos-cascara"
  | "apio"
  | "mostaza"
  | "sesamo"
  | "sulfitos"
  | "altramuces"
  | "moluscos";

export type MeatType = "ternera" | "cerdo" | "pollo" | "pescado" | "marisco";
export type AnimalOrigin = "carne" | "pescado" | "marisco" | "lacteo" | "huevo" | "miel";

export type HouseholdUnit =
  | "cda"
  | "cdita"
  | "vaso"
  | "taza"
  | "ud"
  | "diente"
  | "pizca"
  | "puñado"
  | "rebanada"
  | "lata"
  | "chorrito";

export interface HouseholdMeasure {
  unit: HouseholdUnit;
  /** Cantidad en unidad base equivalente a 1 medida casera. */
  amount: number;
  /** Nota sobre fiabilidad (densidad, tamaño, etc.). */
  note?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  /** Nombre plural/compra para la lista. */
  icon: string;
  unit: BaseUnit;
  aisle: AisleId;
  allergens: AllergenId[];
  meat?: MeatType[];
  animal?: AnimalOrigin[];
  /** Claves que el usuario puede excluir ("cebolla", "picante"...). */
  dislikeKeys?: string[];
  /** Días aproximados que aguanta una vez comprado (orientativo). */
  shelfLifeDays: number;
  /** Ingrediente básico de despensa (aceite, sal...). */
  staple?: boolean;
  household?: HouseholdMeasure[];
  /** Gramos aproximados por unidad, para ingredientes contados en ud. */
  gramsPerUnit?: number;
}

export type MealSlot = "desayuno" | "comida" | "merienda" | "cena";

export type PreferenceId =
  | "rapidas"
  | "ligeras"
  | "tradicional"
  | "cuchara"
  | "takeaway"
  | "verdura"
  | "proteina";

export type DietId = "omnivora" | "vegetariana" | "vegana" | "pescetariana";

export type ApplianceId =
  | "fuegos"
  | "horno"
  | "microondas"
  | "freidora"
  | "batidora"
  | "robot"
  | "olla-presion"
  | "tostadora";

export type Difficulty = "Fácil" | "Media" | "Elaborada";

export interface RecipeIngredient {
  ingredientId: string;
  /** Cantidad por ración (adulto) en unidad base del ingrediente. */
  perServing: number;
  note?: string;
  optional?: boolean;
}

export interface RecipeStep {
  text: string;
  ingredientIds?: string[];
  /** Temporizador sugerido en minutos. */
  timerMin?: number;
  tip?: string;
}

export interface StorageInfo {
  method: "Nevera" | "Congelador" | "Temperatura ambiente" | "Consumir al momento";
  container: string;
  /** Rango orientativo en días. */
  days: [number, number];
  freezable: boolean;
  freezeMonths?: number;
  notes?: string;
}

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  /** Ruta a fotografía opcional (public/). Si no existe se usa la ilustración. */
  image?: string;
  /** Emojis principales para la ilustración del plato. */
  art: string[];
  /** Colores de fondo para la ilustración [desde, hasta]. */
  palette: [string, string];
  cuisine: string;
  categories: PreferenceId[];
  mealTypes: MealSlot[];
  ingredients: RecipeIngredient[];
  totalTime: number;
  activeTime: number;
  difficulty: Difficulty;
  baseServings: number;
  steps: RecipeStep[];
  utensils: string[];
  /** Cada elemento es un grupo de alternativas: basta con tener uno. */
  appliances: ApplianceId[][];
  tags: string[];
  storage: StorageInfo;
  /** Admite cocinar de más para la comida siguiente. */
  leftoverFriendly: boolean;
  nutrition?: Nutrition;
}

/** Producto de un supermarket concreto. */
export interface Product {
  id: string;
  name: string;
  brand: string;
  supermarketId: string;
  ingredientId: string;
  category: AisleId;
  packSize: number;
  unit: BaseUnit;
  /** Etiqueta del envase: "paquete", "bote", "malla"... */
  packLabel: string;
  price: number;
  /** Precio por kg, l o unidad. */
  pricePerUnit: number;
  pricePerUnitLabel: string;
  updatedAt: string;
  source: string;
  available: boolean | null;
}

export interface PriceCatalog {
  supermarketId: string;
  currency: CurrencyCode;
  referenceDate: string;
  source: string;
  isDemo: boolean;
  products: Product[];
}

export interface Profile {
  name: string;
  countryId: CountryId;
  supermarketId: string;
  extraSupermarkets: string[];
  /** Repartir la compra entre el súper principal y los adicionales para ahorrar. */
  multiStore: boolean;
  adults: number;
  children: number;
  /** 0 = lunes ... 6 = domingo */
  days: number[];
  /** Franjas a planificar. desayuno y merienda son opcionales (perfiles antiguos no las tienen). */
  meals: { desayuno?: boolean; comida: boolean; merienda?: boolean; cena: boolean };
  leftovers: "aprovechar" | "distintos";
  budget: number;
  cheapest: boolean;
  preferences: PreferenceId[];
  diet: DietId;
  meats: MeatType[];
  dislikes: string[];
  customDislikes: string[];
  allergens: AllergenId[];
  noAllergies: boolean;
  appliances: ApplianceId[];
}

export type MealStatus = "planned" | "cooked" | "skipped";

export interface PlannedMeal {
  id: string;
  date: string; // YYYY-MM-DD
  dayIndex: number;
  slot: MealSlot;
  kind: "cook" | "leftover";
  recipeId: string;
  /** Raciones que se cocinan (incluye las de sobras). */
  servings: number;
  /** Raciones que se comen en esta franja. */
  eatServings: number;
  /** Si esta cena se cocina también para la comida del día siguiente. */
  feedsMealId?: string;
  leftoverOfMealId?: string;
  status: MealStatus;
}

export interface WeekPlan {
  id: string;
  createdAt: string;
  weekStart: string;
  supermarketId: string;
  countryId: CountryId;
  budget: number;
  people: number;
  portionFactor: number;
  meals: PlannedMeal[];
  warnings: string[];
  seed: number;
  purchaseId?: string;
  /** Coste estimado en caja al generar (para historial). */
  estimatedTotal: number;
}

export interface PantryItem {
  id: string;
  ingredientId: string | null;
  /** Nombre libre para productos fuera del catálogo. */
  name: string;
  /** null = "tengo suficiente" (no se descuenta). */
  quantity: number | null;
  unit: BaseUnit;
  expiresAt?: string;
  status: "ok" | "agotado";
  source: "manual" | "compra" | "receta";
  addedAt: string;
}

export interface PackChoice {
  productId: string;
  productName: string;
  packSize: number;
  packLabel: string;
  unitPrice: number;
  count: number;
}

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  icon: string;
  aisle: AisleId;
  unit: BaseUnit;
  /** Necesidad total de la semana. */
  needed: number;
  /** Cubierto por la despensa. */
  fromPantry: number;
  /** Lo que falta comprar. */
  toBuy: number;
  packs: PackChoice[];
  purchasedQty: number;
  cost: number;
  /** Coste proporcional de lo que se consume. */
  consumedCost: number;
  shortfall: number;
  surplus: number;
  recipeIds: string[];
  missingProduct?: boolean;
  /** Supermercado donde conviene comprarlo. */
  supermarketId: string;
  /** Se compra en ese súper porque es un producto favorito del usuario. */
  pinned?: boolean;
  /** Producto guardado por el usuario que no es ingrediente de recetas. */
  custom?: boolean;
  /** Producto guardado sin precio indicado (no suma al total). */
  priceUnknown?: boolean;
  /** Coste del mismo producto (envases completos) en los demás supermercados. */
  alternatives: { supermarketId: string; cost: number }[];
}

export interface StoreBreakdown {
  supermarketId: string;
  total: number;
  itemCount: number;
}

export interface ShoppingList {
  planId: string;
  supermarketId: string;
  currency: CurrencyCode;
  referenceDate: string;
  isDemoPrices: boolean;
  toBuy: ShoppingItem[];
  covered: ShoppingItem[];
  checkoutTotal: number;
  consumedTotal: number;
  pantrySavings: number;
  /** La lista reparte la compra entre varios supermercados. */
  multiStore: boolean;
  /** Supermercados con algo que comprar, en orden (el principal primero). */
  stores: StoreBreakdown[];
  /** Lo que costaría comprarlo todo en el supermercado principal. */
  singleStoreTotal: number;
  /** Supermercados descartados porque el ahorro no compensa la parada. */
  skippedStores: { supermarketId: string; saving: number }[];
}

export interface PurchaseRecord {
  id: string;
  planId: string;
  date: string;
  supermarketId: string;
  /** Desglose por supermercado cuando la compra se repartió. */
  stores?: StoreBreakdown[];
  currency: CurrencyCode;
  total: number;
  items: { ingredientId: string; name: string; qty: number; unit: BaseUnit; cost: number; packs: string; supermarketId?: string }[];
}

export interface CookedEntry {
  id: string;
  recipeId: string;
  mealId?: string;
  date: string;
  servings: number;
}

export interface CookingProgress {
  key: string;
  recipeId: string;
  mealId?: string;
  step: number;
  servings: number;
  startedAt: string;
  updatedAt: string;
  doneTasks: string[];
}

/** Producto que al usuario le gusta de un supermercado concreto. */
export interface MyProduct {
  id: string;
  name: string;
  supermarketId: string;
  /** Si es un ingrediente del catálogo, se compra siempre en este súper. */
  ingredientId: string | null;
  /** Precio por unidad (opcional, para productos propios). */
  price: number | null;
  /** Unidades que se compran cada semana (productos propios). */
  quantity: number;
  aisle: AisleId;
  /** Añadir a la lista de la compra cada semana (productos propios). */
  inList: boolean;
  note?: string;
  createdAt: string;
}
