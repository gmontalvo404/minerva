import { useCallback, useEffect, useState } from "react";
import { getUsdCopRate, simulateDebt } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import { formatCopNoCodeDetailed, formatPercent, formatUsd } from "../../lib/format";
import { translate } from "../../lib/i18n";
import type { Language } from "../../lib/i18n";
import { Panel, ViewSwitch } from "../../ui";
import { debtTermParts } from "../debts/calc";

export interface CreditPageProps {
  language: Language;
  onSidebar: (node: React.ReactNode) => void;
}

type Field = "capital" | "initial" | "rate" | "term" | "insurance" | "other";

const DEFAULTS: Record<Field, string> = {
  capital: "20000000",
  initial: "0",
  rate: "20",
  term: "12",
  insurance: "0",
  other: "0",
};

/** parseDebtAmountInput: what is typed, minus the grouping the browser shows. */
function toNumber(value: string): number {
  const parsed = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Keeps digits and, where they make sense, a single decimal separator.
 *
 * These are `type="text"` fields — the original ones are too — so nothing stops
 * a letter from landing in them. Filtering here means a typed letter never
 * shows up at all: the state never takes it, so React puts the field back.
 */
function onlyNumeric(value: string, decimals: boolean): string {
  if (!decimals) return value.replace(/\D/g, "");

  const cleaned = value.replace(/[^\d.,]/g, "");
  const separator = cleaned.search(/[.,]/);
  if (separator === -1) return cleaned;
  return cleaned.slice(0, separator + 1) + cleaned.slice(separator + 1).replace(/[.,]/g, "");
}

/**
 * The credit simulator, on the same markup as #credit-simulator-panel: the form
 * card and the summary card side by side, then the schedule underneath.
 *
 * Nothing is priced here. The numbers come from /api/debts/simulate, which runs
 * the very engine that prices the real debts.
 */
export function CreditPage({ language, onSidebar }: CreditPageProps) {
  const t = useCallback(
    (key: string, params: Record<string, string | number> = {}) => translate(language, key, params),
    [language],
  );

  const [form, setForm] = useState<Record<Field, string>>(DEFAULTS);
  const [simulation, setSimulation] = useState<DebtDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [currency, setCurrency] = useState<"cop" | "usd">("cop");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [usdCop, setUsdCop] = useState(0);

  // #credit-view-controls: the section has a single view, so its button is
  // pressed and inert. It is there to say where you are.
  useEffect(() => {
    onSidebar(
      <div className="control-sidebar__credit-view">
        <div className="field control-sidebar__view">
          <span className="field__label">{t("view_label")}</span>
          <section className="control-sidebar__months">
            <button
              type="button"
              className="month-button control-sidebar__annual-button is-active"
              aria-pressed="true"
              aria-disabled="true"
              tabIndex={-1}
            >
              {t("app_section_credit")}
            </button>
          </section>
        </div>
      </div>,
    );
  }, [onSidebar, t]);

  useEffect(() => {
    void getUsdCopRate()
      .then((rate) => setUsdCop(Number(rate.rate) || 0))
      .catch(() => setUsdCop(0));
  }, []);

  useEffect(() => {
    let cancelled = false;
    simulateDebt({
      capital: toNumber(form.capital),
      initial_investment: toNumber(form.initial),
      annual_interest_rate: form.rate,
      term_months: Math.max(1, Math.round(toNumber(form.term))),
      insurance: toNumber(form.insurance),
      other_charges: toNumber(form.other),
    })
      .then((result) => {
        if (cancelled) return;
        setSimulation(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [form]);

  /** formatCreditSimulatorCurrency: every amount follows the switch. */
  const amount = (value: number) =>
    currency === "usd"
      ? formatUsd(usdCop > 0 ? value / usdCop : 0, language)
      : formatCopNoCodeDetailed(value, language);

  const field = (key: Field, label: string, numeric = false) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className={`entry-input entry-input--amount${numeric ? " entry-input--no-spin" : ""}`}
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "numeric" : "decimal"}
        {...(numeric ? { min: 1, max: 600, step: 1 } : {})}
        value={form[key]}
        onChange={(event) => {
          const typed = onlyNumeric(event.target.value, !numeric);
          setForm((current) => ({ ...current, [key]: typed }));
        }}
        // The term is a number input: the browser lets "e" and the signs
        // through, and those are the only letters that could get here.
        onKeyDown={
          numeric
            ? (event) => {
                if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
              }
            : undefined
        }
      />
    </label>
  );

  const card = (label: string, value: string, meta: string) => (
    <article className="credit-summary-card" key={label}>
      <p className="credit-summary-card__label">{label}</p>
      <p className="credit-summary-card__value">{value}</p>
      <span className="credit-summary-card__meta">{meta}</span>
    </article>
  );

  const group = (title: string, cards: React.ReactNode[]) => (
    <section className="credit-summary-group">
      <h4>{title}</h4>
      <div className="credit-summary-cards">{cards}</div>
    </section>
  );

  /** renderDebtTableHeading: one span per word, so the column stays narrow. */
  const heading = (label: string) => (
    <span className="debt-table-heading">
      {label.trim().split(/\s+/).map((word) => (
        <span key={word}>{word}</span>
      ))}
    </span>
  );

  const rows = [...(simulation?.schedule ?? [])].sort((left, right) =>
    sort === "asc" ? left.period - right.period : right.period - left.period,
  );

  return (
    <Panel
      eyebrow={t("credit_section_eyebrow")}
      title={t("credit_title")}
      note={failed ? t("load_error_title") : t("credit_note")}
    >
      <div className="chart-grid credit-simulator-layout">
        <article className="card credit-simulator-input-card">
          <div className="card__head">
            <div>
              <p className="card__eyebrow">{t("credit_form_eyebrow")}</p>
              <h3>{t("credit_form_title")}</h3>
            </div>
          </div>
          <form className="credit-simulator-form" onSubmit={(event) => event.preventDefault()}>
            {field("capital", t("create_debt_capital"))}
            {field("initial", t("create_debt_initial_investment"))}
            {field("rate", t("create_debt_annual_interest"))}
            {field("term", t("create_debt_term_months"), true)}
            {field("insurance", t("create_debt_insurance"))}
            {field("other", t("create_debt_other_charges"))}
          </form>
        </article>

        <article className="card credit-simulator-summary-card">
          <div className="card__head card__head--detail">
            <div>
              <p className="card__eyebrow">{t("credit_summary_eyebrow")}</p>
              <h3>{t("credit_summary_title")}</h3>
            </div>
            <div className="debt-detail-dialog__currency">
              <div className="debt-detail-toolbar">
                <span className="debt-detail-toolbar__label">{t("debt_detail_currency")}</span>
                <ViewSwitch
                  label={t("debt_detail_currency")}
                  variant="debt-detail-currency-switch"
                  options={[
                    { value: "cop" as const, label: t("currency_cop") },
                    { value: "usd" as const, label: t("currency_usd") },
                  ]}
                  value={currency}
                  onChange={setCurrency}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="credit-summary-grid">
              {group(t("credit_summary_credit"), [
                card(t("debt_detail_capital"), amount(simulation?.capital ?? 0), t("credit_summary_meta_capital")),
                card(
                  t("debt_detail_initial_investment"),
                  amount(simulation?.initial_investment ?? 0),
                  t("credit_summary_meta_initial_investment"),
                ),
                card(
                  t("debt_detail_final_capital"),
                  amount(simulation?.financed_capital ?? 0),
                  t("credit_summary_meta_final_capital"),
                ),
                card(t("debt_detail_annual_interest"), `${form.rate || "0"}%`, t("credit_summary_meta_annual_interest")),
                card(
                  t("debt_detail_monthly_interest"),
                  formatPercent((simulation?.monthly_interest_rate ?? 0) * 100, language, 5),
                  t("credit_summary_meta_monthly_interest"),
                ),
                card(
                  t("debt_detail_term_years"),
                  debtTermParts(simulation?.term_months ?? 0, t).join(" "),
                  t("credit_summary_meta_term_years"),
                ),
              ])}

              {group(t("credit_summary_costs"), [
                card(
                  t("debt_detail_actual_payment"),
                  amount(simulation?.monthly_payment ?? 0),
                  t("credit_summary_meta_actual_payment"),
                ),
                card(
                  t("debt_detail_installment_plus_insurance"),
                  amount((simulation?.installment ?? 0) + (simulation?.insurance ?? 0)),
                  t("credit_summary_meta_installment_plus_insurance"),
                ),
                card(
                  t("debt_detail_total_insurance"),
                  amount(simulation?.total_insurance ?? 0),
                  t("credit_summary_meta_total_insurance"),
                ),
                card(
                  t("debt_detail_total_other_charges"),
                  amount(simulation?.total_other_charges ?? 0),
                  t("credit_summary_meta_total_other_charges"),
                ),
                card(
                  t("debt_detail_total_interest"),
                  amount(simulation?.total_interest ?? 0),
                  t("credit_summary_meta_total_interest"),
                ),
                card(t("debt_detail_total"), amount(simulation?.total ?? 0), t("credit_summary_meta_total")),
              ])}
            </div>
          </div>
        </article>
      </div>

      <article className="card">
        <div className="card__head card__head--detail">
          <div>
            <p className="card__eyebrow">{t("credit_schedule_eyebrow")}</p>
            <h3>{t("credit_schedule_title")}</h3>
          </div>
        </div>
        <div className="table-scroll debt-detail-table-wrap credit-simulator-table-wrap">
          <table className="data-table data-table--debt-detail">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="debt-sort-button"
                    onClick={() => setSort((current) => (current === "asc" ? "desc" : "asc"))}
                  >
                    <span>{t("debt_detail_period")}</span>
                  </button>
                </th>
                <th>{t("debt_detail_installment")}</th>
                <th>{t("debt_detail_insurance")}</th>
                <th>{heading(t("debt_detail_other_charges"))}</th>
                <th>{t("debt_detail_interest")}</th>
                <th>{t("debt_detail_principal")}</th>
                <th>{t("debt_detail_balance")}</th>
                <th>{heading(t("debt_detail_actual_payment"))}</th>
                <th>{heading(t("debt_detail_total_payment"))}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{amount(row.installment)}</td>
                  <td>{amount(row.insurance)}</td>
                  <td>{amount(row.other_charges)}</td>
                  <td>{amount(row.interest)}</td>
                  <td>{amount(row.principal)}</td>
                  <td>{amount(row.balance)}</td>
                  {/* Period 0 is the capital before the first installment. */}
                  <td>{row.period === 0 ? "" : amount(row.actual_payment)}</td>
                  <td>{row.period === 0 ? "" : amount(row.total_payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </Panel>
  );
}
