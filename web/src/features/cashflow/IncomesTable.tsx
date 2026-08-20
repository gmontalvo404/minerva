import { useEffect, useState } from "react";
import { deleteIncome, reorderIncome, updateIncome } from "../../lib/api";
import type { IncomeSyncField, IncomeUpdates } from "../../lib/api";
import { formatCop, formatUsd } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { DeleteRequest } from "./DeleteConfirmDialog";
import type { IncomeEntry } from "./types";

export interface IncomesTableProps {
  incomes: IncomeEntry[];
  /** finance/<dataset>/cash_flow/<year>/incomes/incomes.json */
  path: string;
  monthIndex: number;
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onHistory: (income: IncomeEntry) => void;
}

/**
 * The month's incomes, same row as renderMonthlyIncomesTable: delete, number,
 * drag handle, received switch, description, USD, FX and COP — all editable,
 * with the server recomputing the month totals on save.
 */
export function IncomesTable({
  incomes,
  path,
  monthIndex,
  language,
  t,
  onChanged,
  onError,
  onHistory,
}: IncomesTableProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<DeleteRequest | null>(null);

  useEffect(() => {
    setDrafts({});
  }, [incomes]);

  const save = async (index: number, updates: IncomeUpdates, syncFrom?: IncomeSyncField) => {
    try {
      await updateIncome(path, monthIndex, index, updates, syncFrom);
      await onChanged();
    } catch {
      onError(t("save_income_error"));
    }
  };

  /** deleteMonthlyIncome: the dialog names the income before it goes. */
  const remove = (index: number) => {
    const income = incomes[index];
    if (!income) return;
    setConfirm({
      title: t("delete_income_confirm_title"),
      summary: t("delete_confirm_income_summary", {
        description: income.description || t("default_income_description"),
        amount: formatCop(Number(income.amount_cop) || 0, language),
        usd: formatUsd(Number(income.amount_usd) || 0, language),
      }),
      confirm: async () => {
        try {
          await deleteIncome(path, monthIndex, index);
          await onChanged();
        } catch {
          onError(t("delete_income_error"));
        }
      },
    });
  };

  const drop = async (targetIndex: number) => {
    const source = drag;
    setDrag(null);
    setDropIndex(null);
    if (source === null || source === targetIndex) return;

    try {
      await reorderIncome(path, monthIndex, source, targetIndex);
      await onChanged();
    } catch {
      onError(t("reorder_income_error"));
    }
  };

  /**
   * The three amounts are one number in three shapes. Only the one that was
   * typed travels: the server recomputes the other two from the rate, so both
   * apps land on the same cents.
   */
  const commit = (income: IncomeEntry, index: number, field: IncomeSyncField, raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;

    const current = {
      amount_usd: Number(income.amount_usd) || 0,
      usd_cop: Number(income.usd_cop) || 0,
      amount_cop: Number(income.amount_cop) || 0,
    };
    if (next === current[field]) return;

    void save(index, { [field]: next }, field);
  };

  const numberField = (
    income: IncomeEntry,
    index: number,
    field: "amount_usd" | "usd_cop" | "amount_cop",
    value: number,
  ) => {
    const key = `${index}:${field}`;
    return (
      <input
        className="entry-input entry-input--amount"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={drafts[key] ?? String(value)}
        onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
        onBlur={(event) => commit(income, index, field, event.target.value)}
      />
    );
  };

  return (
    <div className="table-scroll">
      <table className="data-table data-table--entries data-table--income-entries">
        <thead>
          <tr>
            <th aria-label={t("delete_button_label")} />
            <th>{t("monthly_entries_number")}</th>
            <th>{t("monthly_entries_move")}</th>
            <th>{t("monthly_income_received")}</th>
            <th>{t("monthly_entries_description")}</th>
            <th>{t("monthly_entries_cop")}</th>
            <th>{t("monthly_entries_usd")}</th>
            <th>{t("monthly_income_fx")}</th>
            <th>{t("monthly_entries_history")}</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map((income, index) => {
            const descriptionKey = `${index}:description`;
            return (
              <tr
                key={`${income.description}-${index}`}
                className={[
                  income.received ? "" : "is-inactive",
                  drag === index ? "is-dragging" : "",
                  dropIndex === index ? "is-drop-before" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => {
                  if (drag === null) return;
                  event.preventDefault();
                  setDropIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void drop(index);
                }}
              >
                <td className="entry-cell entry-cell--delete">
                  <button
                    type="button"
                    className="entry-delete-button"
                    title={t("delete_button_label")}
                    aria-label={t("delete_button_label")}
                    onClick={() => remove(index)}
                  >
                    {t("delete_button")}
                  </button>
                </td>

                <td className="entry-cell entry-cell--number">
                  <span className="entry-row-number">{index + 1}</span>
                </td>

                <td className="entry-cell entry-cell--move">
                  <button
                    type="button"
                    className="entry-drag-handle"
                    draggable
                    title={t("move_drag_handle")}
                    aria-label={t("move_drag_handle")}
                    onDragStart={() => setDrag(index)}
                    onDragEnd={() => {
                      setDrag(null);
                      setDropIndex(null);
                    }}
                  >
                    <span className="entry-drag-handle__grip" aria-hidden="true" />
                  </button>
                </td>

                <td className="entry-cell entry-cell--active entry-active-cell">
                  <label className="entry-active-toggle">
                    <input
                      className="entry-active-toggle__input"
                      type="checkbox"
                      checked={income.received ?? false}
                      onChange={(event) => void save(index, { received: event.target.checked })}
                    />
                    <span className="entry-active-toggle__ui" aria-hidden="true" />
                  </label>
                </td>

                <td className="entry-cell entry-cell--description">
                  <div className="entry-description-shell">
                    <input
                      className="entry-input"
                      type="text"
                      value={drafts[descriptionKey] ?? income.description}
                      placeholder={t("no_description")}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [descriptionKey]: event.target.value }))
                      }
                      onBlur={(event) => {
                        if (event.target.value === income.description) return;
                        void save(index, { description: event.target.value });
                      }}
                    />
                  </div>
                </td>

                {/* Pesos primero, igual que en el formulario. */}
                <td className="entry-cell entry-cell--amount">
                  {numberField(income, index, "amount_cop", Number(income.amount_cop) || 0)}
                </td>

                <td className="entry-cell entry-cell--usd">
                  {numberField(income, index, "amount_usd", Number(income.amount_usd) || 0)}
                </td>

                <td className="entry-cell entry-cell--fx">
                  {numberField(income, index, "usd_cop", Number(income.usd_cop) || 0)}
                </td>

                <td className="entry-cell entry-cell--history">
                  <button
                    type="button"
                    className="entry-history-button"
                    onClick={() => onHistory(income)}
                  >
                    {t("history_button")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DeleteConfirmDialog request={confirm} onClose={() => setConfirm(null)} t={t} />
    </div>
  );
}
