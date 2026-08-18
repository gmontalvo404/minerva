import { useEffect } from "react";
import type { DebtDetail } from "../../lib/api";
import { formatCopNoCode } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { debtName } from "../debts/calc";

export interface DebtPickerProps {
  debts: DebtDetail[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  legend: string;
  hint: string;
  emptyMessage: string;
  language: Language;
  /** What the movement is worth, to warn when it exceeds what is still owed. */
  amount?: number;
  /** Told to the parent so it can hold the submit back. */
  onOverpay?: (overpaying: boolean) => void;
  /** Fills the amount with what the picked debts still owe, so this movement
   *  is the one that finishes them. */
  onUseRemaining?: (amount: number) => void;
}

/**
 * The checkbox list of debts a movement can pay into, the same one
 * renderCreateEntryDebtSection and renderEntryDebtLinkList build: only debts
 * with installments left, each with its name and what it still owes.
 */
export function DebtPicker({
  debts,
  selected,
  onToggle,
  legend,
  hint,
  emptyMessage,
  language,
  amount,
  onOverpay,
  onUseRemaining,
}: DebtPickerProps) {
  const open = debts.filter((debt) => debt.remaining_installments > 0);

  // A settled debt is already out of the list above; this catches the other
  // half of the rule, putting in more than what is left to pay. The server
  // checks it again — a form is not a guarantee.
  const headroom = open
    .filter((debt) => selected.includes(debt.id))
    .reduce((total, debt) => total + debt.remaining_balance, 0);
  const overpaying = selected.length > 0 && (amount ?? 0) - headroom > 0.5;

  useEffect(() => {
    onOverpay?.(overpaying);
  }, [overpaying, onOverpay]);

  return (
    <fieldset className="field movement-form__full create-entry-debt-section">
      <legend className="field__label">{legend}</legend>
      <p className="field__hint">{hint}</p>

      <div className="create-entry-debt-list">
        {open.length === 0 ? (
          <p className="create-entry-debt-list__empty">{emptyMessage}</p>
        ) : (
          open.map((debt) => (
            <label className="create-entry-debt-option" key={debt.id}>
              <input
                type="checkbox"
                name="linked_debt"
                value={debt.id}
                checked={selected.includes(debt.id)}
                onChange={(event) => onToggle(debt.id, event.target.checked)}
              />
              <span className="create-entry-debt-option__name">{debtName(debt, language)}</span>
              <span className="create-entry-debt-option__meta">
                {formatCopNoCode(debt.remaining_balance, language)}
              </span>
            </label>
          ))
        )}
      </div>

      {onUseRemaining && selected.length > 0 && headroom > 0 ? (
        <button
          type="button"
          className="entry-history-button create-entry-debt-settle"
          onClick={() => onUseRemaining(headroom)}
        >
          {`Finalizar deuda — ${formatCopNoCode(headroom, language)}`}
        </button>
      ) : null}

      {overpaying ? (
        <p className="field__hint create-entry-debt-list__empty">
          {`El abono supera lo que queda por pagar: ${formatCopNoCode(headroom, language)}.`}
        </p>
      ) : null}
    </fieldset>
  );
}
