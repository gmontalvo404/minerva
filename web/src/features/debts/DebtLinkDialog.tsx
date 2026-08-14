import { useEffect, useState } from "react";
import { getDebtLinks, updateDebt } from "../../lib/api";
import type { DebtDetail, LinkedPayment } from "../../lib/api";
import { formatCopNoCode } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { MONTHS } from "../../lib/months";
import { Dialog, Select } from "../../ui";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface DebtLinkDialogProps {
  debt: DebtDetail | null;
  path: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (message: string) => void;
  t: Translate;
  language: Language;
}

/**
 * #debt-link-dialog: which cash flow row pays this debt. It shows what the
 * current link is catching, so changing the description is not a blind edit.
 */
export function DebtLinkDialog({ debt, path, onClose, onSaved, onError, t, language }: DebtLinkDialogProps) {
  const link = debt?.cash_flow_link;
  const [description, setDescription] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<"reduce_term" | "reduce_payment">("reduce_term");
  const [current, setCurrent] = useState<LinkedPayment[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!debt) return;
    setDescription(link?.description ?? "");
    setYear(link?.start_year ?? String(new Date().getFullYear()));
    setMonth(link?.start_month ?? MONTHS[0]?.folder ?? "01-january");
    setStrategy(debt.abono_strategy === "reduce_payment" ? "reduce_payment" : "reduce_term");

    if (!String(link?.description ?? "").trim()) {
      setCurrent(null);
      return;
    }
    setCurrent(null);
    void getDebtLinks(path, debt.id)
      .then(setCurrent)
      .catch(() => setCurrent([]));
  }, [debt, link?.description, link?.start_year, link?.start_month, path]);

  const save = async (updates: Parameters<typeof updateDebt>[2]) => {
    if (!debt) return;
    setBusy(true);
    try {
      await updateDebt(path, debt.id, updates);
      onClose();
      await onSaved();
    } catch {
      onError(t(updates.cash_flow_link === null ? "debt_link_clear_error" : "debt_link_error"));
    } finally {
      setBusy(false);
    }
  };

  // populateDebtLinkYearOptions: from 2017 to ten years out, plus whatever the
  // link already points at.
  const linkedYear = Number(link?.start_year);
  const lastYear = Math.max(new Date().getFullYear() + 10, Number.isInteger(linkedYear) ? linkedYear : 0);
  const years = Array.from({ length: lastYear - 2017 + 1 }, (_, index) => String(2017 + index));

  return (
    <Dialog
      open={Boolean(debt)}
      onClose={onClose}
      variant="create-entry-dialog"
      panelClassName="movement-dialog__panel"
      eyebrow={t("debt_link_eyebrow")}
      title={t("debt_link_title")}
      actions={
        <>
          <button type="button" className="entry-history-button movement-form__cancel" onClick={onClose}>
            {t("debt_link_cancel")}
          </button>
          <button
            type="button"
            className="button button--compact button--entry-add"
            disabled={busy}
            onClick={() =>
              void save({
                cash_flow_link: {
                  description: description.trim(),
                  type: "debts",
                  start_year: year ?? "",
                  start_month: month ?? "",
                },
                abono_strategy: strategy,
              })
            }
          >
            {t("debt_link_submit")}
          </button>
        </>
      }
    >
      {String(link?.description ?? "").trim() ? (
        <section className="debt-link-current">
          <div className="debt-link-current__head">
            <div>
              <p className="card__eyebrow">{t("debt_link_current_eyebrow")}</p>
              <h4 className="debt-link-current__description">{link?.description}</h4>
            </div>
            <button
              type="button"
              className="entry-history-button debt-link-current__clear"
              disabled={busy}
              onClick={() => void save({ cash_flow_link: null })}
            >
              {t("debt_link_clear")}
            </button>
          </div>

          {current === null ? (
            <ul className="debt-link-current__list">
              <li className="debt-link-current__item debt-link-current__item--loading">{t("debt_link_loading")}</li>
            </ul>
          ) : current.length === 0 ? (
            <p className="debt-link-current__empty">{t("debt_link_current_empty")}</p>
          ) : (
            <ul className="debt-link-current__list">
              {current.map((payment) => {
                const label = MONTHS[payment.month_index];
                return (
                  <li className="debt-link-current__item" key={`${payment.year}-${payment.period}-${payment.month_index}`}>
                    <span className="debt-link-current__month">
                      <span className="debt-link-current__period">
                        {payment.pre_schedule ? "·" : `#${payment.period}`}
                      </span>
                      <span>
                        {label ? (language === "en" ? label.en : label.es) : ""}
                        {payment.year ? ` · ${payment.year}` : ""}
                      </span>
                    </span>
                    <span className="debt-link-current__amount">
                      {formatCopNoCode(payment.amount_cop + payment.abono_amount_cop, language)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <div className="movement-form__grid">
        <label className="field">
          <span className="field__label">{t("debt_link_year")}</span>
          <div className="entry-select-shell">
            <Select
              label={t("debt_link_year")}
              wrapperClassName={null}
              menuVariant="pretty-select-menu--year"
              searchable
              options={years.map((value) => ({ value, label: value }))}
              value={year}
              onChange={setYear}
            />
          </div>
        </label>

        <label className="field">
          <span className="field__label">{t("debt_link_month")}</span>
          <div className="entry-select-shell">
            <Select
              label={t("debt_link_month")}
              wrapperClassName={null}
              options={MONTHS.map((item) => ({
                value: item.folder,
                label: language === "en" ? item.en : item.es,
              }))}
              value={month}
              onChange={setMonth}
            />
          </div>
        </label>

        <label className="field movement-form__full">
          <span className="field__label">{t("debt_link_name")}</span>
          <input
            className="entry-input"
            type="text"
            autoComplete="off"
            maxLength={80}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="field__hint">{t("debt_link_name_hint")}</span>
        </label>

        <div className="field movement-form__full">
          <span className="field__label">{t("debt_abono_strategy_label")}</span>
          <div className="entry-select-shell">
            <Select
              label={t("debt_abono_strategy_label")}
              wrapperClassName={null}
              options={[
                { value: "reduce_term" as const, label: t("debt_abono_strategy_term") },
                { value: "reduce_payment" as const, label: t("debt_abono_strategy_payment") },
              ]}
              value={strategy}
              onChange={setStrategy}
            />
          </div>
          <span className="field__hint">{t("debt_abono_strategy_meta")}</span>
        </div>
      </div>
    </Dialog>
  );
}
