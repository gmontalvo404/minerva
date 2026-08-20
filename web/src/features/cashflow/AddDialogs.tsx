import { useEffect, useState } from "react";
import { createEntry, createIncome, getUsdCopRate } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import type { CategoryOption } from "../../lib/categories";
import type { Language } from "../../lib/i18n";
import { Dialog, Select } from "../../ui";
import { DEBT_CATEGORY } from "../../lib/categories";
import { DebtPicker } from "./DebtPicker";
import { TYPE_META, tint } from "./EntriesTable";
import { ENTRY_TYPES } from "./types";
import type { EntryType } from "./types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface AddEntryDialogProps {
  open: boolean;
  /** The debts a "debts" movement can be paid into. */
  debts: DebtDetail[];
  language: Language;
  onClose: () => void;
  /** The month file the movement goes into. */
  path: string;
  categoryOptions: CategoryOption[];
  t: Translate;
  onCreated: () => Promise<void> | void;
  onError: (message: string) => void;
}

/**
 * Create a movement, on the markup of #create-entry-dialog: the movement form
 * grid with its fields, the type pill shell, and the cancel/submit pair inside
 * movement-form__actions.
 */
export function AddEntryDialog({
  open,
  debts,
  language,
  onClose,
  path,
  categoryOptions,
  t,
  onCreated,
  onError,
}: AddEntryDialogProps) {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EntryType>("needs");
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  /** True while the abono is worth more than the debts it is aimed at. */
  const [overpaying, setOverpaying] = useState(false);
  const [paid, setPaid] = useState(true);
  const [linkedDebts, setLinkedDebts] = useState<string[]>([]);

  // Leaving the debts type drops the picks, the same way the original wipes the
  // section when the type changes.
  const chooseType = (next: EntryType) => {
    setType(next);
    if (next !== "debts") {
      setLinkedDebts([]);
      return;
    }
    // Un movimiento de deudas es de la categoría Debt salvo excepción, así que
    // se elige sola. Queda a un clic de cambiarla: esto es un punto de partida,
    // no una decisión tomada.
    setCategory(DEBT_CATEGORY);
  };

  const toggleDebt = (id: string, checked: boolean) => {
    setLinkedDebts((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  };

  const submit = async () => {
    try {
      await createEntry(path, {
        description: description.trim(),
        type,
        ...(type === "debts" && linkedDebts.length
          ? { linked_debts: linkedDebts, extra_payment: true }
          : {}),
        category: category ?? categoryOptions[0]?.value ?? "",
        amount_cop: Number(amount) || 0,
        paid,
      });
      setDescription("");
      setAmount("");
      setCategory(null);
      setLinkedDebts([]);
      onClose();
      await onCreated();
    } catch {
      onError(t("create_entry_error"));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="create-entry-dialog"
      panelClassName="movement-dialog__panel"
      eyebrow={t("create_entry_eyebrow")}
      title={t("create_entry_title")}
      actions={
        <>
          <button type="button" className="entry-history-button movement-form__cancel" onClick={onClose}>
            {t("create_entry_cancel")}
          </button>
          <button
            type="button"
            className="button button--compact button--entry-add"
            onClick={() => void submit()}
            disabled={overpaying}
          >
            {t("create_entry_submit")}
          </button>
        </>
      }
    >
      <div className="movement-form__grid">
        <label className="field">
          <span className="field__label">{t("monthly_entries_description")}</span>
          <input
            className="entry-input"
            type="text"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">{t("monthly_entries_category")}</span>
          <div className="entry-select-shell">
            <Select
              label={t("monthly_entries_category")}
              wrapperClassName={null}
              menuVariant="pretty-select-menu--category"
              searchable
              options={categoryOptions}
              value={category ?? categoryOptions[0]?.value ?? null}
              onChange={setCategory}
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">{t("monthly_entries_type")}</span>
          <div
            className="entry-type-shell"
            style={{
              ["--entry-type-color" as string]: TYPE_META[type].color,
              ["--entry-type-bg" as string]: tint(TYPE_META[type].color, 0.14),
              ["--entry-type-border" as string]: tint(TYPE_META[type].color, 0.22),
              ["--entry-type-bg-dark" as string]: tint(TYPE_META[type].color, 0.24),
              ["--entry-type-border-dark" as string]: tint(TYPE_META[type].color, 0.44),
            }}
          >
            <Select
              label={t("monthly_entries_type")}
              wrapperClassName={null}
              menuVariant="pretty-select-menu--type"
              options={ENTRY_TYPES.map((option) => ({
                value: option,
                label: t(TYPE_META[option].labelKey),
                swatch: TYPE_META[option].color,
              }))}
              value={type}
              onChange={chooseType}
            />
          </div>
        </div>

        <label className="field">
          <span className="field__label">{t("monthly_entries_cop")}</span>
          <input
            className="entry-input entry-input--amount"
            type="number"
            step="0.01"
            inputMode="decimal"
            min="0"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label className="field movement-form__active">
          <span className="field__label">{t("monthly_entries_paid")}</span>
          <span className="movement-form__active-control">
            <span className="movement-form__active-text">{t("create_entry_paid_hint")}</span>
            <span className="entry-active-toggle">
              <input
                className="entry-active-toggle__input"
                type="checkbox"
                checked={paid}
                onChange={(event) => setPaid(event.target.checked)}
              />
              <span className="entry-active-toggle__ui" aria-hidden="true" />
            </span>
          </span>
        </label>

        {type === "debts" ? (
          <DebtPicker
            debts={debts}
            selected={linkedDebts}
            onToggle={toggleDebt}
            legend={t("create_entry_debt_target")}
            hint={t("create_entry_debt_hint")}
            emptyMessage={t("create_entry_debt_empty")}
            language={language}
            amount={Number(amount) || 0}
            onOverpay={setOverpaying}
            onUseRemaining={(value) => setAmount(String(Math.round(value)))}
          />
        ) : null}
      </div>
    </Dialog>
  );
}

export interface AddIncomeDialogProps {
  open: boolean;
  onClose: () => void;
  path: string;
  monthIndex: number;
  /** La tasa del mes, de arranque si la del día no llega. */
  monthUsdCop: number;
  t: Translate;
  onCreated: () => Promise<void> | void;
  onError: (message: string) => void;
}

/** Create an income; the server recomputes the month totals from the entries. */
export function AddIncomeDialog({
  open,
  onClose,
  path,
  monthIndex,
  monthUsdCop,
  t,
  onCreated,
  onError,
}: AddIncomeDialogProps) {
  const [description, setDescription] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [usdCop, setUsdCop] = useState("");
  const [amountCop, setAmountCop] = useState("");
  const [received, setReceived] = useState(true);

  /**
   * La tasa se ofrece hecha: la del día si el servidor la tiene, si no la del
   * mes. Dejarla vacía hacía que el formulario mandara `usd_cop: 0`, y con eso
   * el servidor calculaba el otro monto contra cero — escribías 500 dólares y
   * te quedaba un ingreso de $0.
   */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setUsdCop(monthUsdCop > 0 ? String(monthUsdCop) : "");
    void getUsdCopRate()
      .then((live) => {
        // Solo si sigue sin tocar: quien ya escribió una tasa manda.
        if (alive && live.rate > 0) setUsdCop((current) => (current === String(monthUsdCop) || !current ? String(live.rate) : current));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, monthUsdCop]);

  /**
   * Los dos montos son el mismo dinero en dos monedas: al escribir uno, el
   * otro se rellena con la tasa que haya. Sigue siendo editable — si lo
   * cambias a mano, manda lo que quede escrito, no lo calculado.
   *
   * Redondeo como roundIncomeDisplayValue del original: dos decimales, y por
   * debajo de medio centavo es cero.
   */
  const round2 = (value: number) => (Math.abs(value) < 0.005 ? 0 : Math.round(value * 100) / 100);
  const show = (value: number) => (Number.isFinite(value) ? String(round2(value)) : "");

  const typeUsd = (raw: string) => {
    setAmountUsd(raw);
    const rate = Number(usdCop);
    if (!raw.trim()) return setAmountCop("");
    if (rate > 0 && Number.isFinite(Number(raw))) setAmountCop(show(Number(raw) * rate));
  };

  const typeCop = (raw: string) => {
    setAmountCop(raw);
    const rate = Number(usdCop);
    if (!raw.trim()) return setAmountUsd("");
    if (rate > 0 && Number.isFinite(Number(raw))) setAmountUsd(show(Number(raw) / rate));
  };

  /** Cambiar la tasa rehace los pesos, que es el lado que depende de ella. */
  const typeRate = (raw: string) => {
    setUsdCop(raw);
    const rate = Number(raw);
    if (rate > 0 && amountUsd.trim() && Number.isFinite(Number(amountUsd))) {
      setAmountCop(show(Number(amountUsd) * rate));
    }
  };

  /** Como validateCreateIncomeForm del original: un monto y una tasa usable. */
  const problem = (): string | null => {
    if (!amountUsd.trim() && !amountCop.trim()) return t("create_income_amount_error");
    if (!(Number(usdCop) > 0)) return t("create_income_fx_error");
    return null;
  };

  const submit = async () => {
    const wrong = problem();
    if (wrong) {
      onError(wrong);
      return;
    }
    try {
      // Ambos montos viajan cuando ambos están escritos: con el cálculo a la
      // vista, lo que se guarda es lo que se leyó — incluido un ajuste a mano
      // del lado calculado, que derivarlo de nuevo habría descartado.
      await createIncome(path, monthIndex, {
        description: description.trim(),
        usd_cop: Number(usdCop) || 0,
        ...(amountUsd.trim() ? { amount_usd: Number(amountUsd) || 0 } : {}),
        ...(amountCop.trim() ? { amount_cop: Number(amountCop) || 0 } : {}),
        received,
      });
      setDescription("");
      setAmountUsd("");
      setUsdCop("");
      setAmountCop("");
      onClose();
      await onCreated();
    } catch {
      onError(t("create_income_error"));
    }
  };

  const numberField = (label: string, value: string, set: (value: string) => void) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="entry-input entry-input--amount"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </label>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="create-entry-dialog"
      panelClassName="movement-dialog__panel"
      eyebrow={t("create_income_eyebrow")}
      title={t("create_income_title")}
      actions={
        <>
          <button type="button" className="entry-history-button movement-form__cancel" onClick={onClose}>
            {t("create_entry_cancel")}
          </button>
          <button
            type="button"
            className="button button--compact button--entry-add"
            onClick={() => void submit()}
          >
            {t("create_income_submit")}
          </button>
        </>
      }
    >
      <div className="movement-form__grid">
        <label className="field movement-form__full">
          <span className="field__label">{t("monthly_entries_description")}</span>
          <input
            className="entry-input"
            type="text"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {/* Pesos primero: es la moneda en la que se lleva la cuenta. */}
        <div className="movement-form__amounts">
          {numberField(t("monthly_entries_cop"), amountCop, typeCop)}
          {numberField(t("monthly_entries_usd"), amountUsd, typeUsd)}
          {numberField(t("monthly_income_fx"), usdCop, typeRate)}
        </div>
        <p className="field__hint movement-form__full">{t("income_fx_hint")}</p>

        <label className="field movement-form__active">
          <span className="field__label">{t("monthly_income_received")}</span>
          <span className="movement-form__active-control">
            <span className="entry-active-toggle">
              <input
                className="entry-active-toggle__input"
                type="checkbox"
                checked={received}
                onChange={(event) => setReceived(event.target.checked)}
              />
              <span className="entry-active-toggle__ui" aria-hidden="true" />
            </span>
          </span>
        </label>
      </div>
    </Dialog>
  );
}
