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
}: DebtPickerProps) {
  const open = debts.filter((debt) => debt.remaining_installments > 0);

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
    </fieldset>
  );
}
