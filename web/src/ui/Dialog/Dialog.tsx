import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  /** Extra classes on the <dialog>, e.g. "create-entry-dialog". */
  variant?: string;
  /** Extra classes on the panel, e.g. "movement-dialog__panel". */
  panelClassName?: string;
  /** Buttons rendered inside movement-form__actions. */
  actions?: ReactNode;
  /** Wrapper for those buttons, when it is not movement-form__actions. */
  actionsClassName?: string;
  /** Controls that sit in the head, beside the close button. */
  headActions?: ReactNode;
  /** Wrapper for those controls, e.g. "debt-detail-dialog__actions". */
  headActionsClassName?: string;
  children?: ReactNode;
}

/**
 * A real <dialog> opened with showModal(), like the original: styles.css styles
 * `.history-dialog`, its `::backdrop` and `.history-dialog__panel`, so a modal
 * built by hand out of divs could never look the same.
 */
export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  variant,
  panelClassName,
  actions,
  actionsClassName,
  headActions,
  headActionsClassName,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={["history-dialog", variant].filter(Boolean).join(" ")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form
        method="dialog"
        className={["history-dialog__panel", panelClassName].filter(Boolean).join(" ")}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="history-dialog__head">
          <div>
            {eyebrow ? <p className="card__eyebrow">{eyebrow}</p> : null}
            <h3>{title}</h3>
          </div>
          {headActions ? (
            <div className={headActionsClassName}>
              {headActions}
              <button type="button" className="history-dialog__close" onClick={onClose}>
                ×
              </button>
            </div>
          ) : (
            <button type="button" className="history-dialog__close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {children}

        {actions ? <div className={actionsClassName ?? "movement-form__actions"}>{actions}</div> : null}
      </form>
    </dialog>
  );
}
