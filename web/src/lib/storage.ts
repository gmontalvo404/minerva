/** localStorage with the same keys the current app uses, so preferences carry over. */

export const STORAGE_KEYS = {
  theme: "cashflow-dashboard-theme",
  language: "cashflow-dashboard-language",
  dataset: "cashflow-dashboard-dataset",
  appMode: "cashflow-dashboard-app-mode",
  /** The year, under the name the original gave it. */
  selectedFile: "cashflow-dashboard-selected-file",
  selectedMonth: "cashflow-dashboard-selected-month",
  viewMode: "cashflow-dashboard-view-mode",
  debtView: "cashflow-dashboard-debt-view",
  annualCurrency: "cashflow-dashboard-annual-table-currency",
  categorySort: "cashflow-dashboard-category-sort",
  categorySortDirection: "cashflow-dashboard-category-sort-direction",
  /** Not in the original: where each section was left scrolled. */
  scroll: "cashflow-dashboard-scroll",
} as const;

/**
 * The year is remembered per dataset, since the demo has its own year names.
 * Same scheme as selectedYearStorageKey: live keeps the bare key.
 */
export function yearKey(dataset: string): string {
  return dataset === "live" ? STORAGE_KEYS.selectedFile : `${STORAGE_KEYS.selectedFile}-${dataset}`;
}

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing or a full quota: preferences just do not persist.
  }
}

/** Reads a value only if it is one of the accepted ones, like the normalize* pairs. */
export function readOption<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const stored = readStorage(key);
  return (allowed as readonly string[]).includes(stored ?? "") ? (stored as T) : fallback;
}
