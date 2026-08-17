/**
 * Adapts what GET /api/dashboard returns to the shapes the components use.
 *
 * There is deliberately no arithmetic here. Discovering the years, summing the
 * months, deciding which type absorbs the leftover and aggregating categories
 * all happen in server.py, so the two dashboards can never disagree.
 */
import { getDashboard } from "../../lib/api";
import type { DashboardMonth } from "../../lib/api";
import { cashFlowRoot } from "../../lib/dataset";
import type { Dataset } from "../../lib/dataset";
import { MONTHS, monthLabel } from "../../lib/months";
import type { Language } from "../../lib/i18n";
import { ENTRY_TYPES } from "./types";
import type { EntryType, MonthSummary, PlacedEntry, YearSummary } from "./types";

function typeTotals(raw: Record<string, number>): Record<EntryType, number> {
  return {
    needs: raw.needs ?? 0,
    wants: raw.wants ?? 0,
    savings: raw.savings ?? 0,
    debts: raw.debts ?? 0,
  };
}

function toMonth(month: DashboardMonth, language: Language): MonthSummary {
  const meta = MONTHS[month.index]!;
  return {
    index: month.index,
    folder: month.folder,
    label: monthLabel(meta, language),
    incomeCop: month.income_cop,
    usdCop: month.usd_cop,
    incomeUsd: month.income_usd,
    incomes: month.incomes,
    entries: month.entries.map((entry) => {
      const { source_path: sourcePath, source_index: sourceIndex, ...rest } = entry;
      return { ...rest, sourcePath, sourceIndex } as unknown as PlacedEntry;
    }),
    totalOutcomes: month.total_outcomes,
    paidOutcomes: month.paid_outcomes,
    free: month.free,
    // Empty defaults so an old server still running answers with a table
    // missing rows instead of a blank page.
    afterPaid: month.after_paid ?? 0,
    summaryRows: month.summary_rows ?? [],
    usd: month.usd ?? {},
    byType: typeTotals(month.by_type),
    displayTypes: typeTotals(month.display_types),
    byCategory: month.by_category,
  };
}

export async function loadDashboard(
  dataset: Dataset,
  year: string | null,
  language: Language,
): Promise<{ years: string[]; year: string; summary: YearSummary | null }> {
  const dashboard = await getDashboard(cashFlowRoot(dataset), year ?? undefined);

  if (!dashboard.annual) {
    return { years: dashboard.years, year: dashboard.year, summary: null };
  }

  const months = dashboard.months.map((month) => toMonth(month, language));
  const annual = dashboard.annual;

  return {
    years: dashboard.years,
    year: dashboard.year,
    summary: {
      year: dashboard.year,
      months,
      byCategory: annual.by_category,
      incomeCop: annual.income_cop,
      incomeUsd: annual.income_usd,
      totalOutcomes: annual.total_outcomes,
      free: annual.free,
      averageFree: annual.average_free,
      averageFx: annual.average_fx,
      categoriesCount: annual.categories_count,
      totals: annual.totals ?? {},
      byType: typeTotals(annual.by_type),
      displayTypes: typeTotals(annual.display_types),
    },
  };
}

export { ENTRY_TYPES };
