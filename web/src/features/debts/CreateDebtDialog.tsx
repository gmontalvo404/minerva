import { useEffect, useState } from "react";
import { createDebt } from "../../lib/api";
import type { Language } from "../../lib/i18n";
import { MONTHS } from "../../lib/months";
import { Dialog, Select } from "../../ui";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface CreateDebtDialogProps {
  open: boolean;
  /** debts.json of the active dataset. */
  path: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  onError: (message: string) => void;
  t: Translate;
  language: Language;
}

/** The amounts openCreateDebtDialog puts in the form before showing it. */
const DEFAULTS = {
  name: "",
  capital: "",
  initial_investment: "0",
  term_months: "12",
  annual_interest_rate: "0",
  insurance: "0",
  other_charges: "0",
  link_description: "",
};

type Draft = typeof DEFAULTS;

/**
 * #create-debt-dialog: the whole debt in one form, including the cash flow link
 * it will be paid from.
 *
 * Nothing is validated into shape here beyond what the browser does. The server
 * clamps the term, floors the amounts, caps the initial investment at the
 * capital and slugifies the id, so a debt created from here and one created
 * from the old app land in debts.json identically.
 */
export function CreateDebtDialog({
  open,
  path,
  onClose,
  onCreated,
  onError,
  t,
  language,
}: CreateDebtDialogProps) {
  const [draft, setDraft] = useState<Draft>(DEFAULTS);
  const [year, setYear] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<"reduce_term" | "reduce_payment">("reduce_term");
  const [busy, setBusy] = useState(false);

  // The form resets every time it opens, like openCreateDebtDialog does.
  useEffect(() => {
    if (!open) return;
    setDraft(DEFAULTS);
    setYear(String(new Date().getFullYear()));
    setMonth(MONTHS[new Date().getMonth()]?.folder ?? MONTHS[0]?.folder ?? "01-january");
    setStrategy("reduce_term");
  }, [open]);

  const set = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      onError(t("create_debt_error"));
      return;
    }
    setBusy(true);
    try {
      await createDebt(path, {
        name: draft.name.trim(),
        capital: Number(draft.capital) || 0,
        initial_investment: Number(draft.initial_investment) || 0,
        term_months: Number(draft.term_months) || 1,
        annual_interest_rate: draft.annual_interest_rate.trim() || "0",
        insurance: Number(draft.insurance) || 0,
        other_charges: Number(draft.other_charges) || 0,
        abono_strategy: strategy,
        cash_flow_link: {
          description: draft.link_description.trim(),
          type: "debts",
          start_year: year ?? "",
          start_month: month ?? "",
        },
      });
      onClose();
      await onCreated();
    } catch {
      onError(t("create_debt_error"));
    } finally {
      setBusy(false);
    }
  };

  const text = (key: keyof Draft, label: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="entry-input entry-input--no-spin"
        type="text"
        value={draft[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </label>
  );

  const money = (key: keyof Draft, label: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="entry-input entry-input--amount entry-input--no-spin"
        type="number"
        min={0}
        step={0.01}
        inputMode="decimal"
        value={draft[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </label>
  );

  // populateCreateDebtLinkYearOptions: 2017 through ten years out.
  const lastYear = new Date().getFullYear() + 10;
  const years = Array.from({ length: lastYear - 2017 + 1 }, (_, index) => String(2017 + index));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="create-entry-dialog"
      panelClassName="movement-dialog__panel"
      eyebrow={t("create_debt_eyebrow")}
      title={t("create_debt_title")}
      actions={
        <>
          <button type="button" className="entry-history-button movement-form__cancel" onClick={onClose}>
            {t("create_debt_cancel")}
          </button>
          <button
            type="button"
            className="button button--compact button--entry-add"
            disabled={busy}
            onClick={() => void submit()}
          >
            {t("create_debt_submit")}
          </button>
        </>
      }
    >
      <div className="movement-form__grid">
        {text("name", t("create_debt_name"))}
        {money("capital", t("create_debt_capital"))}
        {money("initial_investment", t("create_debt_initial_investment"))}

        <label className="field">
          <span className="field__label">{t("create_debt_term_months")}</span>
          <input
            className="entry-input entry-input--no-spin"
            type="number"
            min={1}
            max={600}
            step={1}
            inputMode="numeric"
            value={draft.term_months}
            onChange={(event) => set("term_months", event.target.value)}
          />
        </label>

        {text("annual_interest_rate", t("create_debt_annual_interest"))}
        {money("insurance", t("create_debt_insurance"))}
        {money("other_charges", t("create_debt_other_charges"))}

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
            className="entry-input entry-input--no-spin"
            type="text"
            autoComplete="off"
            maxLength={80}
            value={draft.link_description}
            onChange={(event) => set("link_description", event.target.value)}
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
