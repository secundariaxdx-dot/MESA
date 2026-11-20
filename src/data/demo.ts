import type { Profile } from "@/domain/types";

/** Perfil vacío para empezar el onboarding desde cero. */
export const EMPTY_PROFILE: Profile = {
  name: "",
  countryId: "es",
  supermarketId: "mercadona",
  extraSupermarkets: [],
  multiStore: false,
  adults: 2,
  children: 0,
  days: [0, 1, 2, 3, 4],
  meals: { comida: false, cena: true },
  leftovers: "distintos",
  budget: 50,
  cheapest: false,
  optimizer: true,
  preferences: [],
  diet: "omnivora",
  meats: ["ternera", "cerdo", "pollo", "pescado", "marisco"],
  dislikes: [],
  customDislikes: [],
  allergens: [],
  noAllergies: false,
  appliances: ["fuegos"],
};

/** Perfil de la experiencia de demostración. */
export const DEMO_PROFILE: Profile = {
  ...EMPTY_PROFILE,
  name: "",
  adults: 3,
  children: 0,
  days: [0, 1, 2, 3, 4],
  meals: { comida: false, cena: true },
  budget: 53,
  preferences: ["rapidas", "tradicional"],
  noAllergies: true,
  // El gazpacho necesita batidora: la incluimos junto a fuegos, horno y microondas.
  appliances: ["fuegos", "horno", "microondas", "batidora"],
};

/** Básicos que la demo da por disponibles en casa. */
export const DEMO_PANTRY_STAPLES = ["aceite", "sal", "pimienta"];
