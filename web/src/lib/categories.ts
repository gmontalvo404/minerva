/**
 * CATEGORY_LABELS from app.js: the display name of each category per language.
 * A category with no entry here shows its raw name, like getCategoryLabel does.
 */
import type { Language } from "./i18n";

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  "Food": { es: "Comida", en: "Food" },
  "Market": { es: "Mercado", en: "Market" },
  "Cash": { es: "Efectivo", en: "Cash" },
  "Fuel": { es: "Combustible", en: "Fuel" },
  "Gift": { es: "Regalos", en: "Gift" },
  "Housing": { es: "Vivienda", en: "Housing" },
  "Motorcycle": { es: "Moto", en: "Motorcycle" },
  "Entertainment": { es: "Entretenimiento", en: "Entertainment" },
  "Clothing": { es: "Ropa", en: "Clothing" },
  "Technology": { es: "Tecnología", en: "Technology" },
  "Travel": { es: "Viajes", en: "Travel" },
  "Health": { es: "Salud", en: "Health" },
  "Finances": { es: "Finanzas", en: "Finances" },
  "Pets": { es: "Mascotas", en: "Pets" },
  "Mascotas": { es: "Mascotas", en: "Pets" },
  "Donations": { es: "Donaciones", en: "Donations" },
  "Restaurant": { es: "Restaurantes", en: "Restaurant" },
  "Education": { es: "Educación", en: "Education" },
  "Taxes": { es: "Impuestos", en: "Taxes" },
  "Incomes": { es: "Ingresos", en: "Incomes" },
  "Free": { es: "Dinero libre", en: "Free" },
  "Family": { es: "Familia", en: "Family" },
  "Loan": { es: "Préstamo", en: "Loan" },
  "Saving": { es: "Ahorro", en: "Saving" },
  "Debt": { es: "Deuda", en: "Debt" },
  "Social Security": { es: "Seguridad social", en: "Social Security" },
  "Emergency fund": { es: "Fondo de emergencia", en: "Emergency fund" },
  "Retirement": { es: "Retiro", en: "Retirement" },
  "Personal care": { es: "Cuidado personal", en: "Personal care" },
  "Trips": { es: "Viajes", en: "Trips" },
  "Farmacy": { es: "Farmacia", en: "Farmacy" },
  "I don't know": { es: "No sé", en: "I don't know" },
  "Supermarket": { es: "Supermercado", en: "Supermarket" },
  "Bakery": { es: "Panadería", en: "Bakery" },
  "GYM": { es: "Gimnasio", en: "GYM" },
  "Wants": { es: "Deseos", en: "Wants" },
  "Housekeeper": { es: "Aseo del hogar", en: "Housekeeper" },
};

export function getCategoryLabel(category: string, language: Language): string {
  const normalized = String(category ?? "").trim();
  const translation = CATEGORY_LABELS[normalized];
  if (!translation) return normalized;
  return translation[language] || translation.en || normalized;
}

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * getAvailableCategoryNames: the shared catalog plus whatever the month already
 * uses, sorted by the label the user reads. Without the second half a movement
 * whose category is not in the catalog opens its picker with nothing selected.
 */
export function buildCategoryOptions(
  catalog: string[],
  used: Iterable<string | undefined | null>,
  language: Language,
): CategoryOption[] {
  const names = new Set<string>();
  for (const name of [...catalog, ...used]) {
    const clean = String(name ?? "").trim();
    if (clean) names.add(clean);
  }

  const locale = language === "en" ? "en-US" : "es-CO";
  return [...names]
    .map((name) => ({ value: name, label: getCategoryLabel(name, language) }))
    .sort((left, right) => left.label.localeCompare(right.label, locale, { sensitivity: "base" }));
}
