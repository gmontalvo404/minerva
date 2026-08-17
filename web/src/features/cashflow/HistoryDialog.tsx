import { formatCop, formatRate, formatUsd } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { Dialog } from "../../ui";
import { ENTRY_TYPES } from "./types";
import type { PlacedEntry } from "./types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface HistoryRecord {
  changed_at?: string;
  /** Which device made the change: the phone's chosen name, or "Mac". */
  changed_by?: string;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
}

export interface HistoryDialogProps {
  /** Incomes label the paid flag differently, like the original. */
  kind?: "outcome" | "income";
  entry: (PlacedEntry & { created_at?: string; updated_at?: string; history?: HistoryRecord[] }) | null;
  onClose: () => void;
  t: Translate;
  language: Language;
}

/** formatLocalTimestamp in app.js: a local date and time, or an em dash. */
function formatTimestamp(value: string | undefined, language: Language): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(language === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** getHistoryFieldLabel: each field has its own label, not a made-up key. */
function fieldLabel(field: string, kind: "outcome" | "income", t: Translate): string {
  if (field === "type") return t("history_type");

  const labels: Record<string, string> = {
    active: t(kind === "income" ? "monthly_income_received" : "monthly_entries_paid"),
    paid: t("monthly_entries_paid"),
    received: t("monthly_income_received"),
    description: t("monthly_entries_description"),
    category: t("monthly_entries_category"),
    amount_cop: t("monthly_entries_cop"),
    amount_usd: t("monthly_entries_usd"),
    usd_cop: t("monthly_income_fx"),
  };
  return labels[field] ?? field;
}

/** formatHistoryValue: money as money, flags as Sí/No, types by their label. */
function formatValue(
  field: string,
  value: unknown,
  t: Translate,
  language: Language,
): string {
  if (value === null || value === undefined || value === "") return "—";

  if (field === "type") {
    // getTypeLabel falls back to the raw key when the type is not one of ours.
    const key = String(value);
    return (ENTRY_TYPES as readonly string[]).includes(key) ? t(`${key}_label`) : key;
  }
  if (field === "active" || field === "paid" || field === "received") {
    return value ? t("history_true") : t("history_false");
  }
  if (field === "amount_cop") return formatCop(Number(value), language);
  if (field === "amount_usd") return formatUsd(Number(value), language);
  if (field === "usd_cop") return formatRate(Number(value), language);
  return String(value);
}

/**
 * The change log of a movement, same body renderEntryHistory builds: the
 * created/updated summary and one card per change with its from/to rows.
 */
export function HistoryDialog({ entry, onClose, t, language, kind = "outcome" }: HistoryDialogProps) {
  const history = entry?.history ?? [];

  return (
    <Dialog
      open={Boolean(entry)}
      onClose={onClose}
      eyebrow={t("history_dialog_eyebrow")}
      title={entry?.description || t("history_dialog_title")}
    >
      <div className="history-dialog__body">
        <div className="history-summary">
          <div className="history-summary__item">
            <span>{t("history_created_at")}</span>
            <strong>{formatTimestamp(entry?.created_at, language)}</strong>
          </div>
          <div className="history-summary__item">
            <span>{t("history_updated_at")}</span>
            <strong>{formatTimestamp(entry?.updated_at, language)}</strong>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <h3>{t("history_changes_title")}</h3>
            <p>{t("history_no_changes")}</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((record, index) => (
              <article className="history-item" key={`${record.changed_at ?? index}`}>
                <div className="history-item__head">
                  <strong>{formatTimestamp(record.changed_at, language)}</strong>
                </div>
                <div className="history-item__table">
                  <div className="history-item__row history-item__row--head">
                    <span>{t("history_change_field")}</span>
                    <span>{t("history_change_from")}</span>
                    <span>{t("history_change_to")}</span>
                    <span>{t("history_change_device")}</span>
                  </div>
                  {Object.entries(record.changes ?? {}).map(([field, values]) => (
                    <div className="history-item__row" key={field}>
                      <span>{fieldLabel(field, kind, t)}</span>
                      <span>{formatValue(field, values?.from, t, language)}</span>
                      <span>{formatValue(field, values?.to, t, language)}</span>
                      <span>{record.changed_by ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
