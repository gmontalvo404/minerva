import { formatCopPlain, formatUsd } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import type { EntryType, MonthSummary } from "./types";

/** TYPE_DISPLAY_ORDER in app.js: savings leads. */
const DISPLAY_ORDER: EntryType[] = ["savings", "needs", "wants", "debts"];

export type AnnualCurrency = "cop" | "usd";

export interface AnnualTableProps {
  months: MonthSummary[];
  /** The total column, both currencies, keyed by metric. Priced by the server. */
  totals: Record<string, { cop: number; usd: number }>;
  currency: AnnualCurrency;
  language: Language;
  labels: {
    metric: string;
    total: string;
    income: string;
    outcomes: string;
    free: string;
    type: (type: EntryType) => string;
  };
}

interface Row {
  /** Also the key the server files this metric under, in `usd` and `totals`. */
  key: string;
  label: string;
  chipClass: string;
  valueClass: (month: MonthSummary) => string;
  amount: (month: MonthSummary) => number;
}

/**
 * The comparison table, transposed like the original: one row per metric, one
 * column per month, plus a total column.
 *
 * Nothing converts here. Each month arrives with its amounts in both
 * currencies, converted at its own rate, and the total column arrives priced
 * too — the same numbers the old dashboard shows.
 */
export function AnnualTable({ months, totals, currency, language, labels }: AnnualTableProps) {
  const useUsd = currency === "usd";

  const toDisplay = (month: MonthSummary, row: Row): string =>
    useUsd
      ? formatUsd(month.usd[row.key] ?? 0, language)
      : formatCopPlain(row.amount(month), language);

  const totalOf = (row: Row): string => {
    const total = totals[row.key];
    return useUsd
      ? formatUsd(total?.usd ?? 0, language)
      : formatCopPlain(total?.cop ?? 0, language);
  };

  const rows: Row[] = [
    {
      key: "income",
      label: labels.income,
      chipClass: "annual-concept-chip--income",
      valueClass: () => "annual-value annual-value--income",
      amount: (month) => month.incomeCop,
    },
    {
      key: "outcomes",
      label: labels.outcomes,
      chipClass: "annual-concept-chip--outcomes",
      valueClass: () => "annual-value",
      amount: (month) => month.totalOutcomes,
    },
    {
      key: "free",
      label: labels.free,
      chipClass: "annual-concept-chip--free",
      valueClass: (month) =>
        `annual-value ${month.free < 0 ? "annual-value--negative" : "annual-value--positive"}`,
      amount: (month) => month.free,
    },
    ...DISPLAY_ORDER.map((type): Row => ({
      key: type,
      label: labels.type(type),
      chipClass: `annual-concept-chip--${type}`,
      valueClass: () => `annual-type-pill annual-type-pill--${type}`,
      // getAnnualTypeAmount: only wants shows the display total, which absorbs
      // the month's leftover.
      amount: (month) => (type === "wants" ? month.displayTypes.wants : month.byType[type]),
    })),
  ];

  return (
    <div className="table-scroll">
      <table className="data-table data-table--annual">
        <colgroup>
          <col className="annual-col-metric" />
          {months.map((month) => (
            <col className="annual-col-month" key={month.folder} />
          ))}
          <col className="annual-col-month annual-col-total" />
        </colgroup>
        <thead>
          <tr>
            <th>{labels.metric}</th>
            {months.map((month) => (
              <th className="annual-head-month" key={month.folder}>
                {month.label}
              </th>
            ))}
            <th className="annual-head-month annual-head-month--total">{labels.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="annual-cell annual-cell--concept">
                <span className={`annual-concept-chip ${row.chipClass}`}>{row.label}</span>
              </td>
              {months.map((month) => (
                <td className="annual-cell annual-cell--numeric" key={month.folder}>
                  <span className={row.valueClass(month)}>{toDisplay(month, row)}</span>
                </td>
              ))}
              <td className="annual-cell annual-cell--numeric annual-cell--total">
                <span className={row.valueClass(months[0] ?? ({} as MonthSummary))}>{totalOf(row)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
