import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { updateDebt } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import { formatCopNoCodeDetailed, formatNumber, formatPercent, formatUsd } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { MONTHS } from "../../lib/months";
import { Dialog, ViewSwitch } from "../../ui";
import { debtTermParts } from "./calc";

type Translate = (key: string, params?: Record<string, string | number>) => string;
type DetailCurrency = "cop" | "usd";

/** The fields of the left column, each written straight into debts.json. */
type EditableField =
  | "capital"
  | "initial_investment"
  | "annual_interest_rate"
  | "term_months"
  | "insurance"
  | "other_charges";

export interface DebtDetailDialogProps {
  debt: DebtDetail | null;
  name: string;
  /** debts.json of the active dataset. */
  path: string;
  usdCop: number;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onLinkCashFlow: () => void;
  t: Translate;
  language: Language;
}

/** normalizeDebtAmountInput: what the user types, without dots or spaces. */
function parseAmount(value: string): number {
  const clean = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const amount = Number(clean);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function DebtDetailDialog({
  debt,
  name,
  path,
  usdCop,
  onClose,
  onChanged,
  onError,
  onLinkCashFlow,
  t,
  language,
}: DebtDetailDialogProps) {
  const [currency, setCurrency] = useState<DetailCurrency>("cop");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [draft, setDraft] = useState<Partial<Record<EditableField, string>>>({});

  useEffect(() => {
    setDraft({});
  }, [debt?.id]);

  /** formatDebtDetailCurrency: every amount follows the switch. */
  const amount = (value: number) =>
    currency === "usd"
      ? formatUsd(usdCop > 0 ? value / usdCop : 0, language)
      : formatCopNoCodeDetailed(value, language);

  /** formatDebtSchedulePeriodDate: the month name comes from the language. */
  const periodDate = (monthIndex: number | null | undefined, year: number | string | null | undefined) => {
    if (monthIndex === null || monthIndex === undefined) return "";
    const month = MONTHS[monthIndex];
    if (!month) return "";
    const label = language === "en" ? month.en : month.es;
    return year ? `${label} ${year}` : label;
  };

  const save = async (field: EditableField, raw: string) => {
    if (!debt) return;
    const value =
      field === "annual_interest_rate"
        ? raw.trim().replace(",", ".")
        : field === "term_months"
          ? Math.round(Number(raw.replace(/[^\d]/g, "")) || 1)
          : parseAmount(raw);
    try {
      await updateDebt(path, debt.id, { [field]: value });
      await onChanged();
    } catch {
      onError(t("save_entry_error"));
    }
  };

  const editable = (field: EditableField, value: string, className: string) => (
    <input
      className={`debt-input ${className}`}
      type="text"
      inputMode={field === "term_months" ? "numeric" : "decimal"}
      value={draft[field] ?? value}
      onChange={(event) => {
        const typed = event.target.value;
        setDraft((current) => ({ ...current, [field]: typed }));
      }}
      onBlur={(event) => void save(field, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );

  const card = (label: string, value: ReactNode, meta: string, isEditable = false) => (
    <article className={`credit-summary-card${isEditable ? " credit-summary-card--editable" : ""}`} key={label}>
      <p className="credit-summary-card__label">{label}</p>
      {isEditable ? value : <p className="credit-summary-card__value">{value}</p>}
      <span className="credit-summary-card__meta">{meta}</span>
    </article>
  );

  const group = (title: string, cards: ReactNode[]) => (
    <section className="credit-summary-group">
      <h4>{title}</h4>
      <div className="credit-summary-cards">{cards}</div>
    </section>
  );

  /** renderDebtTableHeading: one span per word, so it wraps where it should. */
  const heading = (label: string) => (
    <span className="debt-table-heading">
      {label.trim().split(/\s+/).map((word) => (
        <span key={word}>{word}</span>
      ))}
    </span>
  );

  const money = (value: number) => (currency === "usd" && usdCop > 0 ? value / usdCop : value);
  const inputValue = (value: number) =>
    formatNumber(money(value), language, currency === "usd" ? 2 : 0);

  const rows = debt ? [...debt.schedule].sort((a, b) => (sort === "asc" ? a.period - b.period : b.period - a.period)) : [];

  return (
    <Dialog
      open={Boolean(debt)}
      onClose={onClose}
      variant="debt-detail-dialog"
      panelClassName="debt-detail-dialog__panel"
      eyebrow={t("debt_detail_eyebrow")}
      title={t("debt_detail_title", { debt: name })}
      headActionsClassName="debt-detail-dialog__actions"
      headActions={
        <div className="debt-detail-dialog__currency">
          <div className="debt-detail-toolbar">
            <button
              type="button"
              className="entry-history-button debt-detail-toolbar__action"
              onClick={onLinkCashFlow}
            >
              {t("debt_action_link_cash_flow")}
            </button>
            <ViewSwitch
              label={t("debt_detail_title", { debt: name })}
              variant="debt-detail-currency-switch"
              options={[
                { value: "cop" as DetailCurrency, label: t("currency_cop") },
                { value: "usd" as DetailCurrency, label: t("currency_usd") },
              ]}
              value={currency}
              onChange={setCurrency}
            />
          </div>
        </div>
      }
    >
      <div className="history-dialog__body debt-detail-dialog__body">
        {debt ? (
          <div className="debt-detail-layout">
            <div className="debt-detail-summary-panel">
              <div className="credit-summary-grid">
                {group(t("credit_summary_credit"), [
                  card(
                    t("debt_detail_capital"),
                    editable("capital", inputValue(debt.capital), "debt-input--detail-money"),
                    t("credit_summary_meta_capital"),
                    true,
                  ),
                  card(
                    t("debt_detail_initial_investment"),
                    editable(
                      "initial_investment",
                      inputValue(debt.initial_investment),
                      "debt-input--detail-money",
                    ),
                    t("credit_summary_meta_initial_investment"),
                    true,
                  ),
                  card(
                    t("debt_detail_annual_interest"),
                    editable(
                      "annual_interest_rate",
                      String(debt.annual_interest_rate),
                      "debt-input--rate debt-input--detail-rate",
                    ),
                    t("credit_summary_meta_annual_interest"),
                    true,
                  ),
                  card(
                    t("debt_detail_term_months"),
                    editable("term_months", String(debt.term_months), "debt-input--count debt-input--detail-term"),
                    t("credit_summary_meta_term_months"),
                    true,
                  ),
                  card(
                    t("debt_detail_insurance"),
                    editable("insurance", inputValue(debt.insurance), "debt-input--detail-money"),
                    t("credit_summary_meta_insurance_input"),
                    true,
                  ),
                  card(
                    t("debt_detail_other_charges"),
                    editable("other_charges", inputValue(debt.other_charges), "debt-input--detail-money"),
                    t("credit_summary_meta_other_charges_input"),
                    true,
                  ),
                ])}

                {group(t("credit_summary_costs"), [
                  card(t("debt_detail_actual_payment"), amount(debt.monthly_payment), t("credit_summary_meta_actual_payment")),
                  card(t("debt_detail_final_capital"), amount(debt.financed_capital), t("credit_summary_meta_final_capital")),
                  card(
                    t("debt_detail_monthly_interest"),
                    formatPercent(debt.monthly_interest_rate * 100, language, 5),
                    t("credit_summary_meta_monthly_interest"),
                  ),
                  card(
                    t("debt_detail_term_years"),
                    debtTermParts(debt.effective_term_months || debt.term_months, t).join(" "),
                    t("credit_summary_meta_term_years"),
                  ),
                  card(
                    t("debt_detail_installment_plus_insurance"),
                    amount(debt.installment + debt.insurance),
                    t("credit_summary_meta_installment_plus_insurance"),
                  ),
                  card(t("debt_detail_total_insurance"), amount(debt.total_insurance), t("credit_summary_meta_total_insurance")),
                  card(
                    t("debt_detail_total_other_charges"),
                    amount(debt.total_other_charges),
                    t("credit_summary_meta_total_other_charges"),
                  ),
                  card(t("debt_detail_total_interest"), amount(debt.total_interest), t("credit_summary_meta_total_interest")),
                  card(t("debt_detail_total"), amount(debt.total), t("credit_summary_meta_total")),
                ])}
              </div>
            </div>

            <div className="debt-detail-schedule-panel">
              <div className="debt-detail-schedule-panel__head">
                <p className="card__eyebrow">{t("debt_detail_schedule_eyebrow")}</p>
                <h3 className="debt-detail-schedule-panel__title">{t("debt_detail_schedule_title")}</h3>
              </div>

              <div className="table-scroll debt-detail-table-wrap">
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
                      <th>{t("debt_detail_date")}</th>
                      <th>{t("debt_detail_paid")}</th>
                      <th>{heading(t("debt_detail_total_payment"))}</th>
                      <th>{heading(t("debt_detail_actual_payment"))}</th>
                      <th>{heading(t("debt_detail_extra_payment"))}</th>
                      <th>{t("debt_detail_balance")}</th>
                      <th>{t("debt_detail_principal")}</th>
                      <th>{t("debt_detail_interest")}</th>
                      <th>{t("debt_detail_installment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      // Period 0 is the capital before the first installment: it
                      // only has cells when an abono landed before the plan.
                      const preSchedule = row.period === 0 && row.extra_payment > 0;
                      const blank = row.period === 0 && !preSchedule;
                      return (
                        <tr key={row.period}>
                          <td>{row.period}</td>
                          <td>
                            {row.period === 0
                              ? preSchedule
                                ? periodDate(row.pre_schedule_month_index, row.pre_schedule_year)
                                : ""
                              : periodDate(row.month_index, row.year)}
                          </td>
                          <td>{blank ? "" : <PaidStatus paid={row.paid} t={t} />}</td>
                          <td>{row.period === 0 ? "" : amount(row.total_payment)}</td>
                          <td>{row.period === 0 ? "" : amount(row.actual_payment)}</td>
                          <td>{blank ? "" : amount(row.extra_payment)}</td>
                          <td>{amount(row.balance)}</td>
                          <td>{amount(row.principal)}</td>
                          <td>{amount(row.interest)}</td>
                          <td>{amount(row.installment)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

/** renderDebtPaidStatus: a check or a dash, with the state as its label. */
function PaidStatus({ paid, t }: { paid: boolean; t: Translate }) {
  const label = paid ? t("debt_detail_paid_yes") : t("debt_detail_paid_no");
  return (
    <span
      className={`debt-paid-status ${paid ? "debt-paid-status--paid" : "debt-paid-status--unpaid"}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d={paid ? "M3.5 8.4 L6.6 11.5 L12.5 4.8" : "M4.5 8 H11.5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
