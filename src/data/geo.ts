import type { Country, CountryId, Supermarket } from "@/domain/types";

export const COUNTRIES: Country[] = [
  {
    id: "es",
    name: "España",
    flag: "🇪🇸",
    currency: "EUR",
    locale: "es-ES",
    priceLevel: 1,
    supermarkets: ["mercadona", "lidl-es", "carrefour-es", "dia", "aldi-es", "eroski", "alcampo", "consum"],
  },
  {
    id: "no",
    name: "Noruega",
    flag: "🇳🇴",
    currency: "NOK",
    locale: "nb-NO",
    priceLevel: 15.8,
    supermarkets: ["rema-1000", "kiwi", "coop-extra", "meny"],
  },
  {
    id: "uk",
    name: "Reino Unido",
    flag: "🇬🇧",
    currency: "GBP",
    locale: "en-GB",
    priceLevel: 1.02,
    supermarkets: ["tesco", "sainsburys", "asda", "aldi-uk"],
  },
  {
    id: "us",
    name: "Estados Unidos",
    flag: "🇺🇸",
    currency: "USD",
    locale: "en-US",
    priceLevel: 1.55,
    supermarkets: ["walmart", "kroger", "trader-joes", "whole-foods"],
  },
  {
    id: "fi",
    name: "Finlandia",
    flag: "🇫🇮",
    currency: "EUR",
    locale: "fi-FI",
    priceLevel: 1.32,
    supermarkets: ["k-citymarket", "s-market", "lidl-fi"],
  },
  {
    id: "be",
    name: "Bélgica",
    flag: "🇧🇪",
    currency: "EUR",
    locale: "fr-BE",
    priceLevel: 1.22,
    supermarkets: ["delhaize", "colruyt", "carrefour-be", "aldi-be"],
  },
];

export const SUPERMARKETS: Supermarket[] = [
  { id: "mercadona", name: "Mercadona", countryId: "es", color: "#0E8A4F", priceFactor: 1 },
  { id: "lidl-es", name: "Lidl", countryId: "es", color: "#0050AA", priceFactor: 0.95 },
  { id: "carrefour-es", name: "Carrefour", countryId: "es", color: "#1E3F8F", priceFactor: 1.04 },
  { id: "dia", name: "DIA", countryId: "es", color: "#E2231A", priceFactor: 0.99 },
  { id: "aldi-es", name: "Aldi", countryId: "es", color: "#00205B", priceFactor: 0.94 },
  { id: "eroski", name: "Eroski", countryId: "es", color: "#E30613", priceFactor: 1.08 },
  { id: "alcampo", name: "Alcampo", countryId: "es", color: "#D6001C", priceFactor: 0.98 },
  { id: "consum", name: "Consum", countryId: "es", color: "#F07D00", priceFactor: 1.05 },
  { id: "rema-1000", name: "Rema 1000", countryId: "no", color: "#003B7A", priceFactor: 0.97 },
  { id: "kiwi", name: "Kiwi", countryId: "no", color: "#5DAA2F", priceFactor: 0.98 },
  { id: "coop-extra", name: "Coop Extra", countryId: "no", color: "#E4002B", priceFactor: 1 },
  { id: "meny", name: "Meny", countryId: "no", color: "#A6192E", priceFactor: 1.12 },
  { id: "tesco", name: "Tesco", countryId: "uk", color: "#00539F", priceFactor: 1 },
  { id: "sainsburys", name: "Sainsbury's", countryId: "uk", color: "#F06C00", priceFactor: 1.06 },
  { id: "asda", name: "Asda", countryId: "uk", color: "#78BE20", priceFactor: 0.96 },
  { id: "aldi-uk", name: "Aldi", countryId: "uk", color: "#00205B", priceFactor: 0.9 },
  { id: "walmart", name: "Walmart", countryId: "us", color: "#0071CE", priceFactor: 0.95 },
  { id: "kroger", name: "Kroger", countryId: "us", color: "#134B97", priceFactor: 1 },
  { id: "trader-joes", name: "Trader Joe's", countryId: "us", color: "#C8102E", priceFactor: 1.03 },
  { id: "whole-foods", name: "Whole Foods", countryId: "us", color: "#00674B", priceFactor: 1.25 },
  { id: "k-citymarket", name: "K-Citymarket", countryId: "fi", color: "#FF6A00", priceFactor: 1.02 },
  { id: "s-market", name: "S-Market", countryId: "fi", color: "#00843D", priceFactor: 1 },
  { id: "lidl-fi", name: "Lidl", countryId: "fi", color: "#0050AA", priceFactor: 0.92 },
  { id: "delhaize", name: "Delhaize", countryId: "be", color: "#D2232A", priceFactor: 1.07 },
  { id: "colruyt", name: "Colruyt", countryId: "be", color: "#E2001A", priceFactor: 0.95 },
  { id: "carrefour-be", name: "Carrefour", countryId: "be", color: "#1E3F8F", priceFactor: 1.02 },
  { id: "aldi-be", name: "Aldi", countryId: "be", color: "#00205B", priceFactor: 0.91 },
];

export function getCountry(id: CountryId): Country {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];
}

export function getSupermarket(id: string): Supermarket {
  return SUPERMARKETS.find((s) => s.id === id) ?? SUPERMARKETS[0];
}

export function supermarketsOf(countryId: CountryId): Supermarket[] {
  const c = getCountry(countryId);
  return c.supermarkets.map(getSupermarket);
}
