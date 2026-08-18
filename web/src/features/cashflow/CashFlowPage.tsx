import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDataStamp, getDebtsDetail, getJson } from "../../lib/api";
import type { DataStamp, DebtDetail } from "../../lib/api";
import { cashFlowRoot, debtsPath, SHARED_ROOT } from "../../lib/dataset";
import type { Dataset } from "../../lib/dataset";
import {
  formatCop,
  formatCopNoCode,
  formatNumber,
  formatPercent,
  formatRate,
  formatShortCop,
  formatUsd,
} from "../../lib/format";
import { buildCategoryOptions, getCategoryLabel } from "../../lib/categories";
import { translate } from "../../lib/i18n";
import type { Language } from "../../lib/i18n";
import { MONTHS } from "../../lib/months";
import { readOption, readStorage, STORAGE_KEYS, writeStorage, yearKey } from "../../lib/storage";
import {
  CardPanel,
  ViewSwitch,
  DataTable,
  Donut,
  EmptyState,
  FreeBars,
  KpiCard,
  KpiGrid,
  MonthNav,
  Panel,
  Select,
} from "../../ui";
import type { Column, DonutSegment } from "../../ui";
import { AnnualTable } from "./AnnualTable";
import type { AnnualCurrency } from "./AnnualTable";
import { AddEntryDialog, AddIncomeDialog } from "./AddDialogs";
import { EntriesTable, TYPE_META } from "./EntriesTable";
import { HistoryDialog } from "./HistoryDialog";
import { IncomesTable } from "./IncomesTable";
import { loadDashboard } from "./load";
import type { EntryType, IncomeEntry, MonthSummary, YearSummary } from "./types";

type ViewMode = "annual" | `${number}`;

export interface CashFlowPageProps {
  dataset: Dataset;
  language: Language;
  onSidebar: (node: React.ReactNode) => void;
}


/** TYPE_DISPLAY_ORDER: savings leads, the rest keep their order. */
const TYPE_DISPLAY_ORDER: EntryType[] = ["savings", "needs", "wants", "debts"];

interface SummaryRow {
  label: string;
  cop: number;
  usd: number;
  ratio: number;
  rowClass?: string;
}

export function CashFlowPage({ dataset, language, onSidebar }: CashFlowPageProps) {
  const t = useCallback(
    (key: string, params: Record<string, string | number> = {}) => translate(language, key, params),
    [language],
  );

  // Years are remembered together with the dataset they came from: without
  // that pair, switching Live/Demo loads the other dataset's year for an
  // instant and the whole dashboard shows zeros until you reload.
  const [discovery, setDiscovery] = useState<{ dataset: Dataset; years: string[] } | null>(null);
  /** Which dataset the year in state belongs to. A ref, so it is not a dependency. */
  const yearOwner = useRef(dataset);
  const [year, setYear] = useState<string | null>(() => readStorage(yearKey(dataset)));
  const [summary, setSummary] = useState<YearSummary | null>(null);
  // Which tab you were on is a preference, like in the original: the annual
  // view and the month index are two separate keys.
  const [view, setView] = useState<ViewMode>(() => {
    if (readOption(STORAGE_KEYS.viewMode, ["annual", "monthly"] as const, "monthly") === "annual") {
      return "annual";
    }
    const stored = Number(readStorage(STORAGE_KEYS.selectedMonth));
    const month = Number.isInteger(stored) && stored >= 0 && stored < 12 ? stored : new Date().getMonth();
    return String(month) as ViewMode;
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [currency, setCurrency] = useState<AnnualCurrency>(() =>
    readOption(STORAGE_KEYS.annualCurrency, ["cop", "usd"] as const, "cop"),
  );
  const [categorySort, setCategorySort] = useState<"name" | "value">(() =>
    readOption(STORAGE_KEYS.categorySort, ["name", "value"] as const, "name"),
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() =>
    readOption(STORAGE_KEYS.categorySortDirection, ["asc", "desc"] as const, "asc"),
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.viewMode, view === "annual" ? "annual" : "monthly");
    if (view !== "annual") writeStorage(STORAGE_KEYS.selectedMonth, view);
  }, [view]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.annualCurrency, currency);
  }, [currency]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.categorySort, categorySort);
    writeStorage(STORAGE_KEYS.categorySortDirection, sortDirection);
  }, [categorySort, sortDirection]);

  /** Clicking the active button flips its direction, like the original. */
  const chooseSort = (next: "name" | "value") => {
    if (next === categorySort) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setCategorySort(next);
    setSortDirection(next === "value" ? "desc" : "asc");
  };
  const [categories, setCategories] = useState<string[]>([]);
  /** For linking a movement to a debt; their balances refresh with the rest. */
  const [debts, setDebts] = useState<DebtDetail[]>([]);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [incomeHistory, setIncomeHistory] = useState<IncomeEntry | null>(null);

  // One request brings the years, the chosen year and its aggregates, so the
  // dataset and the year can never be out of step. A silent load repaints
  // without the spinner, and if it fails it keeps what is already on screen.
  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        const requested = yearOwner.current === dataset ? year : readStorage(yearKey(dataset));
        const result = await loadDashboard(dataset, requested, language);
        setDiscovery({ dataset, years: result.years });
        yearOwner.current = dataset;
        setYear(result.year || null);
        if (result.year) writeStorage(yearKey(dataset), result.year);
        setSummary(result.summary);
        setDebts(await getDebtsDetail(debtsPath(dataset)).catch(() => []));
      } catch {
        if (silent) return;
        setSummary(null);
        setStatus(t("load_error_title"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [dataset, year, language, t],
  );
  const reload = useCallback(() => load(false), [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // The data can change underneath this tab: the iPhone through the outbox,
  // another tab beside it. Poll the cheap stamp and re-read silently when it
  // moves — never mid-typing, and not while the tab is hidden.
  useEffect(() => {
    let last: DataStamp | null = null;
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }
      const stamp = await getDataStamp();
      if (!alive || stamp === null) return;
      if (last !== null && stamp.app !== last.app) {
        // Llegó un build nuevo del front: la pestaña se renueva sola.
        window.location.reload();
        return;
      }
      if (last !== null && stamp.data !== last.data) void load(true);
      last = stamp;
    };
    const interval = window.setInterval(() => void tick(), 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const years = discovery?.dataset === dataset ? discovery.years : [];

  // The category picker offers the shared catalog. This is a plain file read,
  // not a computation, so it stays on the client.
  useEffect(() => {
    void getJson<{ categories?: Array<{ name?: string }> }>(`${SHARED_ROOT}/categories.json`, {
      fallback: { categories: [] },
    }).then((document) => {
      setCategories(
        (document.categories ?? [])
          .map((item) => String(item.name ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),
      );
    });
  }, []);

  // The sidebar belongs to the shell, its contents belong to the section.
  useEffect(() => {
    onSidebar(
      <div className="control-sidebar__cash-flow">
        <div className="control-sidebar__controls">
          <div className="field">
            <span className="field__label">{t("year_label")}</span>
            <Select
              label={t("year_label")}
              menuVariant="pretty-select-menu--year"
              options={years.map((value) => ({ value, label: value }))}
              value={year}
              onChange={setYear}
            />
          </div>
        </div>

        <div className="field control-sidebar__view">
          <span className="field__label">{t("view_label")}</span>
          <section className="control-sidebar__months">
            <button
              type="button"
              className={`month-button control-sidebar__annual-button${view === "annual" ? " is-active" : ""}`}
              onClick={() => setView("annual")}
            >
              {t("view_annual")}
            </button>
            <MonthNav
              options={MONTHS.map((month) => ({
                value: String(month.index) as ViewMode,
                label: (language === "en" ? month.en : month.es).slice(0, 3),
              }))}
              value={view === "annual" ? null : view}
              onChange={setView}
            />
          </section>
        </div>
      </div>,
    );
  }, [onSidebar, years, year, view, language, t]);

  // The picker offers the catalog plus the categories the month already uses, so
  // an entry outside the catalog still shows its own value selected. It lives up
  // here because the renders below it return early and a hook cannot.
  const categoryOptions = useMemo(() => {
    const active = view === "annual" ? null : (summary?.months[Number(view)] ?? null);
    const used = (active?.entries ?? []).map((entry) => entry.category);
    return buildCategoryOptions(categories, used, language);
  }, [categories, summary, view, language]);

  const percent = (ratio: number) => formatPercent(ratio, language, 1);

  /** The CATEGORIES panel: same bar-list markup for the year and the month. */
  const categoriesPanel = (
    totals: Array<{ category: string; total: number }>,
    heads: { eyebrow: string; title: string } = {
      eyebrow: t("categories_eyebrow"),
      title: t("annual_categories_title"),
    },
  ) => {
    const labelled = totals.map((item) => ({
      ...item,
      label: getCategoryLabel(item.category, language),
    }));
    const locale = language === "en" ? "en-US" : "es-CO";
    const byName = (a: { label: string }, b: { label: string }) =>
      a.label.localeCompare(b.label, locale, { sensitivity: "base" });

    const sorted = [...labelled].sort((a, b) => {
      if (categorySort === "name") {
        return sortDirection === "desc" ? -byName(a, b) : byName(a, b);
      }
      if (a.total !== b.total) {
        return sortDirection === "desc" ? b.total - a.total : a.total - b.total;
      }
      return byName(a, b);
    });
    const max = Math.max(...sorted.map((item) => item.total), 1);

    return (
      <CardPanel
        eyebrow={heads.eyebrow}
        title={heads.title}
        actions={
          <div className="sort-controls">
            <span className="sort-controls__label">{t("category_sort_label")}</span>
            <ViewSwitch
              variant="view-switch--sort"
              options={[
                {
                  value: "name" as const,
                  label: t(
                    categorySort !== "name" || sortDirection === "asc"
                      ? "category_sort_name_asc"
                      : "category_sort_name_desc",
                  ),
                },
                {
                  value: "value" as const,
                  label: t(
                    categorySort !== "value" || sortDirection === "desc"
                      ? "category_sort_value_desc"
                      : "category_sort_value_asc",
                  ),
                },
              ]}
              value={categorySort}
              onChange={chooseSort}
              label={t("category_sort_label")}
              dataAttribute="category-sort"
            />
          </div>
        }
      >
        {sorted.length === 0 ? (
          <EmptyState title={t("no_movements_title")} message={t("no_categories_to_show")} />
        ) : (
          <div className="bar-list">
            <div className="bar-list__grid">
              {sorted.map((item) => (
                <div
                  className="bar-row"
                  key={item.category}
                  title={`${item.label}: ${formatCopNoCode(item.total, language)}`}
                >
                  <div className="bar-row__frame">
                    <div className="bar-row__track" />
                    <div
                      className="bar-row__fill"
                      style={{
                        height: `${(item.total / max) * 88}%`,
                        // getCategoryBarPalette: the leftover bar is green.
                        ["--bar-fill-start" as string]:
                          item.category.toLowerCase() === "free"
                            ? "var(--positive-bar-start)"
                            : "var(--category-bar-start)",
                        ["--bar-fill-end" as string]:
                          item.category.toLowerCase() === "free"
                            ? "var(--positive-bar-end)"
                            : "var(--category-bar-end)",
                      }}
                    />
                  </div>
                  <div className="bar-row__name">{item.label}</div>
                  <div className="bar-row__value">{formatShortCop(item.total, language)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardPanel>
    );
  };

  /** buildMonthlySegments: the display totals plus a deficit slice when negative. */
  const donutSegments = (totals: Record<EntryType, number>, free?: number): DonutSegment[] => {
    const segments: DonutSegment[] = TYPE_DISPLAY_ORDER.map((type) => ({
      key: type,
      label: t(TYPE_META[type].labelKey),
      value: totals[type],
      color: TYPE_META[type].color,
      display: formatCopNoCode(totals[type], language),
    }));

    if (free !== undefined && free < 0) {
      segments.push({
        key: "deficit",
        label: t("deficit_label"),
        value: Math.abs(free),
        color: "#2a3140",
        display: formatCopNoCode(Math.abs(free), language),
      });
    }
    return segments;
  };

  if (loading && !summary) {
    return (
      <Panel eyebrow={t("app_section_cash_flow")} title={t("status_loading")}>
        <p className="section-head__note">{t("status_loading")}</p>
      </Panel>
    );
  }

  if (!summary) {
    return (
      <Panel eyebrow={t("app_section_cash_flow")} title={t("no_data_title")}>
        <EmptyState title={t("no_data_title")} message={t("no_categories_to_show")} />
      </Panel>
    );
  }

  const month: MonthSummary | null = view === "annual" ? null : (summary.months[Number(view)] ?? null);

  // Same columns and cell classes as renderMonthlyEntriesTable.
  // Same columns as renderMonthlyIncomesTable.
  const summaryColumns: Column<SummaryRow>[] = [
    { key: "concept", header: t("monthly_summary_concept"), render: (row) => row.label },
    {
      key: "cop",
      header: t("monthly_summary_cop"),
      render: (row) => formatCopNoCode(row.cop, language),
    },
    {
      key: "usd",
      header: t("monthly_summary_usd"),
      render: (row) => formatUsd(row.usd, language),
    },
    {
      key: "share",
      header: t("monthly_summary_income_share"),
      render: (row) => percent(row.ratio),
    },
  ];

  /**
   * The budget table. The server sends the rows already priced and shared out;
   * this only turns the label it chose into the text on screen.
   */
  const rowLabel = (key: string): string => {
    if (key === "incomes") return t("monthly_summary_incomes");
    if (key === "after_paid") return t("monthly_summary_after_paid");
    if (key === "deficit") return t("deficit_label");
    const type = TYPE_DISPLAY_ORDER.find((candidate) => candidate === key);
    return type ? t(TYPE_META[type].labelKey) : key;
  };

  const summaryRows = (item: MonthSummary): SummaryRow[] =>
    item.summaryRows.map((row) => ({
      label: rowLabel(row.label),
      cop: row.cop,
      usd: row.usd,
      ratio: row.ratio,
      ...(row.label === "deficit" ? { rowClass: "is-summary" } : {}),
    }));

  if (view === "annual") {
    return (
      <Panel
        id="annual-panel"
        eyebrow={t("annual_section_eyebrow")}
        title={translate(language, "annual_title", { year: summary.year })}
        note={status ?? t("annual_note")}
      >
        <KpiGrid>
          <KpiCard
            label={t("kpi_total_income")}
            value={formatCop(summary.incomeCop, language)}
            meta={t("accumulated", { value: formatUsd(summary.incomeUsd, language) })}
          />
          <KpiCard
            label={t("kpi_outcomes_active")}
            value={formatCop(summary.totalOutcomes, language)}
            meta={t("categories_registered", { count: summary.categoriesCount })}
          />
          <KpiCard
            label={t("kpi_annual_free")}
            value={formatCop(summary.free, language)}
            meta={summary.free >= 0 ? t("positive_balance") : t("negative_balance")}
          />
          <KpiCard
            label={t("kpi_monthly_average")}
            value={formatCop(summary.averageFree, language)}
            meta={t("average_fx", { value: formatRate(summary.averageFx, language) })}
          />
        </KpiGrid>

        <div className="chart-grid chart-grid--annual">
          <CardPanel eyebrow={t("annual_free_eyebrow")} title={t("annual_free_title")}>
            <FreeBars
              items={summary.months.map((item) => ({
                key: item.folder,
                label: item.label.slice(0, 3),
                value: item.free,
                display: formatShortCop(item.free, language),
              }))}
            />
          </CardPanel>

          <CardPanel eyebrow={t("distribution_eyebrow")} title={t("annual_distribution_title")}>
            <Donut
              segments={donutSegments(summary.displayTypes)}
              emptyTitle={t("no_data_title")}
              emptyMessage={t("no_positive_values")}
              formatPercent={percent}
            />
          </CardPanel>
        </div>

        {categoriesPanel(summary.byCategory)}

        <CardPanel
          eyebrow={t("detail_eyebrow")}
          title={t("annual_table_title")}
          actions={
            <div className="sort-controls">
              <span className="sort-controls__label">{t("annual_table_currency_label")}</span>
              <ViewSwitch
                options={[
                  { value: "cop" as AnnualCurrency, label: t("currency_cop") },
                  { value: "usd" as AnnualCurrency, label: t("currency_usd") },
                ]}
                variant="view-switch--sort"
                value={currency}
                onChange={setCurrency}
                label={t("annual_table_currency_label")}
                dataAttribute="annual-currency"
              />
            </div>
          }
        >
          <AnnualTable
            months={summary.months}
            totals={summary.totals}
            currency={currency}
            language={language}
            labels={{
              metric: t("annual_table_metric"),
              total: t("annual_table_total"),
              income: t("annual_table_income"),
              outcomes: t("annual_table_outcomes"),
              free: t("annual_table_free"),
              type: (type) => t(`annual_table_${type}`),
            }}
          />
        </CardPanel>
      </Panel>
    );
  }

  return (
    <Panel eyebrow={t("monthly_section_eyebrow")} title={`${month?.label ?? ""} ${summary.year}`}>
      {month ? (
        <>
          <KpiGrid>
            <KpiCard
              label={t("kpi_incomes")}
              value={formatCop(month.incomeCop, language)}
              meta={`${formatUsd(month.incomeUsd, language)} | FX ${formatRate(month.usdCop, language)}`}
            />
            <KpiCard
              label={t("kpi_outcomes_active")}
              value={formatCop(month.totalOutcomes, language)}
              meta={t("active_movements", { count: month.entries.length })}
            />
            <KpiCard
              label={t("available_label")}
              value={formatCop(month.free, language)}
              meta={month.free >= 0 ? t("free_to_assign") : t("monthly_overdraft")}
            />
            <KpiCard
              label={t("active_categories")}
              value={formatNumber(month.byCategory.length, language)}
              meta={t("active_categories_note")}
            />
          </KpiGrid>

          <div className="chart-grid chart-grid--monthly">
            <CardPanel eyebrow={t("monthly_budget_eyebrow")} title={t("monthly_budget_title")}>
              <DataTable
                columns={summaryColumns}
                rows={summaryRows(month)}
                rowKey={(row) => row.label}
                rowProps={(row) => ({ className: row.rowClass })}
                caption={t("monthly_budget_title")}
              />
            </CardPanel>

            <CardPanel eyebrow={t("distribution_eyebrow")} title={t("monthly_distribution_title")}>
              <Donut
                segments={donutSegments(month.displayTypes, month.free)}
                emptyTitle={t("no_data_title")}
                emptyMessage={t("no_positive_values")}
                formatPercent={percent}
              />
            </CardPanel>
          </div>

          <CardPanel
            eyebrow={t("monthly_incomes_eyebrow")}
            title={t("monthly_incomes_title")}
            detailHead
            note={t("monthly_incomes_note")}
            actions={
              <button
                type="button"
                className="button button--compact button--entry-add"
                onClick={() => setAddIncomeOpen(true)}
              >
                {t("add_income_button")}
              </button>
            }
          >
            <IncomesTable
              incomes={month.incomes}
              path={`${cashFlowRoot(dataset)}/${summary.year}/incomes/incomes.json`}
              monthIndex={month.index}
              language={language}
              t={t}
              onChanged={reload}
              onError={setStatus}
              onHistory={setIncomeHistory}
            />
          </CardPanel>

          {categoriesPanel(month.byCategory, {
            eyebrow: t("monthly_outcomes_eyebrow"),
            title: t("monthly_outcomes_title"),
          })}

          <CardPanel
            eyebrow={t("monthly_detail_eyebrow")}
            title={t("monthly_detail_title")}
            detailHead
            note={t("monthly_detail_note")}
            actions={
              <button
                type="button"
                className="button button--compact button--entry-add"
                onClick={() => setAddEntryOpen(true)}
              >
                {t("add_entry_button")}
              </button>
            }
          >
            <EntriesTable
              entries={month.entries}
              categoryOptions={categoryOptions}
              debts={debts}
              usdCop={month.usdCop}
              language={language}
              t={t}
              onChanged={reload}
              onError={setStatus}
            />
          </CardPanel>

          <AddIncomeDialog
            open={addIncomeOpen}
            onClose={() => setAddIncomeOpen(false)}
            path={`${cashFlowRoot(dataset)}/${summary.year}/incomes/incomes.json`}
            monthIndex={month.index}
            t={t}
            onCreated={reload}
            onError={setStatus}
          />

          <HistoryDialog
            entry={
              incomeHistory
                ? ({
                    ...incomeHistory,
                    amount_cop: Number(incomeHistory.amount_cop) || 0,
                    sourcePath: "",
                    sourceIndex: 0,
                  } as never)
                : null
            }
            onClose={() => setIncomeHistory(null)}
            t={t}
            language={language}
            kind="income"
          />

          <AddEntryDialog
            open={addEntryOpen}
            onClose={() => setAddEntryOpen(false)}
            path={`${cashFlowRoot(dataset)}/${summary.year}/outcomes/${month.folder}.json`}
            categoryOptions={categoryOptions}
            debts={debts}
            language={language}
            t={t}
            onCreated={reload}
            onError={setStatus}
          />
        </>
      ) : null}
    </Panel>
  );
}
