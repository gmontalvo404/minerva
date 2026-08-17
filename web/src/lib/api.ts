/**
 * The only place that talks to server.py. Features call these functions; they
 * never build a fetch by hand, so error handling stays in one place.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) return payload.error;
  } catch {
    // The server answered with something that is not JSON.
  }
  return `${response.status} ${response.statusText}`;
}

/** Reads a JSON file served from the data folders. */
export async function getJson<T>(path: string, options: { fallback?: T } = {}): Promise<T> {
  const response = await fetch(`/${path}`, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    if (options.fallback !== undefined && response.status === 404) {
      return options.fallback;
    }
    throw new ApiError(await readError(response), response.status);
  }

  return (await response.json()) as T;
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  return (await response.json()) as T;
}

export interface OkResponse {
  ok: true;
  path?: string;
}

/**
 * FNV-1a over the UTF-8 bytes, matching server.py's _content_hash. The plan is
 * saved whole, so every save names the version it was based on; the server
 * refuses a save whose base is no longer the file, instead of letting a stale
 * tab resurrect an old plan over a newer one.
 */
export function contentHash(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let value = 0x811c9dc5;
  for (const byte of bytes) {
    value ^= byte;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, "0");
}

/** The meal plan and the hash of the exact bytes it was read from. */
export async function getNutritionPlan<T>(
  path: string,
  fallback: T,
): Promise<{ document: T; hash: string | null }> {
  const response = await fetch(`/${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 404) return { document: fallback, hash: null };
    throw new ApiError(await readError(response), response.status);
  }
  const text = await response.text();
  return { document: JSON.parse(text) as T, hash: contentHash(text) };
}

/**
 * Saves the whole meal plan document. `baseHash` names the version this save
 * was built on; the server answers 409 if the file has moved on, and the
 * caller must re-read instead of overwriting.
 */
export function saveNutritionPlan(
  path: string,
  document: unknown,
  baseHash?: string | null,
): Promise<OkResponse & { hash?: string }> {
  return post<OkResponse & { hash?: string }>("/api/nutrition/save", {
    path,
    document,
    ...(baseHash ? { base_hash: baseHash } : {}),
  });
}

export interface EntryUpdates {
  description?: string;
  category?: string;
  paid?: boolean;
  amount_cop?: number;
  linked_debts?: string[];
  /** The server moves the entry between types with target_type, not "type". */
  target_type?: string;
}

export function updateEntry(path: string, entryIndex: number, updates: EntryUpdates) {
  return post<OkResponse>("/api/entries/update", {
    path,
    entry_index: entryIndex,
    updates,
  });
}

export function reorderEntry(path: string, entryIndex: number, targetIndex: number) {
  return post<OkResponse>("/api/entries/reorder", {
    path,
    entry_index: entryIndex,
    target_index: targetIndex,
  });
}

export function reorderDebt(
  path: string,
  debtId: string,
  targetDebtId: string,
  position: "before" | "after",
) {
  return post<OkResponse & { order: string[] }>("/api/debts/reorder", {
    path,
    debt_id: debtId,
    target_debt_id: targetDebtId,
    position,
  });
}

export function createEntry(path: string, entry: Record<string, unknown>, insertAfterIndex?: number) {
  return post<OkResponse>("/api/entries/create", {
    path,
    entry,
    ...(insertAfterIndex === undefined ? {} : { insert_after_index: insertAfterIndex }),
  });
}

export function deleteEntry(path: string, entryIndex: number) {
  return post<OkResponse>("/api/entries/delete", { path, entry_index: entryIndex });
}

export interface IncomeUpdates {
  description?: string;
  amount_usd?: number;
  usd_cop?: number;
  amount_cop?: number;
  received?: boolean;
}

/**
 * Which of the three amounts the user typed. The server recomputes the other
 * two from the row's rate, so the file never holds a contradiction and neither
 * client has to know the formula.
 */
export type IncomeSyncField = "amount_usd" | "usd_cop" | "amount_cop";

export function updateIncome(
  path: string,
  monthIndex: number,
  incomeIndex: number,
  updates: IncomeUpdates,
  syncFrom?: IncomeSyncField,
) {
  return post<OkResponse>("/api/incomes/update", {
    path,
    month_index: monthIndex,
    income_index: incomeIndex,
    updates,
    ...(syncFrom ? { sync_from: syncFrom } : {}),
  });
}

export function createIncome(path: string, monthIndex: number, entry: Record<string, unknown>) {
  return post<OkResponse>("/api/incomes/create", { path, month_index: monthIndex, entry });
}

export function deleteIncome(path: string, monthIndex: number, incomeIndex: number) {
  return post<OkResponse>("/api/incomes/delete", {
    path,
    month_index: monthIndex,
    income_index: incomeIndex,
  });
}

export function reorderIncome(
  path: string,
  monthIndex: number,
  incomeIndex: number,
  targetIndex: number,
) {
  return post<OkResponse>("/api/incomes/reorder", {
    path,
    month_index: monthIndex,
    income_index: incomeIndex,
    target_index: targetIndex,
  });
}

/** A debt with its schedule and totals, computed by server.py. */
export interface DebtDetail {
  id: string;
  name: string | { es?: string; en?: string };
  capital: number;
  initial_investment: number;
  financed_capital: number;
  annual_interest_rate: number;
  monthly_interest_rate: number;
  term_months: number;
  effective_term_months: number;
  insurance: number;
  other_charges: number;
  installment: number;
  monthly_payment: number;
  paid_installments: number;
  remaining_installments: number;
  remaining_balance: number;
  progress: number;
  total_interest: number;
  cash_flow_link?: { start_year?: string; start_month?: string; description?: string };
  /** reduce_term (default) or reduce_payment: what an abono shortens. */
  abono_strategy?: "reduce_term" | "reduce_payment";
  total_insurance: number;
  total_other_charges: number;
  total: number;
  schedule: Array<{
    period: number;
    installment: number;
    insurance: number;
    other_charges: number;
    interest: number;
    principal: number;
    extra_payment: number;
    actual_payment: number;
    total_payment: number;
    paid: boolean;
    balance: number;
    date: string;
    /** The view puts the month name on these, since it knows the language. */
    month_index: number | null;
    year: number | null;
    pre_schedule_month_index?: number | null;
    pre_schedule_year?: string;
    pre_schedule_count?: number;
  }>;
}

/**
 * The debts, priced by the server. Nothing here recomputes an installment:
 * that math lives in server.py so every client shows the same number.
 */
export interface LinkedPayment {
  period: number;
  pre_schedule: boolean;
  amount_cop: number;
  abono_amount_cop: number;
  paid: boolean;
  month_index: number;
  year: string;
}

/** Every movement that pays a debt, across the years its plan spans. */
export async function getDebtLinks(path: string, debtId: string): Promise<LinkedPayment[]> {
  const query = new URLSearchParams({ path, debt_id: debtId });
  const response = await fetch(`/api/debts/links?${query}`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  const payload = (await response.json()) as { payments?: LinkedPayment[] };
  return payload.payments ?? [];
}

export interface DebtUpdates {
  capital?: number;
  initial_investment?: number;
  insurance?: number;
  other_charges?: number;
  annual_interest_rate?: string | number;
  term_months?: number;
  paid_installments?: number;
  abono_strategy?: "reduce_term" | "reduce_payment";
  cash_flow_link?: { description?: string; type?: string; start_year?: string; start_month?: string } | null;
}

/** updateDebtFields: the debt file is written by the server, which then resyncs. */
export function updateDebt(path: string, debtId: string, updates: DebtUpdates) {
  return post<OkResponse & { changes?: Record<string, unknown> }>("/api/debts/update", {
    path,
    debt_id: debtId,
    updates,
  });
}

/** What the create form sends. The server normalizes and assigns the id. */
export interface NewDebt {
  name: string;
  capital: number;
  initial_investment: number;
  term_months: number;
  annual_interest_rate: string;
  insurance: number;
  other_charges: number;
  abono_strategy: "reduce_term" | "reduce_payment";
  cash_flow_link: { description: string; type: "debts"; start_year: string; start_month: string };
}

export function createDebt(path: string, debt: NewDebt) {
  return post<OkResponse & { debt_id: string; debt_index: number }>("/api/debts/create", {
    path,
    debt,
  });
}

export async function getDebtsDetail(path: string): Promise<DebtDetail[]> {
  // No year: the server reads every year the plan spans, so what a debt owes
  // does not change with the year on screen.
  const response = await fetch(`/api/debts/detail?path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  const payload = (await response.json()) as { debts?: DebtDetail[] };
  return payload.debts ?? [];
}

/** A year of cash flow, already aggregated by server.py. */
export interface DashboardMonth {
  index: number;
  folder: string;
  name: string;
  income_cop: number;
  income_usd: number;
  usd_cop: number;
  incomes: Array<{
    description: string;
    amount_usd?: number;
    usd_cop?: number;
    amount_cop: number;
    received?: boolean;
  }>;
  entries: Array<Record<string, unknown> & { source_path: string; source_index: number }>;
  total_outcomes: number;
  paid_outcomes: number;
  free: number;
  after_paid: number;
  /** The budget table, already priced: label key, pesos, dollars and share. */
  summary_rows: Array<{ label: string; cop: number; usd: number; ratio: number }>;
  /** Each annual metric in dollars, at this month's own rate. */
  usd: Record<string, number>;
  by_type: Record<string, number>;
  display_types: Record<string, number>;
  by_category: Array<{ category: string; total: number }>;
}

/** The total column of the annual table, in both currencies. */
export interface AnnualTotal {
  cop: number;
  usd: number;
}

export interface DashboardAnnual {
  income_cop: number;
  income_usd: number;
  total_outcomes: number;
  free: number;
  totals: Record<string, AnnualTotal>;
  average_free: number;
  average_fx: number;
  categories_count: number;
  by_type: Record<string, number>;
  display_types: Record<string, number>;
  by_category: Array<{ category: string; total: number }>;
}

export interface Dashboard {
  years: string[];
  year: string;
  months: DashboardMonth[];
  annual: DashboardAnnual | null;
}

/**
 * The dashboard, computed by the server. The client no longer sums anything:
 * buildDashboard lived in app.js and was copied here, and the two copies had to
 * agree on what "free" means and which type absorbs the leftover.
 */
export async function getDashboard(cashFlowRoot: string, year?: string): Promise<Dashboard> {
  const query = new URLSearchParams({ path: cashFlowRoot });
  if (year) query.set("year", year);

  const response = await fetch(`/api/dashboard?${query.toString()}`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return (await response.json()) as Dashboard;
}

export interface DataStamp {
  /** Moves when any data file was saved. */
  data: string;
  /** Moves when a new web build landed in dist. */
  app: string;
}

/**
 * Two opaque change markers: the newest data-file mtime (someone saved — this
 * tab, another one, or the iPhone through the outbox) and the build's own
 * (a new front shipped, the page reloads itself). null when the server is
 * unreachable or predates the endpoint, and polling just waits.
 */
export async function getDataStamp(): Promise<DataStamp | null> {
  try {
    const response = await fetch("/api/data/stamp", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { stamp?: unknown; app?: unknown };
    if (typeof payload.stamp !== "string") return null;
    return { data: payload.stamp, app: typeof payload.app === "string" ? payload.app : "0" };
  } catch {
    return null;
  }
}

export interface ShoppingLine {
  id: string;
  name: string;
  unit: string;
  /** Every label of the ingredient. `category` is the same list, joined. */
  categories: string[];
  category: string;
  store: string;
  qty: number;
  price: number;
  total: number;
}

/**
 * Everything the week costs: the shopping list, what each meal costs and the
 * four KPIs. All of it priced by the server, so no client multiplies a price
 * by a quantity on its own.
 */
export interface NutritionCosts {
  lines: ShoppingLine[];
  total: number;
  mealCosts: Record<string, number>;
  weeklyCost: number;
  dailyAverage: number;
  assignedMeals: number;
  totalSlots: number;
}

export const EMPTY_NUTRITION_COSTS: NutritionCosts = {
  lines: [],
  total: 0,
  mealCosts: {},
  weeklyCost: 0,
  dailyAverage: 0,
  assignedMeals: 0,
  totalSlots: 0,
};

export async function getShoppingList(planPath: string): Promise<NutritionCosts> {
  const response = await fetch(`/api/nutrition/shopping?path=${encodeURIComponent(planPath)}`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  const payload = (await response.json()) as {
    lines?: ShoppingLine[];
    total?: number;
    meal_costs?: Record<string, number>;
    weekly_cost?: number;
    daily_average?: number;
    assigned_meals?: number;
    total_slots?: number;
  };
  return {
    lines: payload.lines ?? [],
    total: payload.total ?? 0,
    mealCosts: payload.meal_costs ?? {},
    weeklyCost: payload.weekly_cost ?? 0,
    dailyAverage: payload.daily_average ?? 0,
    assignedMeals: payload.assigned_meals ?? 0,
    totalSlots: payload.total_slots ?? 0,
  };
}

export interface SimulationInput {
  capital: number;
  initial_investment: number;
  annual_interest_rate: string;
  term_months: number;
  insurance: number;
  other_charges: number;
}

/** The simulator asks the server: same engine that prices a real debt. */
export async function simulateDebt(input: SimulationInput): Promise<DebtDetail> {
  const query = new URLSearchParams(
    Object.entries(input).map(([key, value]) => [key, String(value)]),
  );
  const response = await fetch(`/api/debts/simulate?${query.toString()}`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  const payload = (await response.json()) as { simulation: DebtDetail };
  return payload.simulation;
}

export interface UsdCopRate {
  ok: boolean;
  rate: number;
  fetched_at: string;
}

export async function getUsdCopRate(): Promise<UsdCopRate> {
  const response = await fetch("/api/fx/usd-cop");
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return (await response.json()) as UsdCopRate;
}
