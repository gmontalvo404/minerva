/** The shape of the cash flow files under <dataset>/cash_flow/<year>/. */

export const ENTRY_TYPES = ["needs", "wants", "savings", "debts"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export interface OutcomeEntry {
  description: string;
  category?: string;
  amount_cop: number;
  type?: EntryType;
  paid?: boolean;
  /** Legacy flag, still present in older files. */
  active?: boolean;
  auto_generated?: boolean;
  linked_debts?: string[];
  extra_payment?: boolean;
}

export interface IncomeEntry {
  description: string;
  amount_usd?: number;
  usd_cop?: number;
  amount_cop: number;
  received?: boolean;
}

export interface IncomeMonth {
  name?: string;
  month_id?: string;
  income_usd?: number;
  usd_cop?: number;
  income_cop?: number;
  entries?: IncomeEntry[];
}

export interface IncomesDocument {
  months?: IncomeMonth[];
}

export interface OutcomesDocument {
  entries?: OutcomeEntry[];
}

/** An expense with the file and position it came from, so it can be written back. */
export type PlacedEntry = OutcomeEntry & { sourcePath: string; sourceIndex: number };

/**
 * One row of the monthly budget table. `label` is the i18n key the server
 * chose; the amounts and the share of income come priced from there.
 */
export interface SummaryRow {
  label: string;
  cop: number;
  usd: number;
  ratio: number;
}

/** One month, already normalized and priced. */
export interface MonthSummary {
  index: number;
  folder: string;
  label: string;
  incomeCop: number;
  usdCop: number;
  incomeUsd: number;
  incomes: IncomeEntry[];
  entries: PlacedEntry[];
  totalOutcomes: number;
  paidOutcomes: number;
  free: number;
  /** Income minus what is already paid, worked out by the server. */
  afterPaid: number;
  /** The budget table rows, priced and shared out by the server. */
  summaryRows: SummaryRow[];
  /** Each annual metric in dollars, at this month's own rate. */
  usd: Record<string, number>;
  byType: Record<EntryType, number>;
  /** buildMonthlyDisplayTypes: wants absorbs the leftover, for charts and tables. */
  displayTypes: Record<EntryType, number>;
  byCategory: Array<{ category: string; total: number }>;
}

export interface YearSummary {
  year: string;
  months: MonthSummary[];
  byCategory: Array<{ category: string; total: number }>;
  incomeCop: number;
  incomeUsd: number;
  totalOutcomes: number;
  free: number;
  averageFree: number;
  /** Average of the monthly FX rates, for the "Average FX" meta. */
  averageFx: number;
  categoriesCount: number;
  /** The total column of the annual table, in both currencies. */
  totals: Record<string, { cop: number; usd: number }>;
  byType: Record<EntryType, number>;
  displayTypes: Record<EntryType, number>;
}
