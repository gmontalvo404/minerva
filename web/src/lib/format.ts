/** Number and money formatting. One implementation, used everywhere. */

import type { Language } from "./i18n";

const LOCALE: Record<Language, string> = {
  es: "es-CO",
  en: "en-US",
};

/** formatCurrencySymbol in app.js: "$1.234.567", sign in front, no NBSP. */
function currencySymbol(
  value: number,
  language: Language,
  { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {},
): string {
  const sign = value < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat(LOCALE[language], {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(value));
  return `${sign}$${formatted}`;
}

/** formatCopPlain: just the grouped number, no symbol at all. */
export function formatCopPlain(value: number, language: Language = "es"): string {
  return new Intl.NumberFormat(LOCALE[language], { maximumFractionDigits: 0 }).format(value);
}

export function formatCop(value: number, language: Language = "es"): string {
  return new Intl.NumberFormat(LOCALE[language], {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, language: Language = "es", decimals = 0): string {
  return new Intl.NumberFormat(LOCALE[language], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** formatPercent in app.js: no trailing zeros, two decimals by default. */
export function formatPercent(
  value: number,
  language: Language = "es",
  maximumFractionDigits = 2,
): string {
  return `${new Intl.NumberFormat(LOCALE[language], { maximumFractionDigits }).format(value)}%`;
}

/**
 * Compact money for chart labels, ported from formatShortCopNoCode: the
 * compacted number keeps two decimals only while it has fewer than three
 * integer digits, so it reads $966k and not $965,76k.
 */
export function formatShortCop(value: number, language: Language = "es"): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const compact = (amount: number) => {
    const integerDigits = Math.trunc(amount).toString().length;
    return new Intl.NumberFormat(LOCALE[language], {
      maximumFractionDigits: integerDigits >= 3 ? 0 : 2,
    }).format(amount);
  };

  if (absolute >= 1_000_000) return `${sign}$${compact(absolute / 1_000_000)}M`;
  if (absolute >= 1_000) return `${sign}$${compact(absolute / 1_000)}k`;
  return currencySymbol(value, language);
}

/** formatCopNoCode: the symbol glued to the number, no currency code. */
export function formatCopNoCode(value: number, language: Language = "es"): string {
  return currencySymbol(value, language);
}

/** formatCopNoCodeDetailed: the same with two decimals. */
export function formatCopNoCodeDetailed(value: number, language: Language = "es"): string {
  return currencySymbol(value, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** USD with two decimals, like formatUsd in app.js. */
export function formatUsd(value: number, language: Language = "es"): string {
  return new Intl.NumberFormat(LOCALE[language], {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** A plain FX rate with two decimals, like formatRate in app.js. */
export function formatRate(value: number, language: Language = "es"): string {
  return new Intl.NumberFormat(LOCALE[language], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
