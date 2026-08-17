/**
 * What is left of the debt module on the client.
 *
 * The amortization, the payment base from the statement and the paid-installment
 * count now live in server.py behind GET /api/debts/detail. Duplicating them
 * here is what made the dashboard show a different installment than the one
 * written into the cash flow, so this file deliberately holds no money math:
 * only the shape the table needs and two presentation helpers.
 */

export interface SchedulePeriod {
  period: number;
  installment: number;
  insurance: number;
  otherCharges: number;
  interest: number;
  principal: number;
  extraPayment: number;
  actualPayment: number;
  totalPayment: number;
  paid: boolean;
  balance: number;
  /** Already formatted by the server, e.g. "04-april 2026". */
  date: string;
}

export interface Debt {
  id: string;
  name: string;
  capital: number;
  financed: number;
  annualRate: number;
  monthlyRate: number;
  termMonths: number;
  effectiveTermMonths: number;
  paidInstallments: number;
  remainingInstallments: number;
  insurance: number;
  otherCharges: number;
  installment: number;
  monthlyPayment: number;
  remainingBalance: number;
  progress: number;
  totalInterest: number;
  link?: { start_year?: string; start_month?: string; description?: string };
  schedule: SchedulePeriod[];
}

/** The name is bilingual in the file; pick the one for the current language. */
export function debtName(
  debt: { id: string; name: string | { es?: string; en?: string } },
  language: "es" | "en",
): string {
  if (typeof debt.name === "string") return debt.name;
  return debt.name?.[language] ?? debt.name?.es ?? debt.name?.en ?? debt.id;
}

export interface DebtTotals {
  count: number;
  monthlyFee: number;
  remainingBalance: number;
  maxRemainingInstallments: number;
  overallProgress: number;
}

/** Sums of what the server already priced, for the KPI row. */
export function debtTotals(debts: Debt[]): DebtTotals {
  // Same measure as each row: capital paid over capital financed.
  const financed = debts.reduce((sum, debt) => sum + debt.financed, 0);
  const remaining = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0);

  return {
    count: debts.length,
    monthlyFee: debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0),
    remainingBalance: debts.reduce((sum, debt) => sum + debt.remainingBalance, 0),
    maxRemainingInstallments: Math.max(...debts.map((debt) => debt.remainingInstallments), 0),
    overallProgress: financed > 0 ? ((financed - remaining) / financed) * 100 : 0,
  };
}

/** formatDebtTermParts: "2 años 3 meses" as one span per part. */
export function debtTermParts(
  months: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  const total = Math.max(Math.round(months), 0);
  const years = Math.floor(total / 12);
  const remaining = total % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(t(years === 1 ? "debt_term_year_one" : "debt_term_year_other", { count: years }));
  }
  if (remaining > 0 || parts.length === 0) {
    parts.push(t(remaining === 1 ? "debt_term_month_one" : "debt_term_month_other", { count: remaining }));
  }
  return parts;
}
