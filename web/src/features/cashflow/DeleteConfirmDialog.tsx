import { Dialog } from "../../ui";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** What is about to be deleted, and how to delete it once confirmed. */
export interface DeleteRequest {
  title: string;
  summary: string;
  confirm: () => Promise<void> | void;
}

export interface DeleteConfirmDialogProps {
  request: DeleteRequest | null;
  onClose: () => void;
  t: Translate;
}

/**
 * #delete-confirm-dialog: the title says what kind of record it is, the record
 * block spells out which one. window.confirm cannot say either, which is why
 * the original never used it here.
 */
export function DeleteConfirmDialog({ request, onClose, t }: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={Boolean(request)}
      onClose={onClose}
      variant="delete-confirm-dialog"
      panelClassName="delete-confirm-dialog__panel"
      eyebrow={t("delete_confirm_eyebrow")}
      title={request?.title ?? ""}
      actionsClassName="delete-confirm-dialog__actions"
      actions={
        <button
          type="button"
          className="button button--compact delete-confirm-dialog__submit"
          onClick={() => {
            const run = request?.confirm;
            onClose();
            void run?.();
          }}
        >
          {t("delete_confirm_submit")}
        </button>
      }
    >
      <div className="delete-confirm-dialog__content">
        <p className="delete-confirm-dialog__message">{t("delete_confirm_message")}</p>

        <div className="delete-confirm-dialog__record">
          <span className="delete-confirm-dialog__icon" aria-hidden="true">
            !
          </span>
          <p className="delete-confirm-dialog__summary">{request?.summary || "—"}</p>
        </div>
      </div>
    </Dialog>
  );
}
