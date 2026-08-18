import { useEffect, useState } from "react";
import { createEntry, deleteEntry, reorderEntry, updateEntry } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import { DEBT_CATEGORY, getCategoryLabel } from "../../lib/categories";
import type { CategoryOption } from "../../lib/categories";
import { formatCop, formatUsd } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { Select } from "../../ui";
import { DebtLinkDialog } from "./DebtLinkDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { DeleteRequest } from "./DeleteConfirmDialog";
import { EntryActionsMenu } from "./EntryActionsMenu";
import { HistoryDialog } from "./HistoryDialog";
import { ENTRY_TYPES } from "./types";
import type { EntryType, PlacedEntry } from "./types";

/** Colors and labels of TYPE_META in app.js. */
export const TYPE_META: Record<EntryType, { color: string; labelKey: string }> = {
  needs: { color: "#dc244b", labelKey: "needs_label" },
  wants: { color: "#4091c9", labelKey: "wants_label" },
  savings: { color: "#fec34b", labelKey: "savings_label" },
  debts: { color: "#adb5bd", labelKey: "debts_label" },
};

/** hexToRgba in app.js, for the type pill tint. */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const ActionsIcon = () => (
  <svg
    className="entry-actions-button__icon"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.67 4.14a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.91 2.34 2.34 0 0 1 2.33 4.03 2.34 2.34 0 0 0 0 3.84 2.34 2.34 0 0 1-2.33 4.03 2.34 2.34 0 0 0-3.32 1.91 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.91 2.34 2.34 0 0 1-2.33-4.03 2.34 2.34 0 0 0 0-3.84 2.34 2.34 0 0 1 2.33-4.03 2.34 2.34 0 0 0 3.32-1.91Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** The padlock on a movement a debt writes: it says "locked", not "automatic",
 *  which is what the reader actually needs to know before trying to type. */
const LockIcon = () => (
  <svg
    className="entry-auto-badge__icon"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export interface EntriesTableProps {
  entries: PlacedEntry[];
  categoryOptions: CategoryOption[];
  debts: DebtDetail[];
  usdCop: number;
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
}

interface DragState {
  path: string;
  index: number;
  type: EntryType;
}

/**
 * The month's movements, with the same row as renderMonthlyEntriesTable: gear,
 * number, drag handle, paid switch, description input, type pill, category
 * select, editable amount and the USD equivalent.
 *
 * Auto-generated entries (the ones a debt writes) stay read-only, like there.
 */
export function EntriesTable({
  entries,
  categoryOptions,
  debts,
  usdCop,
  language,
  t,
  onChanged,
  onError,
}: EntriesTableProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; entry: PlacedEntry } | null>(null);
  const [linkEntry, setLinkEntry] = useState<PlacedEntry | null>(null);
  const [historyEntry, setHistoryEntry] = useState<PlacedEntry | null>(null);
  const [confirm, setConfirm] = useState<DeleteRequest | null>(null);

  useEffect(() => {
    setDrafts({});
  }, [entries]);

  const keyOf = (entry: PlacedEntry, field: string) => `${entry.sourcePath}:${entry.sourceIndex}:${field}`;

  const save = async (entry: PlacedEntry, updates: Parameters<typeof updateEntry>[2]) => {
    try {
      await updateEntry(entry.sourcePath, entry.sourceIndex, updates);
      await onChanged();
    } catch {
      onError(t("save_entry_error"));
    }
  };

  /** buildDuplicateEntryPayload: same fields, inserted right after the original. */
  const duplicate = async (entry: PlacedEntry) => {
    try {
      await createEntry(
        entry.sourcePath,
        {
          paid: entry.paid ?? entry.active ?? false,
          type: entry.type ?? "needs",
          description: entry.description,
          category: entry.category ?? "",
          amount_cop: Number(entry.amount_cop) || 0,
        },
        entry.sourceIndex,
      );
      await onChanged();
    } catch {
      onError(t("duplicate_entry_error"));
    }
  };

  /** deleteMonthlyEntry: the dialog names the movement before it goes. */
  const remove = (entry: PlacedEntry) => {
    setConfirm({
      title: t("delete_entry_confirm_title"),
      summary: t("delete_confirm_entry_summary", {
        description: entry.description || t("no_description"),
        detail: `${t(TYPE_META[entry.type ?? "needs"].labelKey)} · ${getCategoryLabel(entry.category ?? "", language)}`,
        amount: formatCop(Number(entry.amount_cop) || 0, language),
      }),
      confirm: async () => {
        try {
          await deleteEntry(entry.sourcePath, entry.sourceIndex);
          await onChanged();
        } catch {
          onError(t("delete_entry_error"));
        }
      },
    });
  };

  const drop = async (target: PlacedEntry) => {
    const source = drag;
    setDrag(null);
    setDropIndex(null);
    if (!source || source.path !== target.sourcePath) return;
    if (source.index === target.sourceIndex) return;

    try {
      await reorderEntry(source.path, source.index, target.sourceIndex);
      await onChanged();
    } catch {
      onError(t("reorder_entry_error"));
    }
  };

  return (
    <div className="table-scroll">
      <table className="data-table data-table--entries">
        <thead>
          <tr>
            <th aria-label={t("monthly_entries_options")} />
            <th>{t("monthly_entries_number")}</th>
            <th>{t("monthly_entries_move")}</th>
            <th>{t("monthly_entries_paid")}</th>
            <th>{t("monthly_entries_description")}</th>
            <th>{t("monthly_entries_type")}</th>
            <th>{t("monthly_entries_category")}</th>
            <th>{t("monthly_entries_cop")}</th>
            <th>{t("monthly_entries_usd")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isAuto = entry.auto_generated === true;
            const type = entry.type ?? "needs";
            const paid = entry.paid ?? entry.active ?? false;
            const lockedTitle = isAuto ? t("entry_auto_locked_hint") : undefined;
            const amountKey = keyOf(entry, "amount_cop");
            const descriptionKey = keyOf(entry, "description");
            const amountCop = Number(entry.amount_cop) || 0;

            return (
              <tr
                key={`${entry.sourcePath}-${entry.sourceIndex}`}
                className={[
                  paid ? "" : "is-inactive",
                  isAuto ? "entry-row--auto" : "",
                  drag?.index === entry.sourceIndex && drag.path === entry.sourcePath ? "is-dragging" : "",
                  dropIndex === entry.sourceIndex ? "is-drop-before" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-entry-row="true"
                data-entry-type={type}
                onDragOver={(event) => {
                  if (!drag || drag.path !== entry.sourcePath) return;
                  event.preventDefault();
                  setDropIndex(entry.sourceIndex);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void drop(entry);
                }}
              >
                <td className="entry-cell entry-cell--actions">
                  <div className="entry-actions">
                    <button
                      type="button"
                      className="entry-actions-button"
                      title={t("entry_actions_button_label")}
                      aria-label={t("entry_actions_button_label")}
                      aria-haspopup="menu"
                      aria-expanded={menu?.entry.sourceIndex === entry.sourceIndex}
                      onClick={(event) => {
                        // React clears currentTarget once the event finishes
                        // propagating, and the updater below may run after that.
                        // Read the button now or the menu opens without anchor.
                        const anchor = event.currentTarget;
                        setMenu((current) =>
                          current?.entry.sourceIndex === entry.sourceIndex ? null : { anchor, entry },
                        );
                      }}
                    >
                      <ActionsIcon />
                    </button>
                  </div>
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
                    onDragStart={() =>
                      setDrag({ path: entry.sourcePath, index: entry.sourceIndex, type })
                    }
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
                      checked={paid}
                      onChange={(event) => void save(entry, { paid: event.target.checked })}
                    />
                    <span className="entry-active-toggle__ui" aria-hidden="true" />
                  </label>
                </td>

                <td className="entry-cell entry-cell--description">
                  <div className="entry-description-shell">
                    {isAuto ? (
                      <span
                        className="entry-auto-badge"
                        role="img"
                        aria-label={lockedTitle}
                        title={lockedTitle}
                      >
                        <LockIcon />
                      </span>
                    ) : null}
                    <input
                      className="entry-input"
                      type="text"
                      value={drafts[descriptionKey] ?? entry.description}
                      placeholder={t("no_description")}
                      readOnly={isAuto}
                      aria-readonly={isAuto}
                      title={lockedTitle}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [descriptionKey]: event.target.value }))
                      }
                      onBlur={(event) => {
                        const next = event.target.value;
                        if (isAuto || next === entry.description) return;
                        void save(entry, { description: next });
                      }}
                    />
                  </div>
                </td>

                <td className="entry-cell entry-cell--type">
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
                      disabled={isAuto}
                      options={ENTRY_TYPES.map((option) => ({
                        value: option,
                        label: t(TYPE_META[option].labelKey),
                        swatch: TYPE_META[option].color,
                      }))}
                      value={type}
                      onChange={(next) =>
                        void save(
                          entry,
                          // Pasar a deudas arrastra la categoría, igual que en
                          // el diálogo de crear.
                          next === "debts"
                            ? { target_type: next, category: DEBT_CATEGORY }
                            : { target_type: next },
                        )
                      }
                    />
                  </div>
                </td>

                <td className="entry-cell entry-cell--category">
                  <div className="entry-select-shell">
                    <Select
                      label={t("monthly_entries_category")}
                      wrapperClassName={null}
                      menuVariant="pretty-select-menu--category"
                      searchable
                      disabled={isAuto}
                      options={categoryOptions}
                      value={entry.category ?? null}
                      onChange={(next) => void save(entry, { category: next })}
                    />
                  </div>
                </td>

                <td className="entry-cell entry-cell--amount">
                  <input
                    className="entry-input entry-input--amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={drafts[amountKey] ?? String(amountCop)}
                    readOnly={isAuto}
                    aria-readonly={isAuto}
                    title={lockedTitle}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [amountKey]: event.target.value }))
                    }
                    onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (isAuto || !Number.isFinite(next) || next === amountCop) return;
                      void save(entry, { amount_cop: next });
                    }}
                  />
                </td>

                <td className="entry-cell entry-cell--usd">
                  <span className="entry-usd-value">
                    {formatUsd(usdCop > 0 ? amountCop / usdCop : 0, language)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {menu ? (
        <EntryActionsMenu
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          isAuto={menu.entry.auto_generated === true}
          isDebtEntry={menu.entry.type === "debts"}
          t={t}
          onDuplicate={() => {
            const entry = menu.entry;
            setMenu(null);
            void duplicate(entry);
          }}
          onDelete={() => {
            const entry = menu.entry;
            setMenu(null);
            remove(entry);
          }}
          onHistory={() => {
            setHistoryEntry(menu.entry);
            setMenu(null);
          }}
          onLinkDebt={() => {
            setLinkEntry(menu.entry);
            setMenu(null);
          }}
        />
      ) : null}

      <HistoryDialog
        entry={historyEntry}
        onClose={() => setHistoryEntry(null)}
        t={t}
        language={language}
      />

      <DebtLinkDialog
        entry={linkEntry}
        debts={debts}
        onClose={() => setLinkEntry(null)}
        onSaved={onChanged}
        onError={onError}
        t={t}
        language={language}
      />

      <DeleteConfirmDialog request={confirm} onClose={() => setConfirm(null)} t={t} />
    </div>
  );
}
