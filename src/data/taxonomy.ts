import type {
  AisleId,
  MealSlot,
  AllergenId,
  ApplianceId,
  DietId,
  MeatType,
  PreferenceId,
} from "@/domain/types";

export const ALLERGENS: { id: AllergenId; name: string; icon: string }[] = [
  { id: "gluten", name: "Gluten", icon: "🌾" },
  { id: "crustaceos", name: "Crustáceos", icon: "🦐" },
  { id: "huevos", name: "Huevos", icon: "🥚" },
  { id: "pescado", name: "Pescado", icon: "🐟" },
  { id: "cacahuetes", name: "Cacahuetes", icon: "🥜" },
  { id: "soja", name: "Soja", icon: "🫘" },
  { id: "lacteos", name: "Lácteos", icon: "🥛" },
  { id: "frutos-cascara", name: "Frutos de cáscara", icon: "🌰" },
  { id: "apio", name: "Apio", icon: "🥬" },
  { id: "mostaza", name: "Mostaza", icon: "🟡" },
  { id: "sesamo", name: "Sésamo", icon: "⚪" },
  { id: "sulfitos", name: "Sulfitos", icon: "🍷" },
  { id: "altramuces", name: "Altramuces", icon: "🟤" },
  { id: "moluscos", name: "Moluscos", icon: "🦑" },
];

export const allergenName = (id: AllergenId) => ALLERGENS.find((a) => a.id === id)?.name ?? id;

export const ALLERGY_WARNING =
  "Comprueba siempre el etiquetado de los productos. La información de ingredientes no garantiza ausencia de trazas ni de contaminación cruzada.";

export const PREFERENCES: { id: PreferenceId; name: string; icon: string; hint: string }[] = [
  { id: "rapidas", name: "Rápidas", icon: "⚡", hint: "30 minutos o menos" },
  { id: "ligeras", name: "Ligeras", icon: "🥗", hint: "Cenas que sientan bien" },
  { id: "tradicional", name: "De toda la vida", icon: "🍳", hint: "Recetas de casa" },
  { id: "cuchara", name: "De cuchara", icon: "🍲", hint: "Guisos y legumbres" },
  { id: "takeaway", name: "Tipo take-away", icon: "🌯", hint: "Como pedir, pero en casa" },
  { id: "verdura", name: "Con mucha verdura", icon: "🥦", hint: "Verdura protagonista" },
  { id: "proteina", name: "Mucha proteína", icon: "💪", hint: "Más de 25 g por ración" },
];

export const prefName = (id: PreferenceId) => PREFERENCES.find((p) => p.id === id)?.name ?? id;

export const DIETS: { id: DietId; name: string; icon: string; hint: string }[] = [
  { id: "omnivora", name: "Sí, como de todo", icon: "🍽️", hint: "Carne, pescado y todo lo demás" },
  { id: "vegetariana", name: "Vegetariana", icon: "🥚", hint: "Sin carne ni pescado" },
  { id: "vegana", name: "Vegana", icon: "🌱", hint: "Nada de origen animal" },
  { id: "pescetariana", name: "Pescetariana", icon: "🐟", hint: "Pescado sí, carne no" },
];

export const MEATS: { id: MeatType; name: string; icon: string }[] = [
  { id: "ternera", name: "Ternera", icon: "🥩" },
  { id: "cerdo", name: "Cerdo", icon: "🐖" },
  { id: "pollo", name: "Pollo y pavo", icon: "🍗" },
  { id: "pescado", name: "Pescado", icon: "🐟" },
  { id: "marisco", name: "Marisco", icon: "🦐" },
];

export const DISLIKES: { id: string; name: string; icon: string }[] = [
  { id: "champinones", name: "Champiñones", icon: "🍄" },
  { id: "aceitunas", name: "Aceitunas", icon: "🫒" },
  { id: "cebolla", name: "Cebolla", icon: "🧅" },
  { id: "berenjena", name: "Berenjena", icon: "🍆" },
  { id: "tofu", name: "Tofu", icon: "⬜" },
  { id: "picante", name: "Picante", icon: "🌶️" },
  { id: "pimiento", name: "Pimiento", icon: "🫑" },
  { id: "ajo", name: "Ajo", icon: "🧄" },
  { id: "coco", name: "Coco", icon: "🥥" },
  { id: "pepino", name: "Pepino", icon: "🥒" },
];

export const APPLIANCES: { id: ApplianceId; name: string; main: boolean }[] = [
  { id: "fuegos", name: "Fuegos / vitro", main: true },
  { id: "horno", name: "Horno", main: true },
  { id: "microondas", name: "Microondas", main: true },
  { id: "freidora", name: "Freidora de aire", main: true },
  { id: "batidora", name: "Batidora", main: false },
  { id: "robot", name: "Robot de cocina", main: false },
  { id: "olla-presion", name: "Olla a presión", main: false },
  { id: "tostadora", name: "Tostadora", main: false },
];

export const applianceName = (id: ApplianceId) => APPLIANCES.find((a) => a.id === id)?.name ?? id;

export const AISLES: { id: AisleId; name: string; icon: string }[] = [
  { id: "fruta-verdura", name: "Fruta y verdura", icon: "🥬" },
  { id: "carne", name: "Carne y charcutería", icon: "🥩" },
  { id: "pescaderia", name: "Pescadería", icon: "🐟" },
  { id: "lacteos-huevos", name: "Lácteos y huevos", icon: "🥚" },
  { id: "conservas", name: "Conservas", icon: "🥫" },
  { id: "pasta-arroz", name: "Pasta y arroz", icon: "🍝" },
  { id: "legumbres", name: "Legumbres", icon: "🫘" },
  { id: "panaderia", name: "Panadería", icon: "🥖" },
  { id: "congelados", name: "Congelados", icon: "🧊" },
  { id: "especias-otros", name: "Especias y otros", icon: "🧂" },
];

export const DAYS = [
  { short: "L", name: "Lunes" },
  { short: "M", name: "Martes" },
  { short: "X", name: "Miércoles" },
  { short: "J", name: "Jueves" },
  { short: "V", name: "Viernes" },
  { short: "S", name: "Sábado" },
  { short: "D", name: "Domingo" },
];

/** Franjas del día, en orden. */
export const SLOTS: { id: MealSlot; name: string; plural: string; icon: string; hint: string; ready: string }[] = [
  { id: "desayuno", name: "Desayuno", plural: "desayunos", icon: "☕", hint: "Para empezar el día", ready: "El desayuno está listo." },
  { id: "comida", name: "Comida", plural: "comidas", icon: "☀️", hint: "Al mediodía", ready: "La comida está lista." },
  { id: "merienda", name: "Merienda", plural: "meriendas", icon: "🍎", hint: "A media tarde", ready: "La merienda está lista." },
  { id: "cena", name: "Cena", plural: "cenas", icon: "🌙", hint: "Por la noche", ready: "La cena está lista." },
];

export const slotName = (id: MealSlot) => SLOTS.find((s) => s.id === id)?.name ?? id;
export const slotOrder = (id: MealSlot) => SLOTS.findIndex((s) => s.id === id);
export const selectedSlots = (meals: Partial<Record<MealSlot, boolean>>) => SLOTS.filter((s) => meals[s.id]);
