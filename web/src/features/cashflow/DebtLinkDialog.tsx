import { useEffect, useState } from "react";
import { updateEntry } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import type { Language } from "../../lib/i18n";
import { Dialog } from "../../ui";
import { DebtPicker } from "./DebtPicker";
import type { PlacedEntry } from "./types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface DebtLinkDialogProps {
  /** The movement being linked, or null when the dialog is closed. */
  entry: PlacedEntry | null;
  debts: DebtDetail[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onError: (message: string) => void;
  t: Translate;
  language: Language;
}

/**
 * #entry-debt-link-dialog: pick which debts a movement pays into. Opened from
 * the movement's actions menu, it starts with the ones already linked checked.
 */
export function DebtLinkDialog({
  entry,
  debts,
  onClose,
  onSaved,
  onError,
  t,
  language,
}: DebtLinkDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected((entry?.linked_debts ?? []).map(String));
  }, [entry]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  };

  const submit = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await updateEntry(entry.sourcePath, entry.sourceIndex, { linked_debts: selected });
      onClose();
      await onSaved();
    } catch {
      onError(t("entry_debt_link_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={Boolean(entry)}
      onClose={onClose}
      variant="create-entry-dialog"
      panelClassName="movement-dialog__panel"
      eyebrow={t("entry_debt_link_eyebrow")}
      title={t("entry_debt_link_title")}
      actions={
        <>
          <button
            type="button"
            className="entry-history-button movement-form__cancel"
            onClick={onClose}
          >
            {t("entry_debt_link_cancel")}
          </button>
          <button
            type="button"
            className="button button--compact button--entry-add"
            disabled={saving}
            onClick={() => void submit()}
          >
            {t("entry_debt_link_submit")}
          </button>
        </>
      }
    >
      <div className="movement-form__grid">
        <DebtPicker
          debts={debts}
          selected={selected}
          onToggle={toggle}
          legend={t("entry_debt_link_target")}
          hint={t("entry_debt_link_hint")}
          emptyMessage={t("entry_debt_link_empty")}
          language={language}
        />
      </div>
    </Dialog>
  );
}
